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

    // Verify outbox records in DB
    const jobs = await prisma.notificationJob.findMany({
      where: { bookingId },
      orderBy: { type: "asc" },
    });

    expect(jobs).toHaveLength(2);
    expect(jobs.some((j) => j.type === "BOOKING_CONFIRMED_ATTENDEE")).toBe(true);
    expect(jobs.some((j) => j.type === "BOOKING_CONFIRMED_HOST")).toBe(true);
    expect(jobs.every((j) => j.status === "PENDING")).toBe(true);

    // Run processor worker sweep
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

    // DB status updated to SENT
    const updatedJobs = await prisma.notificationJob.findMany({ where: { bookingId } });
    expect(updatedJobs.every((j) => j.status === "SENT")).toBe(true);
    expect(updatedJobs.every((j) => j.sentAt !== null)).toBe(true);
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
      .send({ reason: "Scheduling conflict with board meeting" });

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
    await processor.processPendingJobs();
    devEmailProvider.clearSentEmails();

    // Attendee cancels booking
    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/v1/public/bookings/${bookingId}/cancel`)
      .send({ reason: "Feeling unwell, will reschedule soon" });

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
    expect(recoveredCount).toBe(2);

    const jobsAfterRecovery = await prisma.notificationJob.findMany({ where: { bookingId } });
    expect(jobsAfterRecovery.every((j) => j.status === "PENDING")).toBe(true);

    // Successfully deliver after recovery
    const sweep = await processor.processPendingJobs();
    expect(sweep.processed).toBe(2);
    expect(sweep.success).toBe(2);
  });
});
