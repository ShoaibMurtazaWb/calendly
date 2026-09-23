import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("Bookings HTTP", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupHost(prefix: string) {
    const payload = {
      email: `${prefix}@example.com`,
      password: "Password123!",
      name: "Booking Host",
      username: prefix,
      timezone: "America/New_York",
    };
    const authRes = await request(app.getHttpServer()).post("/api/v1/auth/register").send(payload);
    expect(authRes.status).toBe(201);
    const cookies = authRes.headers["set-cookie"] as unknown as string[];

    // Ensure default schedule exists
    await request(app.getHttpServer())
      .put("/api/v1/schedules/default")
      .set("Cookie", cookies)
      .send({
        name: "Standard Hours",
        timeZone: "America/New_York",
        days: [
          { dayOfWeek: 0, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
          { dayOfWeek: 6, startTime: "09:00", endTime: "17:00" },
        ],
        overrides: [],
      });

    // Create event type
    const etRes = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "30 Min Discovery",
        slug: "discovery",
        description: "Introductory chat",
        durationMinutes: 30,
        beforeBufferMinutes: 0,
        afterBufferMinutes: 0,
        minimumNoticeMinutes: 0,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(etRes.status).toBe(201);

    return { username: prefix, cookies, eventType: etRes.body };
  }

  it("successfully books an available slot, subtracts it from available slots, and rejects double bookings", async () => {
    const host = await setupHost(uniqueLabel("host-book"));

    // Fetch available slots for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const slotsRes = await request(app.getHttpServer())
      .get(`/api/v1/public/${host.username}/discovery/slots`)
      .query({
        startDate: dateStr,
        endDate: dateStr,
        timezone: "America/New_York",
      });

    expect(slotsRes.status).toBe(200);
    expect(slotsRes.body.length).toBeGreaterThan(0);

    const chosenSlot = slotsRes.body[0];
    const initialSlotCount = slotsRes.body.length;

    // 1. Create booking
    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${host.username}/discovery/book`)
      .send({
        startUtc: chosenSlot.startUtc,
        attendeeName: "Alice Invitee",
        attendeeEmail: "alice@example.com",
        attendeeTimeZone: "America/New_York",
        attendeeNotes: "Looking forward to this!",
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.attendeeName).toBe("Alice Invitee");
    expect(bookRes.body.status).toBe("CONFIRMED");
    expect(bookRes.body.eventType.slug).toBe("discovery");
    expect(bookRes.body.host.username).toBe(host.username);

    const bookingId = bookRes.body.id;

    // 2. Fetch slots again -> chosen slot must be excluded
    const updatedSlotsRes = await request(app.getHttpServer())
      .get(`/api/v1/public/${host.username}/discovery/slots`)
      .query({
        startDate: dateStr,
        endDate: dateStr,
        timezone: "America/New_York",
      });

    expect(updatedSlotsRes.status).toBe(200);
    expect(updatedSlotsRes.body.length).toBe(initialSlotCount - 1);
    const slotStillExists = updatedSlotsRes.body.some(
      (s: { startUtc: string }) => s.startUtc === chosenSlot.startUtc
    );
    expect(slotStillExists).toBe(false);

    // 3. Duplicate booking attempt on the same slot -> 409 Conflict
    const dupRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${host.username}/discovery/book`)
      .send({
        startUtc: chosenSlot.startUtc,
        attendeeName: "Bob Duplicate",
        attendeeEmail: "bob@example.com",
        attendeeTimeZone: "America/New_York",
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBeDefined();

    // 4. Host views bookings dashboard
    const hostBookingsRes = await request(app.getHttpServer())
      .get("/api/v1/bookings")
      .set("Cookie", host.cookies)
      .query({ status: "upcoming" });

    expect(hostBookingsRes.status).toBe(200);
    expect(hostBookingsRes.body).toHaveLength(1);
    expect(hostBookingsRes.body[0].id).toBe(bookingId);

    // 5. Public booking view
    const publicBookingRes = await request(app.getHttpServer())
      .get(`/api/v1/public/bookings/${bookingId}`)
      .set("x-booking-token", bookRes.body.manageToken);
    expect(publicBookingRes.status).toBe(200);
    expect(publicBookingRes.body.id).toBe(bookingId);

    // 6. Download .ics calendar file
    const icsRes = await request(app.getHttpServer())
      .get(`/api/v1/public/bookings/${bookingId}/ics`)
      .set("x-booking-token", bookRes.body.manageToken);
    expect(icsRes.status).toBe(200);
    expect(icsRes.headers["content-type"]).toContain("text/calendar");
    expect(icsRes.text).toContain("BEGIN:VCALENDAR");
    expect(icsRes.text).toContain("30 Min Discovery with Booking Host");

    // 7. Cancel booking as attendee
    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/v1/public/bookings/${bookingId}/cancel`)
      .set("x-booking-token", bookRes.body.manageToken)
      .send({ expectedSequence: 0, reason: "Scheduling conflict" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("CANCELLED");
    expect(cancelRes.body.cancelledBy).toBe("ATTENDEE");
    expect(cancelRes.body.cancellationReason).toBe("Scheduling conflict");
    expect(cancelRes.body.sequence).toBe(1);

    // 8. After cancellation, the slot becomes available again!
    const recoveredSlotsRes = await request(app.getHttpServer())
      .get(`/api/v1/public/${host.username}/discovery/slots`)
      .query({
        startDate: dateStr,
        endDate: dateStr,
        timezone: "America/New_York",
      });

    expect(recoveredSlotsRes.body.length).toBe(initialSlotCount);
  });

  it("allows host to cancel a booking and lists under cancelled filter", async () => {
    const host = await setupHost(uniqueLabel("host-cancel"));

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const slotsRes = await request(app.getHttpServer())
      .get(`/api/v1/public/${host.username}/discovery/slots`)
      .query({ startDate: dateStr, endDate: dateStr, timezone: "America/New_York" });

    const chosenSlot = slotsRes.body[0];

    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${host.username}/discovery/book`)
      .send({
        startUtc: chosenSlot.startUtc,
        attendeeName: "Charlie Attendee",
        attendeeEmail: "charlie@example.com",
        attendeeTimeZone: "America/New_York",
      });


    const bookingId = bookRes.body.id;

    // Cancel by host
    const cancelRes = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .set("Cookie", host.cookies)
      .send({ expectedSequence: 0, reason: "Host unavailable" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("CANCELLED");
    expect(cancelRes.body.cancelledBy).toBe("HOST");
    expect(cancelRes.body.cancellationReason).toBe("Host unavailable");
    expect(cancelRes.body.sequence).toBe(1);

    // Check host cancelled bookings list
    const cancelledListRes = await request(app.getHttpServer())
      .get("/api/v1/bookings")
      .set("Cookie", host.cookies)
      .query({ status: "cancelled" });

    expect(cancelledListRes.status).toBe(200);
    expect(cancelledListRes.body).toHaveLength(1);
    expect(cancelledListRes.body[0].id).toBe(bookingId);
  });
});
