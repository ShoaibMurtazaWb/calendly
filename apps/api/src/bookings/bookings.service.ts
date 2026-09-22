import { Injectable } from "@nestjs/common";
import type { BookingResponse, CreateBookingBody, ListBookingsQuery } from "@sched/api-contract";
import { ConflictError, NotFoundError } from "../shared/errors/app-error";
import { PrismaService } from "../shared/prisma/prisma.service";
import { SchedulesService } from "../schedules/schedules.service";
import { SlotsService } from "../schedules/slots.service";

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedules: SchedulesService,
    private readonly slots: SlotsService
  ) {}

  async createBooking(
    username: string,
    eventSlug: string,
    dto: CreateBookingBody
  ): Promise<BookingResponse> {
    const eventType = await this.prisma.eventType.findFirst({
      where: {
        slug: eventSlug,
        archivedAt: null,
        user: { username },
      },
      include: { user: true },
    });

    if (!eventType) {
      throw new NotFoundError();
    }

    const startUtc = new Date(dto.startUtc);
    if (isNaN(startUtc.getTime())) {
      throw new ConflictError("INVALID_DATE", "Invalid start date time.");
    }

    const now = new Date();
    const minNoticeMs = eventType.minimumNoticeMinutes * 60 * 1000;
    if (startUtc.getTime() < now.getTime() + minNoticeMs) {
      throw new ConflictError(
        "MINIMUM_NOTICE_VIOLATION",
        `Bookings require at least ${eventType.minimumNoticeMinutes} minutes advance notice.`
      );
    }

    const endUtc = new Date(startUtc.getTime() + eventType.durationMinutes * 60 * 1000);

    // Validate that the slot is available in the schedule
    const schedule = await this.schedules.getDefaultSchedule(eventType.userId);

    // Format start/end date for slots calculation
    const slotDateStr = startUtc.toISOString().slice(0, 10);
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        hostId: eventType.userId,
        status: "CONFIRMED",
        startTime: {
          gte: new Date(startUtc.getTime() - 24 * 60 * 60 * 1000),
          lte: new Date(endUtc.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { startTime: true, endTime: true },
    });

    const computedSlots = this.slots.computeAvailableSlots(
      schedule,
      eventType,
      slotDateStr,
      slotDateStr,
      dto.attendeeTimeZone,
      now,
      existingBookings
    );

    const isSlotValid = computedSlots.some(
      (s) => Math.abs(new Date(s.startUtc).getTime() - startUtc.getTime()) < 1000
    );

    if (!isSlotValid) {
      throw new ConflictError(
        "SLOT_UNAVAILABLE",
        "The selected time slot is not available according to host schedule or notice rules."
      );
    }

    // Double-booking prevention with transaction
    const bufferedStart = new Date(startUtc.getTime() - eventType.beforeBufferMinutes * 60 * 1000);
    const bufferedEnd = new Date(endUtc.getTime() + eventType.afterBufferMinutes * 60 * 1000);

    const booking = await this.prisma.$transaction(async (tx) => {
      // Check for overlapping confirmed booking for this host
      const collision = await tx.booking.findFirst({
        where: {
          hostId: eventType.userId,
          status: "CONFIRMED",
          startTime: { lt: bufferedEnd },
          endTime: { gt: bufferedStart },
        },
      });

      if (collision) {
        throw new ConflictError(
          "SLOT_ALREADY_BOOKED",
          "This time slot has already been booked by someone else."
        );
      }

      return tx.booking.create({
        data: {
          eventTypeId: eventType.id,
          hostId: eventType.userId,
          startTime: startUtc,
          endTime: endUtc,
          status: "CONFIRMED",
          attendeeName: dto.attendeeName,
          attendeeEmail: dto.attendeeEmail,
          attendeeTimeZone: dto.attendeeTimeZone,
          attendeeNotes: dto.attendeeNotes ?? "",
        },
        include: {
          eventType: true,
          host: true,
        },
      });
    });

    return this.mapToResponse(booking);
  }

  async getHostBookings(userId: string, query: ListBookingsQuery): Promise<BookingResponse[]> {
    const now = new Date();
    const statusFilter = query.status ?? "upcoming";

    let whereClause: Record<string, unknown> = { hostId: userId };

    if (statusFilter === "upcoming") {
      whereClause = {
        hostId: userId,
        status: "CONFIRMED",
        startTime: { gte: now },
      };
    } else if (statusFilter === "past") {
      whereClause = {
        hostId: userId,
        status: "CONFIRMED",
        startTime: { lt: now },
      };
    } else if (statusFilter === "cancelled") {
      whereClause = {
        hostId: userId,
        status: "CANCELLED",
      };
    }

    const rows = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        eventType: true,
        host: true,
      },
      orderBy: {
        startTime: statusFilter === "upcoming" ? "asc" : "desc",
      },
    });

    return rows.map((r) => this.mapToResponse(r));
  }

  async getPublicBooking(id: string): Promise<BookingResponse> {
    const row = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: true,
        host: true,
      },
    });

    if (!row) {
      throw new NotFoundError();
    }

    return this.mapToResponse(row);
  }

  async cancelByHost(userId: string, id: string, reason?: string): Promise<BookingResponse> {
    const existing = await this.prisma.booking.findFirst({
      where: { id, hostId: userId },
      include: { eventType: true, host: true },
    });

    if (!existing) {
      throw new NotFoundError();
    }

    if (existing.status === "CANCELLED") {
      return this.mapToResponse(existing);
    }

    const updated = await this.prisma.booking.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "HOST",
        cancellationReason: reason ?? null,
      },
      include: {
        eventType: true,
        host: true,
      },
    });

    return this.mapToResponse(updated);
  }

  async cancelByAttendee(id: string, reason?: string): Promise<BookingResponse> {
    const existing = await this.prisma.booking.findUnique({
      where: { id },
      include: { eventType: true, host: true },
    });

    if (!existing) {
      throw new NotFoundError();
    }

    if (existing.status === "CANCELLED") {
      return this.mapToResponse(existing);
    }

    const updated = await this.prisma.booking.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "ATTENDEE",
        cancellationReason: reason ?? null,
      },
      include: {
        eventType: true,
        host: true,
      },
    });

    return this.mapToResponse(updated);
  }

  async getIcsContent(id: string): Promise<{ filename: string; content: string }> {
    const booking = await this.getPublicBooking(id);

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };

    const startFormatted = formatIcsDate(new Date(booking.startTime));
    const endFormatted = formatIcsDate(new Date(booking.endTime));
    const nowFormatted = formatIcsDate(new Date());

    const filename = `${booking.eventType.slug}-${booking.id.slice(0, 8)}.ics`;

    const summary = `${booking.eventType.title} with ${booking.host.name}`;
    const description = `Meeting between ${booking.host.name} and ${booking.attendeeName}\\n\\nNotes: ${booking.attendeeNotes || "None"}`;

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sched//Calendar Meeting Engine//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${booking.id}@sched.com`,
      `DTSTAMP:${nowFormatted}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:${booking.status === "CONFIRMED" ? "CONFIRMED" : "CANCELLED"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    return {
      filename,
      content: icsLines.join("\r\n"),
    };
  }

  private mapToResponse(row: {
    id: string;
    eventTypeId: string;
    hostId: string;
    startTime: Date;
    endTime: Date;
    status: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeeTimeZone: string;
    attendeeNotes: string;
    cancellationReason: string | null;
    cancelledAt: Date | null;
    cancelledBy: string | null;
    createdAt: Date;
    eventType: {
      id: string;
      title: string;
      slug: string;
      durationMinutes: number;
    };
    host: {
      id: string;
      name: string;
      username: string;
      timezone: string;
    };
  }): BookingResponse {
    return {
      id: row.id,
      eventTypeId: row.eventTypeId,
      hostId: row.hostId,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      status: row.status,
      attendeeName: row.attendeeName,
      attendeeEmail: row.attendeeEmail,
      attendeeTimeZone: row.attendeeTimeZone,
      attendeeNotes: row.attendeeNotes,
      cancellationReason: row.cancellationReason,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      cancelledBy: row.cancelledBy,
      createdAt: row.createdAt.toISOString(),
      eventType: {
        id: row.eventType.id,
        title: row.eventType.title,
        slug: row.eventType.slug,
        durationMinutes: row.eventType.durationMinutes,
      },
      host: {
        id: row.host.id,
        name: row.host.name,
        username: row.host.username,
        timezone: row.host.timezone,
      },
    };
  }
}
