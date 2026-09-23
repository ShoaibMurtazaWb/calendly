import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { EMAIL_PROVIDER } from "../src/notifications/interfaces/email-provider.interface";
import { DevEmailProvider } from "../src/notifications/providers/dev-email.provider";
import { NotificationsProcessor } from "../src/notifications/notifications.processor";
import { PrismaService } from "../src/shared/prisma/prisma.service";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("Step 4.5: Custom Booking Questions", () => {
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

  async function setupHost(label: string) {
    const email = `${label}@example.com`;
    const password = "Password123!";
    const username = label;

    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password,
        name: `Host ${label}`,
        username,
        timezone: "America/New_York",
      });

    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password });

    const cookies = loginRes.headers["set-cookie"] as unknown as string[];
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    // Create default schedule for 09:00 - 17:00 Monday - Friday
    const schedule = await prisma.schedule.create({
      data: {
        userId: user.id,
        name: "Working Hours",
        timeZone: "America/New_York",
        isDefault: true,
      },
    });

    for (let day = 1; day <= 5; day++) {
      await prisma.scheduleDay.create({
        data: {
          scheduleId: schedule.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
        },
      });
    }

    return { user, cookies, email, username };
  }

  describe("1. Question Definition & Configuration Invariants", () => {
    it("generates stable server IDs for newly created questions and options", async () => {
      const host = await setupHost(uniqueLabel("q-host1"));

      const res = await request(app.getHttpServer())
        .post("/api/v1/event-types")
        .set("Cookie", host.cookies)
        .send({
          title: "Strategy Session",
          slug: "strategy-session",
          durationMinutes: 30,
          location: {
            type: "STATIC_VIDEO",
            data: { url: "https://meet.google.com/abc-defg-hij" },
          },
          customQuestions: [
            {
              type: "TEXT",
              label: "What is your primary goal?",
              required: true,
              placeholder: "e.g. Discuss Q4 goals",
            },
            {
              type: "SELECT",
              label: "How did you hear about us?",
              required: false,
              options: [
                { label: "Twitter / X" },
                { label: "Colleague Referral" },
                { label: "Search Engine" },
              ],
            },
            {
              type: "CHECKBOX",
              label: "I agree to bring preparatory materials",
              required: true,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.customQuestions).toHaveLength(3);

      const [qText, qSelect, qCheckbox] = res.body.customQuestions;
      expect(qText.id).toBeDefined();
      expect(qText.id.length).toBeGreaterThan(0);
      expect(qText.type).toBe("TEXT");
      expect(qText.required).toBe(true);

      expect(qSelect.id).toBeDefined();
      expect(qSelect.type).toBe("SELECT");
      expect(qSelect.options).toHaveLength(3);
      expect(qSelect.options[0].id).toBeDefined();
      expect(qSelect.options[0].label).toBe("Twitter / X");

      expect(qCheckbox.id).toBeDefined();
      expect(qCheckbox.type).toBe("CHECKBOX");
      expect(qCheckbox.required).toBe(true);
    });

    it("rejects SELECT questions with fewer than 2 options", async () => {
      const host = await setupHost(uniqueLabel("q-host2"));

      const res = await request(app.getHttpServer())
        .post("/api/v1/event-types")
        .set("Cookie", host.cookies)
        .send({
          title: "Invalid Select Event",
          slug: "invalid-select",
          durationMinutes: 30,
          location: {
            type: "STATIC_VIDEO",
            data: { url: "https://meet.google.com/abc-defg-hij" },
          },
          customQuestions: [
            {
              type: "SELECT",
              label: "Single Option Select",
              options: [{ label: "Only One Option" }],
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    it("preserves IDs across edits and rejects duplicate question or option IDs", async () => {
      const host = await setupHost(uniqueLabel("q-host3"));

      const createRes = await request(app.getHttpServer())
        .post("/api/v1/event-types")
        .set("Cookie", host.cookies)
        .send({
          title: "Editing Questions",
          slug: "editing-questions",
          durationMinutes: 30,
          location: {
            type: "STATIC_VIDEO",
            data: { url: "https://meet.google.com/abc-defg-hij" },
          },
          customQuestions: [
            {
              type: "TEXT",
              label: "Original Label",
              required: false,
            },
          ],
        });

      expect(createRes.status).toBe(201);
      const originalQId = createRes.body.customQuestions[0].id;

      // Update question label while preserving ID
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/event-types/${createRes.body.id}`)
        .set("Cookie", host.cookies)
        .send({
          customQuestions: [
            {
              id: originalQId,
              type: "TEXT",
              label: "Updated Label",
              required: true,
            },
          ],
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.customQuestions[0].id).toBe(originalQId);
      expect(updateRes.body.customQuestions[0].label).toBe("Updated Label");
      expect(updateRes.body.customQuestions[0].required).toBe(true);

      // Attempt update with duplicate question IDs
      const duplicateRes = await request(app.getHttpServer())
        .patch(`/api/v1/event-types/${createRes.body.id}`)
        .set("Cookie", host.cookies)
        .send({
          customQuestions: [
            { id: "duplicate_id", type: "TEXT", label: "Q1" },
            { id: "duplicate_id", type: "TEXT", label: "Q2" },
          ],
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.error.code).toBe("DUPLICATE_QUESTION_ID");
    });
  });

  describe("2. Booking Submission Validation Boundary", () => {
    async function setupEventWithQuestions() {
      const host = await setupHost(uniqueLabel("q-booking-host"));

      const eventRes = await request(app.getHttpServer())
        .post("/api/v1/event-types")
        .set("Cookie", host.cookies)
        .send({
          title: "Technical Discovery",
          slug: "tech-discovery",
          durationMinutes: 30,
          location: {
            type: "STATIC_VIDEO",
            data: { url: "https://meet.google.com/test-room" },
          },
          customQuestions: [
            {
              type: "TEXT",
              label: "Company Name",
              required: true,
            },
            {
              type: "TEXTAREA",
              label: "Detailed Architecture Overview",
              required: false,
            },
            {
              type: "SELECT",
              label: "Cloud Provider",
              required: true,
              options: [
                { label: "AWS" },
                { label: "Google Cloud" },
                { label: "Azure" },
              ],
            },
            {
              type: "CHECKBOX",
              label: "I confirm NDA compliance",
              required: true,
            },
          ],
        });

      const event = eventRes.body;
      const [qCompany, qArch, qCloud, qNda] = event.customQuestions;
      const optAws = qCloud.options[0].id;
      const optGcp = qCloud.options[1].id;

      return { host, event, qCompany, qArch, qCloud, qNda, optAws, optGcp };
    }

    it("rejects unknown question IDs in booking submission", async () => {
      const { host, event, qCompany, qCloud, optAws, qNda } = await setupEventWithQuestions();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/${event.slug}/book`)
        .send({
          startUtc: "2026-10-15T14:00:00.000Z",
          attendeeName: "Alice Walker",
          attendeeEmail: "alice@example.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [qCompany.id]: "Acme Corp",
            [qCloud.id]: optAws,
            [qNda.id]: true,
            unknown_random_id: "Sneaky payload",
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("UNKNOWN_QUESTION");
    });

    it("rejects missing or whitespace-only required responses", async () => {
      const { host, event, qCompany, qCloud, optAws, qNda } = await setupEventWithQuestions();

      // Missing required company name
      const missingRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/${event.slug}/book`)
        .send({
          startUtc: "2026-10-15T14:00:00.000Z",
          attendeeName: "Alice Walker",
          attendeeEmail: "alice@example.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [qCloud.id]: optAws,
            [qNda.id]: true,
          },
        });

      expect(missingRes.status).toBe(400);
      expect(missingRes.body.error.code).toBe("REQUIRED_QUESTION_MISSING");

      // Whitespace only company name
      const whitespaceRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/${event.slug}/book`)
        .send({
          startUtc: "2026-10-15T14:00:00.000Z",
          attendeeName: "Alice Walker",
          attendeeEmail: "alice@example.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [qCompany.id]: "     ",
            [qCloud.id]: optAws,
            [qNda.id]: true,
          },
        });

      expect(whitespaceRes.status).toBe(400);
      expect(whitespaceRes.body.error.code).toBe("REQUIRED_QUESTION_MISSING");

      // Required checkbox set to false
      const falseCheckboxRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/${event.slug}/book`)
        .send({
          startUtc: "2026-10-15T14:00:00.000Z",
          attendeeName: "Alice Walker",
          attendeeEmail: "alice@example.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [qCompany.id]: "Acme Corp",
            [qCloud.id]: optAws,
            [qNda.id]: false,
          },
        });

      expect(falseCheckboxRes.status).toBe(400);
      expect(falseCheckboxRes.body.error.code).toBe("REQUIRED_QUESTION_MISSING");
    });

    it("rejects invalid select option IDs", async () => {
      const { host, event, qCompany, qCloud, qNda } = await setupEventWithQuestions();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/${event.slug}/book`)
        .send({
          startUtc: "2026-10-15T14:00:00.000Z",
          attendeeName: "Alice Walker",
          attendeeEmail: "alice@example.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [qCompany.id]: "Acme Corp",
            [qCloud.id]: "non_existent_option_id",
            [qNda.id]: true,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_OPTION");
    });

    it("successfully creates self-contained snapshot with resolved option label", async () => {
      const { host, event, qCompany, qArch, qCloud, optGcp, qNda } = await setupEventWithQuestions();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/${event.slug}/book`)
        .send({
          startUtc: "2026-10-15T14:00:00.000Z",
          attendeeName: "Bob Smith",
          attendeeEmail: "bob@smith.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [qCompany.id]: "Smith Enterprises",
            [qArch.id]: "Microservices deployed on Kubernetes with PostgreSQL",
            [qCloud.id]: optGcp,
            [qNda.id]: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.customResponses).toHaveLength(4);

      const [rCompany, rArch, rCloud, rNda] = res.body.customResponses;
      expect(rCompany.questionId).toBe(qCompany.id);
      expect(rCompany.label).toBe("Company Name");
      expect(rCompany.value).toBe("Smith Enterprises");

      expect(rArch.questionId).toBe(qArch.id);
      expect(rArch.value).toBe("Microservices deployed on Kubernetes with PostgreSQL");

      expect(rCloud.questionId).toBe(qCloud.id);
      expect(rCloud.label).toBe("Cloud Provider");
      expect(rCloud.value).toBe(optGcp);
      expect(rCloud.selectedOptionLabel).toBe("Google Cloud");

      expect(rNda.questionId).toBe(qNda.id);
      expect(rNda.value).toBe(true);
    });
  });

  describe("3. Snapshot Isolation & Immutability", () => {
    it("preserves booking custom responses when EventType questions are updated or deleted", async () => {
      const host = await setupHost(uniqueLabel("q-isolation-host"));

      // 1. Create event type with initial questions
      const createEventRes = await request(app.getHttpServer())
        .post("/api/v1/event-types")
        .set("Cookie", host.cookies)
        .send({
          title: "Advisory Call",
          slug: "advisory-call",
          durationMinutes: 30,
          location: {
            type: "STATIC_VIDEO",
            data: { url: "https://meet.google.com/test-room" },
          },
          customQuestions: [
            {
              type: "TEXT",
              label: "Original Question 1",
              required: true,
            },
          ],
        });

      const q1Id = createEventRes.body.customQuestions[0].id;

      // 2. Attendee books slot
      const bookRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/advisory-call/book`)
        .send({
          startUtc: "2026-10-15T15:00:00.000Z",
          attendeeName: "Charlie Brown",
          attendeeEmail: "charlie@peanuts.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [q1Id]: "Historical Answer Value",
          },
        });

      expect(bookRes.status).toBe(201);
      const bookingId = bookRes.body.id;
      const manageToken = bookRes.body.manageToken;

      // 3. Host updates EventType: completely replaces questions with a new question
      await request(app.getHttpServer())
        .patch(`/api/v1/event-types/${createEventRes.body.id}`)
        .set("Cookie", host.cookies)
        .send({
          customQuestions: [
            {
              type: "TEXT",
              label: "Brand New Question 2",
              required: true,
            },
          ],
        });

      // 4. Retrieve booking details via capability token
      const bookingDetailsRes = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${bookingId}`)
        .set("x-booking-token", manageToken);

      expect(bookingDetailsRes.status).toBe(200);
      expect(bookingDetailsRes.body.customResponses).toHaveLength(1);
      expect(bookingDetailsRes.body.customResponses[0].questionId).toBe(q1Id);
      expect(bookingDetailsRes.body.customResponses[0].label).toBe("Original Question 1");
      expect(bookingDetailsRes.body.customResponses[0].value).toBe("Historical Answer Value");

      // 5. Reschedule booking -> responses remain intact
      const rescheduleRes = await request(app.getHttpServer())
        .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
        .set("x-booking-token", manageToken)
        .send({
          startUtc: "2026-10-15T16:00:00.000Z",
          expectedSequence: 0,
        });

      expect(rescheduleRes.status).toBe(200);
      expect(rescheduleRes.body.customResponses).toHaveLength(1);
      expect(rescheduleRes.body.customResponses[0].value).toBe("Historical Answer Value");
    });
  });

  describe("4. Security, XSS Escaping & Zero Leakage", () => {
    it("stores raw XSS strings in DB but escapes them in notification HTML and omits from ICS", async () => {
      const host = await setupHost(uniqueLabel("q-security-host"));

      const createEventRes = await request(app.getHttpServer())
        .post("/api/v1/event-types")
        .set("Cookie", host.cookies)
        .send({
          title: "Security Review",
          slug: "sec-review",
          durationMinutes: 30,
          location: {
            type: "STATIC_VIDEO",
            data: { url: "https://meet.google.com/sec-room" },
          },
          customQuestions: [
            {
              type: "TEXT",
              label: "<script>alert('xss-label')</script>",
              required: true,
            },
          ],
        });

      const qId = createEventRes.body.customQuestions[0].id;
      const xssValue = `<img src=x onerror=alert('xss-val') /> & "quotes" 'single'`;

      const bookRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${host.username}/sec-review/book`)
        .send({
          startUtc: "2026-10-15T14:00:00.000Z",
          attendeeName: "Penetration Tester",
          attendeeEmail: "pentest@example.com",
          attendeeTimeZone: "America/New_York",
          customResponses: {
            [qId]: xssValue,
          },
        });

      expect(bookRes.status).toBe(201);
      const bookingId = bookRes.body.id;
      const manageToken = bookRes.body.manageToken;

      // 1. Verify Raw Storage in Database
      const dbBooking = await prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
      });
      const dbResponses = dbBooking.customResponses as Array<{ value: string }>;
      expect(dbResponses[0]!.value).toBe(xssValue);

      // 2. Deliver outbox notifications
      await processor.processPendingJobs();
      const sentEmails = devEmailProvider.getSentEmails();
      expect(sentEmails.length).toBeGreaterThanOrEqual(2);

      const hostEmail = sentEmails.find((e) => e.to === host.email);
      expect(hostEmail).toBeDefined();
      // Verify HTML escaping of label and value
      expect(hostEmail?.html).toContain("&lt;script&gt;alert(&#39;xss-label&#39;)&lt;/script&gt;");
      expect(hostEmail?.html).toContain("&lt;img src=x onerror=alert(&#39;xss-val&#39;) /&gt; &amp; &quot;quotes&quot; &#39;single&#39;");
      expect(hostEmail?.html).not.toContain("<script>alert('xss-label')</script>");

      // 3. Verify Zero ICS Leakage
      const icsRes = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${bookingId}/ics`)
        .set("x-booking-token", manageToken);

      expect(icsRes.status).toBe(200);
      expect(icsRes.text).not.toContain("xss-val");
      expect(icsRes.text).not.toContain("xss-label");
      expect(icsRes.text).toContain("SUMMARY:Security Review with Host");
    });
  });
});
