import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NotificationJob } from "@prisma/client";
import { NotificationStatus, NotificationType } from "@prisma/client";
import { PrismaService } from "../shared/prisma/prisma.service";
import { EMAIL_PROVIDER, type EmailProvider } from "./interfaces/email-provider.interface";
import {
  renderBookingCancelledAttendee,
  renderBookingCancelledHost,
  renderBookingConfirmedAttendee,
  renderBookingConfirmedHost,
  type SnapshotPayload,
} from "./templates/email-templates";

@Injectable()
export class NotificationsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("NotificationsProcessor");
  private intervalTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider
  ) {
    this.appUrl = this.config.get<string>("APP_URL", "http://localhost:3000");
  }

  onModuleInit() {
    const isTest = process.env.NODE_ENV === "test";
    if (!isTest) {
      // Sweep every 3 seconds in dev/prod
      this.intervalTimer = setInterval(() => {
        void this.processPendingJobs().catch((err) => {
          this.logger.error("Error in scheduled notification sweep", err);
        });
      }, 3000);
      this.logger.log("Notification background processor initialized.");
    }
  }

  onModuleDestroy() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Recovers jobs that were left in PROCESSING state due to a worker crash or timeout.
   */
  async recoverStaleJobs(staleMinutes = 5): Promise<number> {
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

    const result = await this.prisma.notificationJob.updateMany({
      where: {
        status: NotificationStatus.PROCESSING,
        lockedAt: { lt: cutoff },
      },
      data: {
        status: NotificationStatus.PENDING,
        lockedAt: null,
        lastError: "Worker timeout: stale processing lock recovered",
      },
    });

    if (result.count > 0) {
      this.logger.warn(`Recovered ${result.count} stale PROCESSING notification jobs.`);
    }

    return result.count;
  }

  /**
   * Concurrency-safe job claiming using PostgreSQL SKIP LOCKED.
   */
  async claimPendingJobs(limit = 10): Promise<NotificationJob[]> {
    const claimedRows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM notification_jobs
      WHERE status = 'PENDING'::"NotificationStatus"
        AND next_run_at <= NOW()
      ORDER BY next_run_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED;
    `;

    if (!claimedRows || claimedRows.length === 0) {
      return [];
    }

    const ids = claimedRows.map((r) => r.id);

    await this.prisma.notificationJob.updateMany({
      where: { id: { in: ids } },
      data: {
        status: NotificationStatus.PROCESSING,
        lockedAt: new Date(),
      },
    });

    return this.prisma.notificationJob.findMany({
      where: { id: { in: ids } },
    });
  }

  /**
   * Main worker execution method.
   */
  async processPendingJobs(limit = 10): Promise<{ processed: number; success: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, success: 0, failed: 0 };
    }

    this.isProcessing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      // Step 1: Recover any stale locks
      await this.recoverStaleJobs(5);

      // Step 2: Claim batch of pending jobs
      const jobs = await this.claimPendingJobs(limit);

      for (const job of jobs) {
        try {
          await this.deliverJob(job);
          successCount++;
        } catch (deliveryErr) {
          failedCount++;
          await this.handleJobFailure(job, deliveryErr);
        }
      }

      return {
        processed: jobs.length,
        success: successCount,
        failed: failedCount,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  private async deliverJob(job: NotificationJob): Promise<void> {
    const snapshot = job.payload as unknown as SnapshotPayload;
    let subject = "";
    let html = "";
    let text = "";
    let attachments: Array<{ filename: string; content: string; contentType: string }> | undefined;

    switch (job.type) {
      case NotificationType.BOOKING_CONFIRMED_ATTENDEE: {
        const rendered = renderBookingConfirmedAttendee(snapshot, this.appUrl);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;

        // Generate attached .ics calendar invite
        const ics = this.buildIcsContent(snapshot);
        attachments = [
          {
            filename: `${snapshot.eventSlug}-${snapshot.bookingId.slice(0, 8)}.ics`,
            content: ics,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ];
        break;
      }
      case NotificationType.BOOKING_CONFIRMED_HOST: {
        const rendered = renderBookingConfirmedHost(snapshot, this.appUrl);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
        break;
      }
      case NotificationType.BOOKING_CANCELLED_ATTENDEE: {
        const rendered = renderBookingCancelledAttendee(snapshot, this.appUrl);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
        break;
      }
      case NotificationType.BOOKING_CANCELLED_HOST: {
        const rendered = renderBookingCancelledHost(snapshot, this.appUrl);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
        break;
      }
      default:
        throw new Error(`Unknown notification type: ${job.type}`);
    }

    // Deliver through configured provider with idempotency key
    await this.emailProvider.send({
      to: job.recipientEmail,
      subject,
      html,
      text,
      attachments,
      idempotencyKey: job.idempotencyKey,
    });

    // Mark as SENT
    await this.prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    });

    this.logger.log(`Delivered notification job ${job.id} (${job.type}) to ${job.recipientEmail}`);
  }

  private async handleJobFailure(job: NotificationJob, err: unknown): Promise<void> {
    const attempts = job.attempts + 1;
    const isExhausted = attempts >= job.maxAttempts;
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Exponential backoff: 2s, 4s, 8s... up to 60s
    const backoffMs = Math.min(60000, 2 ** attempts * 2000);
    const nextRunAt = new Date(Date.now() + backoffMs);

    await this.prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: isExhausted ? NotificationStatus.FAILED : NotificationStatus.PENDING,
        attempts,
        nextRunAt: isExhausted ? job.nextRunAt : nextRunAt,
        lockedAt: null,
        lastError: errorMsg,
      },
    });

    this.logger.error(
      `Notification job ${job.id} failed (attempt ${attempts}/${job.maxAttempts}). ` +
        (isExhausted ? "Max attempts exceeded; marked as FAILED." : `Scheduled retry at ${nextRunAt.toISOString()}`)
    );
  }

  private buildIcsContent(snapshot: SnapshotPayload): string {
    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };

    const startFormatted = formatIcsDate(new Date(snapshot.startUtc));
    const endFormatted = formatIcsDate(new Date(snapshot.endUtc));
    const nowFormatted = formatIcsDate(new Date());

    const summary = `${snapshot.eventTitle} with ${snapshot.hostName}`;
    const description = `Meeting between ${snapshot.hostName} and ${snapshot.attendeeName}\\n\\nNotes: ${
      snapshot.attendeeNotes || "None"
    }`;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sched//Calendar Meeting Engine//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${snapshot.bookingId}@sched.com`,
      `DTSTAMP:${nowFormatted}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:${snapshot.status === "CONFIRMED" ? "CONFIRMED" : "CANCELLED"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    return lines.join("\r\n");
  }
}
