import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { NotificationType, NotificationStatus, BookingActor, LocationType } from "@prisma/client";
import type { SnapshotPayload } from "./templates/email-templates";

export interface BookingWithDetails {
  id: string;
  eventTypeId: string;
  hostId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  sequence: number;
  tokenVersion: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeeTimeZone: string;
  attendeePhoneNumber?: string | null;
  attendeeNotes?: string | null;
  locationType?: LocationType | null;
  locationData?: unknown | null;
  customResponses?: unknown | null;
  cancellationReason?: string | null;
  cancelledBy?: BookingActor | null;
  previousStartTime?: Date | null;
  previousEndTime?: Date | null;
  rescheduleReason?: string | null;
  rescheduledBy?: BookingActor | null;
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
    email: string;
    timezone: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger("NotificationsService");

  private buildSnapshot(booking: BookingWithDetails): SnapshotPayload {
    return {
      bookingId: booking.id,
      eventTypeId: booking.eventType.id,
      eventTitle: booking.eventType.title,
      eventSlug: booking.eventType.slug,
      durationMinutes: booking.eventType.durationMinutes,
      hostId: booking.host.id,
      hostName: booking.host.name,
      hostUsername: booking.host.username,
      hostEmail: booking.host.email,
      hostTimeZone: booking.host.timezone,
      attendeeName: booking.attendeeName,
      attendeeEmail: booking.attendeeEmail,
      attendeeTimeZone: booking.attendeeTimeZone,
      attendeePhoneNumber: booking.attendeePhoneNumber ?? null,
      attendeeNotes: booking.attendeeNotes ?? "",
      locationType: booking.locationType ?? null,
      locationData: (booking.locationData as Record<string, unknown>) ?? null,
      customResponses: (booking.customResponses as SnapshotPayload["customResponses"]) ?? null,
      startUtc: booking.startTime.toISOString(),
      endUtc: booking.endTime.toISOString(),
      status: booking.status,
      sequence: booking.sequence,
      tokenVersion: booking.tokenVersion,
      cancellationReason: booking.cancellationReason ?? null,
      cancelledBy: booking.cancelledBy ?? null,
      previousStartUtc: booking.previousStartTime ? booking.previousStartTime.toISOString() : null,
      previousEndUtc: booking.previousEndTime ? booking.previousEndTime.toISOString() : null,
      rescheduleReason: booking.rescheduleReason ?? null,
      rescheduledBy: booking.rescheduledBy ?? null,
    };
  }

  async enqueueConfirmationJobsInTx(
    tx: Prisma.TransactionClient,
    booking: BookingWithDetails
  ): Promise<void> {
    const snapshot = this.buildSnapshot(booking);

    // 1. Attendee confirmation job
    await tx.notificationJob.upsert({
      where: { idempotencyKey: `booking:${booking.id}:confirmed:${booking.sequence}:attendee` },
      update: {},
      create: {
        bookingId: booking.id,
        idempotencyKey: `booking:${booking.id}:confirmed:${booking.sequence}:attendee`,
        type: NotificationType.BOOKING_CONFIRMED_ATTENDEE,
        recipientEmail: booking.attendeeEmail,
        status: NotificationStatus.PENDING,
        payload: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // 2. Host new booking alert job
    await tx.notificationJob.upsert({
      where: { idempotencyKey: `booking:${booking.id}:confirmed:${booking.sequence}:host` },
      update: {},
      create: {
        bookingId: booking.id,
        idempotencyKey: `booking:${booking.id}:confirmed:${booking.sequence}:host`,
        type: NotificationType.BOOKING_CONFIRMED_HOST,
        recipientEmail: booking.host.email,
        status: NotificationStatus.PENDING,
        payload: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Enqueued confirmation outbox jobs for booking ${booking.id} (sequence ${booking.sequence})`);
  }

  async enqueueRescheduleJobsInTx(
    tx: Prisma.TransactionClient,
    booking: BookingWithDetails
  ): Promise<void> {
    const snapshot = this.buildSnapshot(booking);

    // 1. Attendee reschedule notification job
    await tx.notificationJob.upsert({
      where: { idempotencyKey: `booking:${booking.id}:rescheduled:${booking.sequence}:attendee` },
      update: {},
      create: {
        bookingId: booking.id,
        idempotencyKey: `booking:${booking.id}:rescheduled:${booking.sequence}:attendee`,
        type: NotificationType.BOOKING_RESCHEDULED_ATTENDEE,
        recipientEmail: booking.attendeeEmail,
        status: NotificationStatus.PENDING,
        payload: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // 2. Host reschedule notification job
    await tx.notificationJob.upsert({
      where: { idempotencyKey: `booking:${booking.id}:rescheduled:${booking.sequence}:host` },
      update: {},
      create: {
        bookingId: booking.id,
        idempotencyKey: `booking:${booking.id}:rescheduled:${booking.sequence}:host`,
        type: NotificationType.BOOKING_RESCHEDULED_HOST,
        recipientEmail: booking.host.email,
        status: NotificationStatus.PENDING,
        payload: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Enqueued reschedule outbox jobs for booking ${booking.id} (sequence ${booking.sequence})`);
  }

  async enqueueCancellationJobsInTx(
    tx: Prisma.TransactionClient,
    booking: BookingWithDetails
  ): Promise<void> {
    const snapshot = this.buildSnapshot(booking);

    if (booking.cancelledBy === BookingActor.HOST) {
      // Host cancelled -> Notify attendee
      await tx.notificationJob.upsert({
        where: { idempotencyKey: `booking:${booking.id}:cancelled:${booking.sequence}:attendee` },
        update: {},
        create: {
          bookingId: booking.id,
          idempotencyKey: `booking:${booking.id}:cancelled:${booking.sequence}:attendee`,
          type: NotificationType.BOOKING_CANCELLED_ATTENDEE,
          recipientEmail: booking.attendeeEmail,
          status: NotificationStatus.PENDING,
          payload: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      // Attendee cancelled -> Notify host
      await tx.notificationJob.upsert({
        where: { idempotencyKey: `booking:${booking.id}:cancelled:${booking.sequence}:host` },
        update: {},
        create: {
          bookingId: booking.id,
          idempotencyKey: `booking:${booking.id}:cancelled:${booking.sequence}:host`,
          type: NotificationType.BOOKING_CANCELLED_HOST,
          recipientEmail: booking.host.email,
          status: NotificationStatus.PENDING,
          payload: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    }

    this.logger.log(`Enqueued cancellation outbox job for booking ${booking.id} (sequence ${booking.sequence})`);
  }
}
