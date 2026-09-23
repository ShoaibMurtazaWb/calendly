import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { BookingActor, LocationType } from "@prisma/client";
import type {
  BookingResponse,
  CreateBookingBody,
  ListBookingsQuery,
  RescheduleBookingBody,
} from "@sched/api-contract";
import { phoneSchema } from "@sched/api-contract";
import { NotificationsService } from "../notifications/notifications.service";
import { BadRequestError, ConflictError, NotFoundError } from "../shared/errors/app-error";
import { PrismaService } from "../shared/prisma/prisma.service";
import { BookingTokenService } from "../shared/services/booking-token.service";
import {
  parseStoredBookingCustomResponses,
  parseStoredCustomQuestions,
  validateAndBuildCustomResponses,
} from "../shared/utils/custom-questions-parser";
import { generateIcsCalendar } from "../shared/utils/ics-formatter";
import { parseBookingLocation } from "../shared/utils/location-parser";
import { SchedulesService } from "../schedules/schedules.service";
import { SlotsService } from "../schedules/slots.service";

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedules: SchedulesService,
    private readonly slots: SlotsService,
    private readonly notifications: NotificationsService,
    private readonly tokenService: BookingTokenService
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

    // Phone validation for HOST_CALLS_ATTENDEE
    let attendeePhone = dto.attendeePhoneNumber?.trim() || null;
    if (eventType.locationType === LocationType.HOST_CALLS_ATTENDEE) {
      if (!attendeePhone) {
        throw new BadRequestError("PHONE_REQUIRED", "Phone number is required for this meeting type.");
      }
      const parsedPhone = phoneSchema.safeParse(attendeePhone);
      if (!parsedPhone.success) {
        throw new BadRequestError(
          "INVALID_PHONE",
          "Phone number must be in valid international format (e.g. +14155552671)."
        );
      }
      attendeePhone = parsedPhone.data;
    }

    // Custom Booking Questions Validation & Snapshot Preparation
    const configuredQuestions = parseStoredCustomQuestions(eventType.customQuestions);
    const customResponses = validateAndBuildCustomResponses(configuredQuestions, dto.customResponses);

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

    // Double-booking prevention with atomic transaction and PostgreSQL GiST exclusion constraint
    const bufferedStart = new Date(startUtc.getTime() - eventType.beforeBufferMinutes * 60 * 1000);
    const bufferedEnd = new Date(endUtc.getTime() + eventType.afterBufferMinutes * 60 * 1000);

    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        // In-band check for collision (including custom buffer minutes)
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

        const created = await tx.booking.create({
          data: {
            eventTypeId: eventType.id,
            hostId: eventType.userId,
            startTime: startUtc,
            endTime: endUtc,
            status: "CONFIRMED",
            sequence: 0,
            tokenVersion: 1,
            attendeeName: dto.attendeeName,
            attendeeEmail: dto.attendeeEmail,
            attendeeTimeZone: dto.attendeeTimeZone,
            attendeePhoneNumber: attendeePhone,
            attendeeNotes: dto.attendeeNotes ?? "",
            locationType: eventType.locationType,
            locationData: eventType.locationData ?? undefined,
            customResponses: customResponses.length > 0 ? (customResponses as unknown as Prisma.InputJsonValue) : undefined,
          },
          include: {
            eventType: true,
            host: true,
          },
        });

        // Atomically enqueue transactional outbox jobs within the same transaction
        await this.notifications.enqueueConfirmationJobsInTx(tx, created);

        return created;
      });

      const manageToken = this.tokenService.generateToken(booking.id, booking.tokenVersion);
      return {
        ...this.mapToResponse(booking),
        manageToken,
      };
    } catch (error: unknown) {
      const dbErr = error as { code?: string };
      if (dbErr?.code === "23P01" || dbErr?.code === "P2002") {
        throw new ConflictError(
          "SLOT_ALREADY_BOOKED",
          "This time slot has already been booked by someone else."
        );
      }
      throw error;
    }
  }

  async listHostBookings(userId: string, query: ListBookingsQuery): Promise<BookingResponse[]> {
    const now = new Date();
    const where: Prisma.BookingWhereInput = {
      hostId: userId,
    };

    if (query.status === "upcoming") {
      where.status = "CONFIRMED";
      where.startTime = { gte: now };
    } else if (query.status === "past") {
      where.status = "CONFIRMED";
      where.startTime = { lt: now };
    } else if (query.status === "cancelled") {
      where.status = "CANCELLED";
    }

    const rows = await this.prisma.booking.findMany({
      where,
      orderBy: { startTime: query.status === "past" ? "desc" : "asc" },
      include: {
        eventType: true,
        host: true,
      },
    });

    return rows.map((r) => this.mapToResponse(r));
  }

  async getHostBookings(userId: string, query: ListBookingsQuery): Promise<BookingResponse[]> {
    return this.listHostBookings(userId, query);
  }

  async getPublicBooking(bookingId: string, token: string | undefined): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        eventType: true,
        host: true,
      },
    });

    if (!booking || !token || !this.tokenService.verifyToken(booking.id, token, booking.tokenVersion)) {
      throw new NotFoundError("Booking not found or this link is no longer valid.");
    }

    const manageToken = this.tokenService.generateToken(booking.id, booking.tokenVersion);
    return {
      ...this.mapToResponse(booking),
      manageToken,
    };
  }

  async rescheduleBooking(
    bookingId: string,
    dto: RescheduleBookingBody,
    actor: BookingActor,
    hostUserId?: string,
    token?: string
  ): Promise<BookingResponse> {
    const startUtc = new Date(dto.startUtc);
    if (isNaN(startUtc.getTime())) {
      throw new ConflictError("INVALID_DATE", "Invalid start date time.");
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // 1. Acquire explicit row lock
        const lockedRows = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "bookings" WHERE id = ${bookingId}::uuid FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError("Booking not found or this link is no longer valid.");
        }

        // 2. Load typed booking with relations inside transaction
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            eventType: true,
            host: true,
          },
        });

        if (!booking) {
          throw new NotFoundError("Booking not found or this link is no longer valid.");
        }

        // Authorization validation
        if (actor === BookingActor.HOST) {
          if (!hostUserId || booking.hostId !== hostUserId) {
            throw new NotFoundError("Booking not found or this link is no longer valid.");
          }
        } else {
          if (!token || !this.tokenService.verifyToken(booking.id, token, booking.tokenVersion)) {
            throw new NotFoundError("Booking not found or this link is no longer valid.");
          }
        }

        if (booking.status === "CANCELLED") {
          throw new ConflictError("BOOKING_CANCELLED", "Cancelled bookings cannot be rescheduled.");
        }

        // 3. Optimistic version check
        if (booking.sequence !== dto.expectedSequence) {
          throw new ConflictError(
            "BOOKING_VERSION_CONFLICT",
            "This booking was modified by another request. Please reload and try again."
          );
        }

        // 4. Calculate new end time preserving committed duration
        const durationMs = booking.endTime.getTime() - booking.startTime.getTime();
        const endUtc = new Date(startUtc.getTime() + durationMs);

        // 5. Minimum notice check
        const now = new Date();
        const minNoticeMs = booking.eventType.minimumNoticeMinutes * 60 * 1000;
        if (startUtc.getTime() < now.getTime() + minNoticeMs) {
          throw new ConflictError(
            "MINIMUM_NOTICE_VIOLATION",
            `Bookings require at least ${booking.eventType.minimumNoticeMinutes} minutes advance notice.`
          );
        }

        // 6. In-band availability verification ignoring the current booking
        const schedule = await this.schedules.getDefaultSchedule(booking.hostId);
        const slotDateStr = startUtc.toISOString().slice(0, 10);
        const timezone = dto.timeZone || booking.attendeeTimeZone;

        const otherBookings = await tx.booking.findMany({
          where: {
            hostId: booking.hostId,
            status: "CONFIRMED",
            id: { not: booking.id },
            startTime: {
              gte: new Date(startUtc.getTime() - 24 * 60 * 60 * 1000),
              lte: new Date(endUtc.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          select: { startTime: true, endTime: true },
        });

        const computedSlots = this.slots.computeAvailableSlots(
          schedule,
          booking.eventType,
          slotDateStr,
          slotDateStr,
          timezone,
          now,
          otherBookings
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

        // 7. Check buffer collisions
        const bufferedStart = new Date(
          startUtc.getTime() - booking.eventType.beforeBufferMinutes * 60 * 1000
        );
        const bufferedEnd = new Date(
          endUtc.getTime() + booking.eventType.afterBufferMinutes * 60 * 1000
        );

        const collision = await tx.booking.findFirst({
          where: {
            hostId: booking.hostId,
            status: "CONFIRMED",
            id: { not: booking.id },
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

        // 8. Calculate new sequence and record audit history
        const newSequence = booking.sequence + 1;
        await tx.bookingRescheduleHistory.create({
          data: {
            bookingId: booking.id,
            sequence: newSequence,
            previousStartTime: booking.startTime,
            previousEndTime: booking.endTime,
            newStartTime: startUtc,
            newEndTime: endUtc,
            rescheduledBy: actor,
            reason: dto.reason ?? null,
          },
        });

        // 9. Update booking: atomic sequence increment, preserving location snapshot
        const res = await tx.booking.update({
          where: { id: booking.id },
          data: {
            startTime: startUtc,
            endTime: endUtc,
            sequence: newSequence,
            rescheduleCount: booking.rescheduleCount + 1,
            rescheduledAt: now,
            rescheduledBy: actor,
            rescheduleReason: dto.reason ?? null,
            previousStartTime: booking.startTime,
            previousEndTime: booking.endTime,
          },
          include: {
            eventType: true,
            host: true,
          },
        });

        // 10. Enqueue reschedule notification outbox jobs
        await this.notifications.enqueueRescheduleJobsInTx(tx, res);

        return res;
      });

      const manageToken = this.tokenService.generateToken(updated.id, updated.tokenVersion);
      return {
        ...this.mapToResponse(updated),
        manageToken,
      };
    } catch (error: unknown) {
      const dbErr = error as { code?: string };
      if (dbErr?.code === "23P01" || dbErr?.code === "P2002") {
        throw new ConflictError(
          "SLOT_ALREADY_BOOKED",
          "This time slot has already been booked by someone else."
        );
      }
      throw error;
    }
  }

  async cancelBooking(
    bookingId: string,
    expectedSequence: number,
    reason: string | undefined,
    actor: BookingActor,
    hostUserId?: string,
    token?: string
  ): Promise<BookingResponse> {
    const cancelled = await this.prisma.$transaction(async (tx) => {
      // 1. Acquire explicit row lock
      const lockedRows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "bookings" WHERE id = ${bookingId}::uuid FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundError("Booking not found or this link is no longer valid.");
      }

      // 2. Load typed booking inside transaction
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          eventType: true,
          host: true,
        },
      });

      if (!booking) {
        throw new NotFoundError("Booking not found or this link is no longer valid.");
      }

      // Authorization validation
      if (actor === BookingActor.HOST) {
        if (!hostUserId || booking.hostId !== hostUserId) {
          throw new NotFoundError("Booking not found or this link is no longer valid.");
        }
      } else {
        if (!token || !this.tokenService.verifyToken(booking.id, token, booking.tokenVersion)) {
          throw new NotFoundError("Booking not found or this link is no longer valid.");
        }
      }

      if (booking.status === "CANCELLED") {
        return booking;
      }

      // 3. Optimistic version check
      if (booking.sequence !== expectedSequence) {
        throw new ConflictError(
          "BOOKING_VERSION_CONFLICT",
          "This booking was modified by another request. Please reload and try again."
        );
      }

      const now = new Date();
      const newSequence = booking.sequence + 1;
      const res = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          sequence: newSequence,
          cancelledAt: now,
          cancelledBy: actor,
          cancellationReason: reason || null,
        },
        include: {
          eventType: true,
          host: true,
        },
      });

      // Atomically enqueue cancellation outbox jobs
      await this.notifications.enqueueCancellationJobsInTx(tx, res);

      return res;
    });

    const manageToken = this.tokenService.generateToken(cancelled.id, cancelled.tokenVersion);
    return {
      ...this.mapToResponse(cancelled),
      manageToken,
    };
  }

  async getBookingIcs(
    bookingId: string,
    token: string
  ): Promise<{ filename: string; content: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        eventType: true,
        host: true,
      },
    });

    if (!booking || !this.tokenService.verifyToken(booking.id, token, booking.tokenVersion)) {
      throw new NotFoundError("Booking not found or this link is no longer valid.");
    }

    const filename = `${booking.eventType.slug}-${booking.id.slice(0, 8)}-v${booking.sequence}.ics`;
    const content = generateIcsCalendar({
      uid: `${booking.id}@sched.com`,
      sequence: booking.sequence,
      dtstamp: new Date(),
      startTime: new Date(booking.startTime),
      endTime: new Date(booking.endTime),
      summary: `${booking.eventType.title} with ${booking.host.name}`,
      description: `Meeting between ${booking.host.name} and ${booking.attendeeName}\n\nNotes: ${
        booking.attendeeNotes || "None"
      }`,
      status: booking.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
      locationType: booking.locationType,
      locationData: booking.locationData as Record<string, unknown> | null,
      attendeePhoneNumber: booking.attendeePhoneNumber,
      hostName: booking.host.name,
      attendeeName: booking.attendeeName,
    });

    return {
      filename,
      content,
    };
  }

  async cancelByAttendee(
    bookingId: string,
    token: string | undefined,
    expectedSequence: number,
    reason?: string
  ): Promise<BookingResponse> {
    return this.cancelBooking(bookingId, expectedSequence, reason, BookingActor.ATTENDEE, undefined, token);
  }

  async rescheduleByAttendee(
    bookingId: string,
    token: string | undefined,
    dto: RescheduleBookingBody
  ): Promise<BookingResponse> {
    return this.rescheduleBooking(bookingId, dto, BookingActor.ATTENDEE, undefined, token);
  }

  async cancelByHost(
    hostUserId: string,
    bookingId: string,
    expectedSequence: number,
    reason?: string
  ): Promise<BookingResponse> {
    return this.cancelBooking(bookingId, expectedSequence, reason, BookingActor.HOST, hostUserId, undefined);
  }

  async rescheduleByHost(
    hostUserId: string,
    bookingId: string,
    dto: RescheduleBookingBody
  ): Promise<BookingResponse> {
    return this.rescheduleBooking(bookingId, dto, BookingActor.HOST, hostUserId, undefined);
  }

  async getIcsContent(
    bookingId: string,
    token: string | undefined
  ): Promise<{ filename: string; content: string }> {
    return this.getBookingIcs(bookingId, token || "");
  }

  private mapToResponse(row: {
    id: string;
    eventTypeId: string;
    hostId: string;
    startTime: Date;
    endTime: Date;
    status: string;
    sequence: number;
    rescheduleCount: number;
    rescheduledAt: Date | null;
    rescheduledBy: BookingActor | null;
    rescheduleReason: string | null;
    previousStartTime: Date | null;
    previousEndTime: Date | null;
    attendeeName: string;
    attendeeEmail: string;
    attendeeTimeZone: string;
    attendeePhoneNumber?: string | null;
    attendeeNotes: string;
    locationType?: LocationType | null;
    locationData?: unknown | null;
    customResponses?: unknown | null;
    cancellationReason: string | null;
    cancelledAt: Date | null;
    cancelledBy: BookingActor | null;
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
      sequence: row.sequence,
      rescheduleCount: row.rescheduleCount,
      rescheduledAt: row.rescheduledAt?.toISOString() ?? null,
      rescheduledBy: row.rescheduledBy,
      rescheduleReason: row.rescheduleReason,
      previousStartTime: row.previousStartTime?.toISOString() ?? null,
      previousEndTime: row.previousEndTime?.toISOString() ?? null,
      attendeeName: row.attendeeName,
      attendeeEmail: row.attendeeEmail,
      attendeeTimeZone: row.attendeeTimeZone,
      attendeePhoneNumber: row.attendeePhoneNumber ?? null,
      attendeeNotes: row.attendeeNotes,
      location: parseBookingLocation(row.locationType, row.locationData),
      customResponses: parseStoredBookingCustomResponses(row.customResponses),
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
