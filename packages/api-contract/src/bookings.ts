import { z } from "zod";

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const createBookingBodySchema = z.object({
  startUtc: z.string().datetime({ message: "startUtc must be a valid ISO 8601 UTC date-time string" }),
  attendeeName: z.string().trim().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  attendeeEmail: z.string().trim().email("Invalid email address"),
  attendeeTimeZone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .refine((val) => isValidIanaTimezone(val), {
      message: "attendeeTimeZone must be a valid IANA timezone (e.g. America/New_York)",
    }),
  attendeeNotes: z.string().trim().max(1000, "Notes cannot exceed 1000 characters").optional().default(""),
});

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

export const cancelBookingBodySchema = z.object({
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
});

export type CancelBookingBody = z.infer<typeof cancelBookingBodySchema>;

export const listBookingsQuerySchema = z.object({
  status: z.enum(["upcoming", "past", "cancelled", "all"]).optional().default("upcoming"),
});

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

export const bookingSummarySchema = z.object({
  id: z.string().uuid(),
  eventTypeId: z.string().uuid(),
  hostId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  attendeeName: z.string(),
  attendeeEmail: z.string(),
  attendeeTimeZone: z.string(),
  attendeeNotes: z.string(),
  cancellationReason: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  cancelledBy: z.string().nullable().optional(),
  createdAt: z.string(),
  eventType: z.object({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    durationMinutes: z.number(),
  }),
  host: z.object({
    id: z.string().uuid(),
    name: z.string(),
    username: z.string(),
    timezone: z.string(),
  }),
});

export type BookingResponse = z.infer<typeof bookingSummarySchema>;
