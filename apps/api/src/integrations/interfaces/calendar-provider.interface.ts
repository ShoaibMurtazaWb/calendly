export interface CalendarCredentials {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
}

export interface FreeBusyBlock {
  start: Date; // Normalized UTC
  end: Date;   // Normalized UTC
}

export interface CalendarInfo {
  id: string;
  name: string;
  isPrimary: boolean;
  accessRole: "owner" | "writer" | "writerWithoutPrivateAccess" | "reader" | "freeBusyReader";
  writable: boolean;
}

export interface SyncEventParams {
  calendarId: string;
  externalEventId: string;
  booking: {
    id: string;
    sequence: number;
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    attendeeName: string;
    attendeeEmail: string;
    status: "CONFIRMED" | "CANCELLED";
  };
  sendUpdates?: "all" | "externalOnly" | "none";
}

export const CALENDAR_PROVIDER = Symbol("CALENDAR_PROVIDER");

export interface CalendarProvider {
  getFreeBusy(
    credentials: CalendarCredentials,
    calendarIds: string[],
    startUtc: Date,
    endUtc: Date,
    options?: { abortSignal?: AbortSignal }
  ): Promise<FreeBusyBlock[]>;

  syncEvent(
    credentials: CalendarCredentials,
    params: SyncEventParams
  ): Promise<{ externalEventId: string }>;

  deleteEvent(
    credentials: CalendarCredentials,
    calendarId: string,
    externalEventId: string,
    sendUpdates?: "none"
  ): Promise<void>;

  listCalendars(credentials: CalendarCredentials): Promise<CalendarInfo[]>;

  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresInSeconds: number;
    refreshToken?: string;
  }>;
}
