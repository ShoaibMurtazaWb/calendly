import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CalendarIntegration } from "@prisma/client";
import { CalendarIntegrationStatus, CalendarProviderType } from "@prisma/client";
import type {
  CalendarIntegrationResponse,
  CalendarListResponse,
  UpdateCalendarPreferencesBody,
} from "@sched/api-contract";
import * as crypto from "crypto";
import { BadRequestError, NotFoundError } from "../../shared/errors/app-error";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CryptoVaultService } from "../../shared/services/crypto-vault.service";
import type {
  CalendarCredentials,
  CalendarProvider,
  FreeBusyBlock,
} from "../interfaces/calendar-provider.interface";
import { CALENDAR_PROVIDER } from "../interfaces/calendar-provider.interface";
import { GoogleAuthRevokedError } from "../providers/google-calendar.provider";

export interface OAuthStatePayload {
  userId: string;
  sessionId: string;
  nonce: string;
  expiresAt: number;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger("GoogleCalendarService");
  private readonly stateSecret: string;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly usedNonces = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cryptoVault: CryptoVaultService,
    @Inject(CALENDAR_PROVIDER) private readonly calendarProvider: CalendarProvider
  ) {
    this.stateSecret =
      this.config.get<string>("SESSION_SECRET") ||
      this.config.get<string>("CALENDAR_ENCRYPTION_KEY") ||
      "state-secret-default";
    this.clientId = this.config.get<string>("GOOGLE_CLIENT_ID") || process.env.GOOGLE_CLIENT_ID || "";
    this.redirectUri =
      this.config.get<string>("GOOGLE_REDIRECT_URI") || process.env.GOOGLE_REDIRECT_URI || "";
  }

  /**
   * Generates PKCE code_verifier and code_challenge (S256).
   */
  generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    const codeChallenge = hash.toString("base64url");
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generates a signed, session-bound OAuth state token (10 min TTL).
   */
  generateOAuthState(userId: string, sessionId: string): string {
    const nonce = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const payload: OAuthStatePayload = { userId, sessionId, nonce, expiresAt };
    const payloadStr = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadStr, "utf-8").toString("base64url");

    const hmac = crypto.createHmac("sha256", this.stateSecret).update(payloadB64).digest("base64url");
    return `${payloadB64}.${hmac}`;
  }

  /**
   * Verifies and consumes a signed OAuth state token.
   */
  verifyOAuthState(state: string, expectedUserId: string, expectedSessionId?: string): OAuthStatePayload {
    const parts = state.split(".");
    if (parts.length !== 2) {
      throw new BadRequestError("INVALID_OAUTH_STATE", "Malformed OAuth state parameter.");
    }

    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", this.stateSecret)
      .update(payloadB64!)
      .digest("base64url");

    if (
      signature!.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature!), Buffer.from(expectedSig))
    ) {
      throw new BadRequestError("INVALID_OAUTH_STATE", "Invalid OAuth state signature.");
    }

    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64!, "base64url").toString("utf-8")) as OAuthStatePayload;
    } catch {
      throw new BadRequestError("INVALID_OAUTH_STATE", "Invalid OAuth state encoding.");
    }

    if (payload.userId !== expectedUserId) {
      throw new BadRequestError("OAUTH_USER_MISMATCH", "OAuth state does not match authenticated user.");
    }

    if (expectedSessionId && payload.sessionId !== expectedSessionId) {
      throw new BadRequestError("OAUTH_SESSION_MISMATCH", "OAuth state does not match current session.");
    }

    if (Date.now() > payload.expiresAt) {
      throw new BadRequestError("EXPIRED_OAUTH_STATE", "OAuth state has expired. Please try connecting again.");
    }

    if (this.usedNonces.has(payload.nonce)) {
      throw new BadRequestError("REPLAYED_OAUTH_STATE", "OAuth state has already been used.");
    }

    this.usedNonces.add(payload.nonce);
    // Cleanup nonce after 15 minutes
    setTimeout(() => this.usedNonces.delete(payload.nonce), 15 * 60 * 1000);

    return payload;
  }

  /**
   * Generates full Google OAuth connection URL with PKCE and narrowest scopes.
   */
  async getConnectUrl(
    userId: string,
    sessionId: string
  ): Promise<{ url: string; codeVerifier: string; state: string }> {
    if (!this.clientId || this.clientId.includes("placeholder")) {
      throw new BadRequestError(
        "GOOGLE_OAUTH_NOT_CONFIGURED",
        "Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/api/.env with your Google Cloud credentials."
      );
    }

    const { codeVerifier, codeChallenge } = this.generatePkcePair();
    const state = this.generateOAuthState(userId, sessionId);

    // Check if host already has a stored refresh token
    const existing = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
    });

    const needsConsent = !existing || !existing.encryptedRefreshToken;

    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.freebusy",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    if (needsConsent) {
      params.set("prompt", "consent");
    }

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return { url, codeVerifier, state };
  }

  /**
   * Handles Google OAuth callback and stores encrypted tokens.
   */
  async handleCallback(
    userId: string,
    sessionId: string,
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<CalendarIntegrationResponse> {
    this.verifyOAuthState(state, userId, sessionId);

    const existing = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
    });

    // Exchange authorization code with PKCE
    const googleProvider = this.calendarProvider as unknown as {
      exchangeCode: (
        c: string,
        cv: string
      ) => Promise<{
        accessToken: string;
        refreshToken?: string;
        expiresInSeconds: number;
        accountEmail: string;
        scope: string;
      }>;
    };

    const tokenResult = await googleProvider.exchangeCode(code, codeVerifier);

    const encryptedAccess = this.cryptoVault.encrypt(tokenResult.accessToken);
    const tokenExpiresAt = new Date(Date.now() + tokenResult.expiresInSeconds * 1000);

    // Preserve existing refresh token if Google did not send a new one
    let encryptedRefresh = existing?.encryptedRefreshToken || null;
    if (tokenResult.refreshToken) {
      encryptedRefresh = this.cryptoVault.encrypt(tokenResult.refreshToken);
    }

    // List calendars to determine primary calendar ID/name and verify write permissions
    let primaryCalendarId = "primary";
    let primaryCalendarName = "Primary Calendar";
    try {
      const cals = await this.calendarProvider.listCalendars({
        accessToken: tokenResult.accessToken,
      });
      const primary = cals.find((c) => c.isPrimary);
      if (primary) {
        primaryCalendarId = primary.id;
        primaryCalendarName = primary.name;
      }
    } catch (err) {
      this.logger.warn("Could not list calendars immediately after connect", err);
    }

    const defaultSelectedId = existing?.selectedCalendarId || primaryCalendarId;
    const defaultConflictIds =
      existing?.conflictCalendarIds && existing.conflictCalendarIds.length > 0
        ? existing.conflictCalendarIds
        : [primaryCalendarId];

    const integration = await this.prisma.calendarIntegration.upsert({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
      create: {
        userId,
        provider: CalendarProviderType.GOOGLE,
        status: CalendarIntegrationStatus.CONNECTED,
        accountEmail: tokenResult.accountEmail,
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        tokenExpiresAt,
        scope: tokenResult.scope,
        selectedCalendarId: defaultSelectedId,
        selectedCalendarName: primaryCalendarName,
        conflictCalendarIds: defaultConflictIds,
      },
      update: {
        status: CalendarIntegrationStatus.CONNECTED,
        accountEmail: tokenResult.accountEmail,
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        tokenExpiresAt,
        scope: tokenResult.scope,
        selectedCalendarId: defaultSelectedId,
        selectedCalendarName: existing?.selectedCalendarName || primaryCalendarName,
        conflictCalendarIds: defaultConflictIds,
      },
    });

    return this.mapToResponse(integration);
  }

  /**
   * Retrieves valid credentials for a calendar integration, refreshing transparently if near expiration.
   */
  async getValidCredentials(integration: CalendarIntegration): Promise<CalendarCredentials> {
    if (
      integration.status !== CalendarIntegrationStatus.CONNECTED ||
      !integration.encryptedAccessToken
    ) {
      throw new BadRequestError("CALENDAR_NOT_CONNECTED", "Google Calendar is not connected or active.");
    }

    let accessToken = this.cryptoVault.decrypt(integration.encryptedAccessToken);
    const refreshToken = integration.encryptedRefreshToken
      ? this.cryptoVault.decrypt(integration.encryptedRefreshToken)
      : null;

    const now = Date.now();
    const expiresAt = integration.tokenExpiresAt ? integration.tokenExpiresAt.getTime() : 0;
    const isNearExpiry = expiresAt - now < 5 * 60 * 1000; // 5 minutes buffer

    if (isNearExpiry && refreshToken) {
      try {
        const refreshed = await this.calendarProvider.refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        const newExpiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
        const newEncryptedAccess = this.cryptoVault.encrypt(accessToken);

        let newEncryptedRefresh = integration.encryptedRefreshToken;
        if (refreshed.refreshToken) {
          newEncryptedRefresh = this.cryptoVault.encrypt(refreshed.refreshToken);
        }

        await this.prisma.calendarIntegration.update({
          where: { id: integration.id },
          data: {
            encryptedAccessToken: newEncryptedAccess,
            encryptedRefreshToken: newEncryptedRefresh,
            tokenExpiresAt: newExpiresAt,
          },
        });
      } catch (err) {
        if (err instanceof GoogleAuthRevokedError) {
          await this.markRevokedAndClearSecrets(integration.id);
          throw err;
        }
        this.logger.error(`Failed to refresh token for integration ${integration.id}`, err);
        // Continue with current access token if transient error
      }
    }

    return {
      accessToken,
      refreshToken,
      tokenExpiresAt: integration.tokenExpiresAt,
    };
  }

  /**
   * Queries host's Google FreeBusy intervals with an explicit abort timeout.
   */
  async getFreeBusyIntervals(
    userId: string,
    startUtc: Date,
    endUtc: Date,
    timeoutMs = 1500
  ): Promise<FreeBusyBlock[]> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
    });

    if (!integration || integration.status !== CalendarIntegrationStatus.CONNECTED) {
      return [];
    }

    const calendarIds =
      integration.conflictCalendarIds.length > 0 ? integration.conflictCalendarIds : ["primary"];

    try {
      const credentials = await this.getValidCredentials(integration);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const blocks = await this.calendarProvider.getFreeBusy(
          credentials,
          calendarIds,
          startUtc,
          endUtc,
          { abortSignal: controller.signal }
        );
        return blocks;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      if (err instanceof GoogleAuthRevokedError) {
        this.logger.warn(`Google authorization revoked for user ${userId}`);
      } else {
        this.logger.warn(`Google FreeBusy lookup failed or timed out for user ${userId}`, err);
      }
      throw err;
    }
  }

  /**
   * Pre-transaction booking availability check against connected Google calendars.
   */
  async checkAvailability(
    userId: string,
    startUtc: Date,
    endUtc: Date,
    timeoutMs = 2500
  ): Promise<boolean> {
    const blocks = await this.getFreeBusyIntervals(userId, startUtc, endUtc, timeoutMs);

    const slotStartMs = startUtc.getTime();
    const slotEndMs = endUtc.getTime();

    for (const block of blocks) {
      const busyStartMs = block.start.getTime();
      const busyEndMs = block.end.getTime();

      // Overlap condition: [slotStartMs, slotEndMs] overlaps [busyStartMs, busyEndMs]
      if (slotStartMs < busyEndMs && slotEndMs > busyStartMs) {
        return false;
      }
    }

    return true;
  }

  /**
   * Lists calendars for the authenticated host.
   */
  async listHostCalendars(userId: string): Promise<CalendarListResponse> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
    });

    if (!integration || integration.status !== CalendarIntegrationStatus.CONNECTED) {
      throw new NotFoundError("Google Calendar is not connected.");
    }

    const credentials = await this.getValidCredentials(integration);
    const calendars = await this.calendarProvider.listCalendars(credentials);

    return {
      calendars: calendars.map((c) => ({
        id: c.id,
        name: c.name,
        isPrimary: c.isPrimary,
        accessRole: c.accessRole,
        writable: c.writable,
      })),
    };
  }

  /**
   * Updates host's calendar preferences with write-permission validation.
   */
  async updateCalendarPreferences(
    userId: string,
    dto: UpdateCalendarPreferencesBody
  ): Promise<CalendarIntegrationResponse> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
    });

    if (!integration || integration.status !== CalendarIntegrationStatus.CONNECTED) {
      throw new NotFoundError("Google Calendar is not connected.");
    }

    const credentials = await this.getValidCredentials(integration);
    const calendars = await this.calendarProvider.listCalendars(credentials);

    const targetCal =
      calendars.find((c) => c.id === dto.selectedCalendarId) ||
      (dto.selectedCalendarId === "primary" ? calendars.find((c) => c.isPrimary) : undefined);

    if (!targetCal) {
      throw new BadRequestError("CALENDAR_NOT_FOUND", "The selected destination calendar was not found.");
    }

    if (!targetCal.writable) {
      throw new BadRequestError(
        "INSUFFICIENT_CALENDAR_PERMISSIONS",
        `You do not have write permissions for the calendar '${targetCal.name}'. Please choose a calendar where you have writer or owner access.`
      );
    }

    // Normalize any "primary" alias in conflictCalendarIds to the actual primary calendar ID
    const primaryCal = calendars.find((c) => c.isPrimary);
    const resolvedConflictIds = dto.conflictCalendarIds.map((id) =>
      id === "primary" && primaryCal ? primaryCal.id : id
    );

    const updated = await this.prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        selectedCalendarId: targetCal.id,
        selectedCalendarName: targetCal.name,
        conflictCalendarIds: resolvedConflictIds,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Disconnects integration and erases secret OAuth tokens.
   */
  async disconnect(userId: string): Promise<CalendarIntegrationResponse> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
    });

    if (!integration) {
      throw new NotFoundError("No Google Calendar integration found.");
    }

    const updated = await this.prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        status: CalendarIntegrationStatus.DISCONNECTED,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Gets integration status for host dashboard.
   */
  async getIntegration(userId: string): Promise<CalendarIntegrationResponse | null> {
    const integration = await this.prisma.calendarIntegration.findUnique({
      where: { userId_provider: { userId, provider: CalendarProviderType.GOOGLE } },
    });

    if (!integration) return null;
    return this.mapToResponse(integration);
  }

  /**
   * Helper to mark status as REVOKED and erase secrets.
   */
  async markRevokedAndClearSecrets(integrationId: string): Promise<void> {
    await this.prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        status: CalendarIntegrationStatus.REVOKED,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
      },
    });
    this.logger.warn(`Marked integration ${integrationId} as REVOKED and cleared credentials.`);
  }

  private mapToResponse(row: CalendarIntegration): CalendarIntegrationResponse {
    return {
      id: row.id,
      provider: row.provider,
      status: row.status,
      accountEmail: row.accountEmail,
      selectedCalendarId: row.selectedCalendarId,
      selectedCalendarName: row.selectedCalendarName,
      conflictCalendarIds: row.conflictCalendarIds,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
