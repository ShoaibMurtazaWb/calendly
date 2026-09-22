import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { NotificationType, NotificationStatus } from "@prisma/client";
import type { SnapshotPayload } from "./templates/email-templates";

export interface BookingWithDetails {
  id: string;
  eventTypeId: string;
  hostId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeTimeZone: string;
  attendeeNotes?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
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
      attendeeNotes: booking.attendeeNotes ?? "",
      startUtc: booking.startTime.toISOString(),
      endUtc: booking.endTime.toISOString(),
      status: booking.status,
      cancellationReason: booking.cancellationReason ?? null,
      cancelledBy: booking.cancelledBy ?? null,
    };
  }

  async enqueueConfirmationJobsInTx(
    tx: Prisma.TransactionClient,
    booking: BookingWithDetails
  ): Promise<void> {
    const snapshot = this.buildSnapshot(booking);

    // 1. Attendee confirmation job
    await tx.notificationJob.upsert({
      where: { idempotencyKey: `booking:${booking.id}:confirmed:attendee` },
      update: {},
      create: {
        bookingId: booking.id,
        idempotencyKey: `booking:${booking.id}:confirmed:attendee`,
        type: NotificationType.BOOKING_CONFIRMED_ATTENDEE,
        recipientEmail: booking.attendeeEmail,
        status: NotificationStatus.PENDING,
        payload: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    // 2. Host new booking alert job
    await tx.notificationJob.upsert({
      where: { idempotencyKey: `booking:${booking.id}:confirmed:host` },
      update: {},
      create: {
        bookingId: booking.id,
        idempotencyKey: `booking:${booking.id}:confirmed:host`,
        type: NotificationType.BOOKING_CONFIRMED_HOST,
        recipientEmail: booking.host.email,
        status: NotificationStatus.PENDING,
        payload: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.debug(`Enqueued confirmation jobs in tx for booking ${booking.id}`);
  }

  async enqueueCancellationJobInTx(
    tx: Prisma.TransactionClient,
    booking: BookingWithDetails,
    cancelledBy: "HOST" | "ATTENDEE",
    reason?: string | null
  ): Promise<void> {
    const snapshot = this.buildSnapshot({
      ...booking,
      cancelledBy,
      cancellationReason: reason,
    });

    if (cancelledBy === "HOST") {
      // Host cancelled -> Notify attendee
      await tx.notificationJob.upsert({
        where: { idempotencyKey: `booking:${booking.id}:cancelled:HOST:attendee` },
        update: {},
        create: {
          bookingId: booking.id,
          idempotencyKey: `booking:${booking.id}:cancelled:HOST:attendee`,
          type: NotificationType.BOOKING_CANCELLED_ATTENDEE,
          recipientEmail: booking.attendeeEmail,
          status: NotificationStatus.PENDING,
          payload: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      // Attendee cancelled -> Notify host
      await tx.notificationJob.upsert({
        where: { idempotencyKey: `booking:${booking.id}:cancelled:ATTENDEE:host` },
        update: {},
        create: {
          bookingId: booking.id,
          idempotencyKey: `booking:${booking.id}:cancelled:ATTENDEE:host`,
          type: NotificationType.BOOKING_CANCELLED_HOST,
          recipientEmail: booking.host.email,
          status: NotificationStatus.PENDING,
          payload: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    }

    this.logger.debug(`Enqueued cancellation job in tx for booking ${booking.id} (by ${cancelledBy})`);
  }
}
