import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class BookingTokenService {
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret =
      this.config.get<string>("BOOKING_TOKEN_SECRET") ||
      this.config.get<string>("SESSION_SECRET") ||
      "dev_booking_capability_token_secret_32bytes_long";
  }

  /**
   * Generates a domain-separated, cryptographically signed capability token.
   * Format: v1.<bookingId>.<tokenVersion>.<signatureHex>
   */
  generateToken(bookingId: string, tokenVersion = 1): string {
    const payload = `sched:booking-manage:v1:${bookingId}:${tokenVersion}`;
    const signature = crypto.createHmac("sha256", this.secret).update(payload).digest("hex");
    return `v1.${bookingId}.${tokenVersion}.${signature}`;
  }

  /**
   * Verifies the capability token in constant time and checks version matching.
   */
  verifyToken(bookingId: string, token: string | undefined | null, expectedTokenVersion: number): boolean {
    if (!token || typeof token !== "string") {
      return false;
    }

    const parts = token.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") {
      return false;
    }

    const [, tokenBookingId, tokenVersionStr, providedSignature] = parts;
    if (!tokenBookingId || !tokenVersionStr || !providedSignature) {
      return false;
    }

    if (tokenBookingId !== bookingId) {
      return false;
    }

    const parsedVersion = parseInt(tokenVersionStr, 10);
    if (isNaN(parsedVersion) || parsedVersion !== expectedTokenVersion) {
      return false;
    }

    const payload = `sched:booking-manage:v1:${bookingId}:${expectedTokenVersion}`;
    const expectedSignature = crypto.createHmac("sha256", this.secret).update(payload).digest("hex");

    try {
      const providedBuffer = Buffer.from(providedSignature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (providedBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Generates the attendee public management URL containing the capability token.
   */
  generateManagementUrl(appUrl: string, bookingId: string, tokenVersion = 1): string {
    const token = this.generateToken(bookingId, tokenVersion);
    return `${appUrl}/public/bookings/${bookingId}?token=${encodeURIComponent(token)}`;
  }
}
