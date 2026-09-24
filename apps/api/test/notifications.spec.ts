import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { EMAIL_PROVIDER } from "../src/notifications/interfaces/email-provider.interface";
import { DevEmailProvider } from "../src/notifications/providers/dev-email.provider";
import { NotificationsProcessor } from "../src/notifications/notifications.processor";
import { PrismaService } from "../src/shared/prisma/prisma.service";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("Notifications Subsystem Integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let processor: NotificationsProcessor;
  let devEmailProvider: DevEmailProvider;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    processor = app.get(NotificationsProcessor);
    devEmailProvider = app.get<DevEmailProvider>(EMAIL_PROVIDER as unknown as string);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    devEmailProvider.clearSentEmails();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupHostAndEvent(prefix: string) {
    const registerRes = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: `${prefix}@example.com`,
        password: "Password123!",
        name: "Dr. Notification Host",
        username: prefix,
        timezone: "America/New_York",
      });
    const cookies = registerRes.headers["set-cookie"] as unknown as string[];

    // Ensure default schedule is initialized
    await request(app.getHttpServer())
      .put("/api/v1/schedules/default")
      .set("Cookie", cookies)
      .send({
        name: "Working Hours",
        timeZone: "America/New_York",
        days: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
        ],
      });

    const eventRes = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Strategy Session",
        slug: "strategy-session",
        durationMinutes: 30,
        minimumNoticeMinutes: 0,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });

    return {
      cookies,
      hostEmail: `${prefix}@example.com`,
      username: prefix,
      eventSlug: eventRes.body.slug,
      eventId: eventRes.body.id,
    };
  }

  it("enqueues confirmation outbox jobs in same transaction and delivers with .ics attachment", async () => {
    const { username, eventSlug, hostEmail } = await setupHostAndEvent(uniqueLabel("notif-user1"));

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-12T14:00:00.000Z", // Monday 10:00 AM America/New_York
        attendeeName: "Jane Invitee",
        attendeeEmail: "jane@client.com",
        attendeeTimeZone: "Europe/London",
        attendeeNotes: "Discussing Q4 deliverables",
      });

    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.id;

    // Verify outbox records in DB (2 immediate confirmations + 2 future reminders)
    const confirmationJobs = await prisma.notificationJob.findMany({
      where: {
        bookingId,
        type: { in: ["BOOKING_CONFIRMED_ATTENDEE", "BOOKING_CONFIRMED_HOST"] },
      },
      orderBy: { type: "asc" },
    });

    expect(confirmationJobs).toHaveLength(2);
    expect(confirmationJobs.every((j) => j.status === "PENDING")).toBe(true);

    const reminderJobs = await prisma.notificationJob.findMany({
      where: {
        bookingId,
        type: { in: ["BOOKING_REMINDER_24H", "BOOKING_REMINDER_1H"] },
      },
      orderBy: { nextRunAt: "asc" },
    });
    expect(reminderJobs).toHaveLength(2);
    expect(reminderJobs.every((j) => j.status === "PENDING")).toBe(true);
    // 24h reminder is 2026-10-11 14:00:00
    expect(reminderJobs[0]?.nextRunAt.toISOString()).toBe("2026-10-11T14:00:00.000Z");
    // 1h reminder is 2026-10-12 13:00:00
    expect(reminderJobs[1]?.nextRunAt.toISOString()).toBe("2026-10-12T13:00:00.000Z");

    // Run processor worker sweep (only processes jobs with next_run_at <= NOW)
    const result = await processor.processPendingJobs();
    expect(result.processed).toBe(2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);

    // Check sent emails in Dev provider
    const sent = devEmailProvider.getSentEmails();
    expect(sent).toHaveLength(2);

    const attendeeEmail = sent.find((e) => e.to === "jane@client.com");
    expect(attendeeEmail).toBeDefined();
    expect(attendeeEmail?.subject).toContain("Confirmed: Strategy Session");
    expect(attendeeEmail?.html).toContain("Europe/London");
    expect(attendeeEmail?.attachments).toHaveLength(1);
    const attachment = attendeeEmail?.attachments?.[0];
    expect(attachment?.filename).toContain(".ics");
    expect(attachment?.content).toContain("BEGIN:VCALENDAR");
    expect(attachment?.content).toContain(`UID:${bookingId}@sched.com`);

    const hostEmailRecord = sent.find((e) => e.to === hostEmail);
    expect(hostEmailRecord).toBeDefined();
    expect(hostEmailRecord?.subject).toContain("New Booking: Jane Invitee");
    expect(hostEmailRecord?.html).toContain("Discussing Q4 deliverables");

    // Confirmation DB status updated to SENT
    const updatedConfirmationJobs = await prisma.notificationJob.findMany({
      where: {
        bookingId,
        type: { in: ["BOOKING_CONFIRMED_ATTENDEE", "BOOKING_CONFIRMED_HOST"] },
      },
    });
    expect(updatedConfirmationJobs.every((j) => j.status === "SENT")).toBe(true);
    expect(updatedConfirmationJobs.every((j) => j.sentAt !== null)).toBe(true);
  });

  it("enqueues and delivers cancellation notification to attendee when host cancels", async () => {
    const { username, eventSlug, cookies } = await setupHostAndEvent(uniqueLabel("notif-user2"));

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-13T14:00:00.000Z",
        attendeeName: "Bob Smith",
        attendeeEmail: "bob@acme.com",
        attendeeTimeZone: "America/Los_Angeles",
      });

    const bookingId = bookRes.body.id;

    // Process initial confirmation jobs
    await processor.processPendingJobs();
    devEmailProvider.clearSentEmails();

    // Host cancels booking with reason
    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set("Cookie", cookies)
      .send({ expectedSequence: 0, reason: "Scheduling conflict with board meeting" });

    expect(cancelRes.status).toBe(200);

    // Outbox should have cancel job
    const cancelJobs = await prisma.notificationJob.findMany({
      where: { bookingId, type: "BOOKING_CANCELLED_ATTENDEE" },
    });
    expect(cancelJobs).toHaveLength(1);
    expect(cancelJobs[0]?.status).toBe("PENDING");

    // Deliver
    await processor.processPendingJobs();

    const sent = devEmailProvider.getSentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("bob@acme.com");
    expect(sent[0]?.subject).toContain("Cancelled: Strategy Session");
    expect(sent[0]?.html).toContain("Scheduling conflict with board meeting");
  });

  it("enqueues and delivers cancellation notification to host when attendee cancels", async () => {
    const { username, eventSlug, hostEmail } = await setupHostAndEvent(uniqueLabel("notif-user3"));

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-14T14:00:00.000Z",
        attendeeName: "Alice Walker",
        attendeeEmail: "alice@walker.com",
        attendeeTimeZone: "UTC",
      });

    const bookingId = bookRes.body.id;
    const manageToken = bookRes.body.manageToken;
    await processor.processPendingJobs();
    devEmailProvider.clearSentEmails();

    // Attendee cancels booking
    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/v1/public/bookings/${bookingId}/cancel`)
      .set("x-booking-token", manageToken)
      .send({ expectedSequence: 0, reason: "Feeling unwell, will reschedule soon" });

    expect(cancelRes.status).toBe(200);

    // Deliver
    await processor.processPendingJobs();

    const sent = devEmailProvider.getSentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(hostEmail);
    expect(sent[0]?.subject).toContain("Booking Cancelled: Alice Walker");
    expect(sent[0]?.html).toContain("Feeling unwell, will reschedule soon");
  });

  it("is idempotent and handles concurrent worker claims with SKIP LOCKED", async () => {
    const { username, eventSlug } = await setupHostAndEvent(uniqueLabel("notif-user4"));

    await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-15T14:00:00.000Z",
        attendeeName: "Concurrent Tester",
        attendeeEmail: "concurrent@test.com",
        attendeeTimeZone: "UTC",
      });

    // Run two workers simultaneously
    const [res1, res2] = await Promise.all([
      processor.processPendingJobs(10),
      processor.processPendingJobs(10),
    ]);

    // Total processed between both workers must be exactly 2 (no double-processing)
    expect(res1.processed + res2.processed).toBe(2);
    expect(devEmailProvider.getSentEmails()).toHaveLength(2);

    // Re-running produces 0 jobs
    const thirdPass = await processor.processPendingJobs(10);
    expect(thirdPass.processed).toBe(0);
  });

  it("recovers stale PROCESSING jobs if a worker crashes", async () => {
    const { username, eventSlug } = await setupHostAndEvent(uniqueLabel("notif-user5"));

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-16T14:00:00.000Z",
        attendeeName: "Stale Lock Tester",
        attendeeEmail: "stale@test.com",
        attendeeTimeZone: "UTC",
      });

    const bookingId = bookRes.body.id;

    // Artificially simulate a crashed worker leaving jobs in PROCESSING with lockedAt 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.notificationJob.updateMany({
      where: { bookingId },
      data: {
        status: "PROCESSING",
        lockedAt: tenMinutesAgo,
      },
    });

    const recoveredCount = await processor.recoverStaleJobs(5);
    expect(recoveredCount).toBe(4);

    const jobsAfterRecovery = await prisma.notificationJob.findMany({ where: { bookingId } });
    expect(jobsAfterRecovery.every((j) => j.status === "PENDING")).toBe(true);

    // Successfully deliver after recovery (2 confirmation jobs with nextRunAt <= NOW)
    const sweep = await processor.processPendingJobs();
    expect(sweep.processed).toBe(2);
    expect(sweep.success).toBe(2);
  });

  it("cancels pending reminder jobs when a booking is cancelled", async () => {
    const { username, eventSlug, cookies } = await setupHostAndEvent(uniqueLabel("notif-user6"));

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-20T14:00:00.000Z",
        attendeeName: "Reminder Cancel Test",
        attendeeEmail: "remind-cancel@example.com",
        attendeeTimeZone: "America/New_York",
      });

    const bookingId = bookRes.body.id;

    // Verify reminders are scheduled in PENDING
    const pendingRemindersBefore = await prisma.notificationJob.findMany({
      where: {
        bookingId,
        type: { in: ["BOOKING_REMINDER_24H", "BOOKING_REMINDER_1H"] },
      },
    });
    expect(pendingRemindersBefore).toHaveLength(2);
    expect(pendingRemindersBefore.every((j) => j.status === "PENDING")).toBe(true);

    // Cancel booking
    await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set("Cookie", cookies)
      .send({ expectedSequence: 0, reason: "Host cancelled" });

    // Verify reminders were updated to CANCELLED
    const cancelledReminders = await prisma.notificationJob.findMany({
      where: {
        bookingId,
        type: { in: ["BOOKING_REMINDER_24H", "BOOKING_REMINDER_1H"] },
      },
    });
    expect(cancelledReminders).toHaveLength(2);
    expect(cancelledReminders.every((j) => j.status === "CANCELLED")).toBe(true);
  });

  it("cancels old reminders and enqueues updated reminders when booking is rescheduled", async () => {
    const { username, eventSlug, cookies } = await setupHostAndEvent(uniqueLabel("notif-user7"));

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-20T14:00:00.000Z", // Tuesday
        attendeeName: "Reminder Reschedule Test",
        attendeeEmail: "remind-resched@example.com",
        attendeeTimeZone: "America/New_York",
      });

    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.id;

    // Reschedule to a new time: 2026-10-22 15:00:00 UTC (Thursday)
    const reschedRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/reschedule`)
      .set("Cookie", cookies)
      .send({
        startUtc: "2026-10-22T15:00:00.000Z",
        expectedSequence: 0,
        reason: "Adjusting to new time",
      });

    expect(reschedRes.status).toBe(200);

    // Old sequence 0 reminders should be CANCELLED
    const seq0Reminders = await prisma.notificationJob.findMany({
      where: {
        bookingId,
        type: { in: ["BOOKING_REMINDER_24H", "BOOKING_REMINDER_1H"] },
        status: "CANCELLED",
      },
    });
    expect(seq0Reminders).toHaveLength(2);

    // New sequence 1 reminders should be PENDING with new nextRunAt
    const seq1Reminders = await prisma.notificationJob.findMany({
      where: {
        bookingId,
        type: { in: ["BOOKING_REMINDER_24H", "BOOKING_REMINDER_1H"] },
        status: "PENDING",
      },
      orderBy: { nextRunAt: "asc" },
    });
    expect(seq1Reminders).toHaveLength(2);
    expect(seq1Reminders[0]?.nextRunAt.toISOString()).toBe("2026-10-21T15:00:00.000Z"); // 24h prior
    expect(seq1Reminders[1]?.nextRunAt.toISOString()).toBe("2026-10-22T14:00:00.000Z"); // 1h prior
  });

  it("delivers reminder notification when nextRunAt is reached", async () => {
    const { username, eventSlug } = await setupHostAndEvent(uniqueLabel("notif-user8"));

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${username}/${eventSlug}/book`)
      .send({
        startUtc: "2026-10-26T14:00:00.000Z", // Monday 10:00 AM America/New_York
        attendeeName: "Due Reminder Tester",
        attendeeEmail: "due-reminder@example.com",
        attendeeTimeZone: "America/New_York",
      });

    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.id;

    // Clear confirmation emails
    await processor.processPendingJobs();
    devEmailProvider.clearSentEmails();

    // Fast-forward 24h reminder job nextRunAt to the past so it becomes claimable
    await prisma.notificationJob.updateMany({
      where: {
        bookingId,
        type: "BOOKING_REMINDER_24H",
      },
      data: {
        nextRunAt: new Date(Date.now() - 1000), // 1 second ago
      },
    });

    // Run processor
    const sweep = await processor.processPendingJobs();
    expect(sweep.processed).toBe(1);
    expect(sweep.success).toBe(1);

    const sent = devEmailProvider.getSentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("due-reminder@example.com");
    expect(sent[0]?.subject).toContain("Reminder: Strategy Session");
    expect(sent[0]?.subject).toContain("in 24 hours");
    expect(sent[0]?.html).toContain("Upcoming Meeting Reminder");
    expect(sent[0]?.html).toContain("Due Reminder Tester");
  });
});
