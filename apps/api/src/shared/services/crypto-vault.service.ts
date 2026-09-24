import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class CryptoVaultService {
  private readonly logger = new Logger("CryptoVaultService");
  private readonly masterKey: Buffer;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.get<string>("CALENDAR_ENCRYPTION_KEY") || process.env.CALENDAR_ENCRYPTION_KEY;
    if (!rawKey) {
      throw new Error(
        "FATAL: CALENDAR_ENCRYPTION_KEY environment variable is missing. It must be a 32-byte hex, base64, or 32-character string."
      );
    }

    let keyBuffer: Buffer;
    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      // 64-character hex string (32 bytes)
      keyBuffer = Buffer.from(rawKey, "hex");
    } else if (rawKey.length === 44 && rawKey.endsWith("=")) {
      // Standard 32-byte base64 string
      keyBuffer = Buffer.from(rawKey, "base64");
    } else {
      // Treat as raw string or buffer
      keyBuffer = Buffer.from(rawKey, "utf-8");
    }

    if (keyBuffer.length !== 32) {
      throw new Error(
        `FATAL: CALENDAR_ENCRYPTION_KEY must be exactly 32 bytes (256 bits). Received ${keyBuffer.length} bytes.`
      );
    }

    this.masterKey = keyBuffer;
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns a versioned payload in format: `v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error("Cannot encrypt empty or null plaintext.");
    }

    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", this.masterKey, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `v1:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
  }

  /**
   * Decrypts a versioned AES-256-GCM payload.
   */
  decrypt(payload: string): string {
    if (!payload || typeof payload !== "string") {
      throw new Error("Invalid encrypted payload.");
    }

    const parts = payload.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted payload format. Expected v1:<iv>:<tag>:<ciphertext>");
    }

    const [version, ivHex, tagHex, cipherHex] = parts;
    if (version !== "v1") {
      throw new Error(`Unsupported crypto payload version: ${version}`);
    }

    const iv = Buffer.from(ivHex!, "hex");
    const authTag = Buffer.from(tagHex!, "hex");
    const ciphertext = Buffer.from(cipherHex!, "hex");

    if (iv.length !== 12 || authTag.length !== 16) {
      throw new Error("Invalid IV or authentication tag length.");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", this.masterKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  }
}
