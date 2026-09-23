import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/shared/prisma/prisma.service";
import { BookingTokenService } from "../src/shared/services/booking-token.service";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("Milestone 2: Atomic Booking Rescheduling & Capability Tokens", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: BookingTokenService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tokenService = app.get(BookingTokenService);
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  async function createHostAndEvent(slug = "30min", duration = 30) {
    const username = uniqueLabel("reschedhost");
    const email = `${username}@example.com`;

    const user = await prisma.user.create({
      data: {
        name: "Dr. Rescheduler",
        username,
        email,
        passwordHash: "hash",
        timezone: "UTC",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        userId: user.id,
        title: "30-Min Strategy Sync",
        slug,
        durationMinutes: duration,
        minimumNoticeMinutes: 0,
      },
    });

    const schedule = await prisma.schedule.create({
      data: {
        userId: user.id,
        name: "Working Hours",
        timeZone: "UTC",
        isDefault: true,
      },
    });

    // Day 3 = Wednesday (09:00 - 18:00)
    await prisma.scheduleDay.create({
      data: {
        scheduleId: schedule.id,
        dayOfWeek: 3,
        startTime: "09:00",
        endTime: "18:00",
      },
    });

    return { user, eventType, schedule, username };
  }

  describe("Capability Token Verification & Existence Leak Guard", () => {
    it("returns identical 404 for unknown booking ID and invalid capability token", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      // 1. Unknown booking
      const resUnknown = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${fakeId}`)
        .query({ token: "v1.fake.1.signature" });
      expect(resUnknown.status).toBe(404);
      expect(resUnknown.body.error.message).toContain("no longer valid");

      // 2. Real booking with invalid token
      const { user, eventType } = await createHostAndEvent();
      const booking = await prisma.booking.create({
        data: {
          eventTypeId: eventType.id,
          hostId: user.id,
          startTime: new Date("2026-10-14T10:00:00Z"),
          endTime: new Date("2026-10-14T10:30:00Z"),
          status: "CONFIRMED",
          tokenVersion: 1,
          attendeeName: "Test User",
          attendeeEmail: "test@example.com",
          attendeeTimeZone: "UTC",
        },
      });

      const resInvalidToken = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${booking.id}`)
        .query({ token: "v1.tampered.1.deadbeef" });
      expect(resInvalidToken.status).toBe(404);
      expect(resInvalidToken.body.error.message).toContain("no longer valid");

      // 3. Real booking with valid token
      const validToken = tokenService.generateToken(booking.id, booking.tokenVersion);
      const resValid = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${booking.id}`)
        .set("x-booking-token", validToken);
      expect(resValid.status).toBe(200);
      expect(resValid.body.id).toBe(booking.id);
    });
  });

  describe("Attendee Reschedule Flow & State Mutation", () => {
    it("atomically moves booking slot, increments sequence, creates audit history, and enqueues outbox", async () => {
      const { username } = await createHostAndEvent();

      // 1. Create initial booking at 10:00 UTC
      const initialStartUtc = "2026-10-14T10:00:00.000Z";
      const bookRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: initialStartUtc,
          attendeeName: "Alice Walker",
          attendeeEmail: "alice@example.com",
          attendeeTimeZone: "UTC",
          attendeeNotes: "Initial notes",
        });

      expect(bookRes.status).toBe(201);
      const bookingId = bookRes.body.id;
      const manageToken = bookRes.body.manageToken;
      expect(manageToken).toBeDefined();

      // 2. Reschedule to 14:00 UTC with expectedSequence = 0
      const targetStartUtc = "2026-10-14T14:00:00.000Z";
      const reschedRes = await request(app.getHttpServer())
        .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
        .set("x-booking-token", manageToken)
        .send({
          startUtc: targetStartUtc,
          expectedSequence: 0,
          reason: "Schedule conflict at 10am",
        });

      expect(reschedRes.status).toBe(200);
      expect(reschedRes.body.startTime).toBe(targetStartUtc);
      expect(reschedRes.body.endTime).toBe("2026-10-14T14:30:00.000Z");
      expect(reschedRes.body.sequence).toBe(1);
      expect(reschedRes.body.rescheduleCount).toBe(1);
      expect(reschedRes.body.rescheduledBy).toBe("ATTENDEE");
      expect(reschedRes.body.rescheduleReason).toBe("Schedule conflict at 10am");
      expect(reschedRes.body.previousStartTime).toBe(initialStartUtc);

      // 3. Verify Database Invariants & Audit History
      const dbBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { rescheduleHistory: true, notificationJobs: true },
      });
      expect(dbBooking?.startTime.toISOString()).toBe(targetStartUtc);
      expect(dbBooking?.sequence).toBe(1);
      expect(dbBooking?.rescheduleHistory).toHaveLength(1);
      expect(dbBooking?.rescheduleHistory[0]!.sequence).toBe(1);
      expect(dbBooking?.rescheduleHistory[0]!.previousStartTime.toISOString()).toBe(initialStartUtc);
      expect(dbBooking?.rescheduleHistory[0]!.newStartTime.toISOString()).toBe(targetStartUtc);

      // Verify outbox jobs for sequence 1
      const reschedJobs = dbBooking?.notificationJobs.filter((j) =>
        j.idempotencyKey.includes(":rescheduled:1:")
      );
      expect(reschedJobs).toHaveLength(2); // 1 attendee, 1 host
    });
  });

  describe("Preservation of Committed Duration", () => {
    it("preserves the original booking duration even if EventType duration was modified later", async () => {
      const { eventType, username } = await createHostAndEvent("30min", 30);

      // Book 30-min meeting (10:00 - 10:30)
      const bookRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: "2026-10-14T10:00:00.000Z",
          attendeeName: "Bob Duration",
          attendeeEmail: "bob@example.com",
          attendeeTimeZone: "UTC",
        });

      const bookingId = bookRes.body.id;
      const manageToken = bookRes.body.manageToken;

      // Host subsequently changes event type duration to 60 minutes
      await prisma.eventType.update({
        where: { id: eventType.id },
        data: { durationMinutes: 60 },
      });

      // Attendee reschedules booking to 11:00 UTC
      const reschedRes = await request(app.getHttpServer())
        .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
        .set("x-booking-token", manageToken)
        .send({
          startUtc: "2026-10-14T11:00:00.000Z",
          expectedSequence: 0,
        });

      expect(reschedRes.status).toBe(200);
      expect(reschedRes.body.startTime).toBe("2026-10-14T11:00:00.000Z");
      // Must remain 30 minutes duration (11:30), not 60 minutes!
      expect(reschedRes.body.endTime).toBe("2026-10-14T11:30:00.000Z");
    });
  });

  describe("Concurrency & Conflict Invariants", () => {
    it("ensures exactly 1 wins when multiple different bookings compete for the same target slot", async () => {
      const { username } = await createHostAndEvent();

      // Create 3 separate bookings at 09:00, 09:30, 10:00
      const b1 = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: "2026-10-14T09:00:00.000Z",
          attendeeName: "User 1",
          attendeeEmail: "u1@example.com",
          attendeeTimeZone: "UTC",
        });

      const b2 = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: "2026-10-14T09:30:00.000Z",
          attendeeName: "User 2",
          attendeeEmail: "u2@example.com",
          attendeeTimeZone: "UTC",
        });

      const b3 = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: "2026-10-14T10:00:00.000Z",
          attendeeName: "User 3",
          attendeeEmail: "u3@example.com",
          attendeeTimeZone: "UTC",
        });

      // Target slot: 15:00 UTC
      const targetSlot = "2026-10-14T15:00:00.000Z";

      // 3 parallel requests attempting to reschedule into 15:00 UTC
      const [r1, r2, r3] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${b1.body.id}/reschedule`)
          .set("x-booking-token", b1.body.manageToken)
          .send({ startUtc: targetSlot, expectedSequence: 0 }),
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${b2.body.id}/reschedule`)
          .set("x-booking-token", b2.body.manageToken)
          .send({ startUtc: targetSlot, expectedSequence: 0 }),
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${b3.body.id}/reschedule`)
          .set("x-booking-token", b3.body.manageToken)
          .send({ startUtc: targetSlot, expectedSequence: 0 }),
      ]);

      const statuses = [r1.status, r2.status, r3.status];
      const successCount = statuses.filter((s) => s === 200).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);

      // Verify PostgreSQL database state: exactly 1 booking in the 15:00 slot
      const occupiedInDb = await prisma.booking.findMany({
        where: { startTime: new Date(targetSlot), status: "CONFIRMED" },
      });
      expect(occupiedInDb).toHaveLength(1);
    });

    it("serializes concurrent reschedules of the same booking and rejects stale expectedSequence", async () => {
      const { username } = await createHostAndEvent();

      const b = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: "2026-10-14T09:00:00.000Z",
          attendeeName: "Racer",
          attendeeEmail: "racer@example.com",
          attendeeTimeZone: "UTC",
        });

      const bookingId = b.body.id;
      const token = b.body.manageToken;

      // 3 parallel requests trying to move the SAME booking to 11:00, 12:00, 13:00 (all sending expectedSequence: 0)
      const [r1, r2, r3] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
          .set("x-booking-token", token)
          .send({ startUtc: "2026-10-14T11:00:00.000Z", expectedSequence: 0 }),
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
          .set("x-booking-token", token)
          .send({ startUtc: "2026-10-14T12:00:00.000Z", expectedSequence: 0 }),
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
          .set("x-booking-token", token)
          .send({ startUtc: "2026-10-14T13:00:00.000Z", expectedSequence: 0 }),
      ]);

      const statuses = [r1.status, r2.status, r3.status];
      const successCount = statuses.filter((s) => s === 200).length;
      const versionConflictCount = [r1, r2, r3].filter(
        (r) => r.status === 409 && r.body.error.code === "BOOKING_VERSION_CONFLICT"
      ).length;

      expect(successCount).toBe(1);
      expect(versionConflictCount).toBe(2);
    });

    it("enforces cancel-vs-reschedule race determinism on the same booking", async () => {
      const { username } = await createHostAndEvent();

      const b = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: "2026-10-14T09:00:00.000Z",
          attendeeName: "Cancel Racer",
          attendeeEmail: "cancelracer@example.com",
          attendeeTimeZone: "UTC",
        });

      const bookingId = b.body.id;
      const token = b.body.manageToken;

      // 1 cancel vs 1 reschedule firing simultaneously with expectedSequence = 0
      const [resCancel, resReschedule] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${bookingId}/cancel`)
          .set("x-booking-token", token)
          .send({ expectedSequence: 0, reason: "I need to cancel" }),
        request(app.getHttpServer())
          .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
          .set("x-booking-token", token)
          .send({ startUtc: "2026-10-14T11:00:00.000Z", expectedSequence: 0 }),
      ]);

      const statuses = [resCancel.status, resReschedule.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);
    });
  });

  describe("ICS File Generation & Cancellation Sequences", () => {
    it("updates SEQUENCE in .ics on reschedule and sets METHOD: CANCEL on cancellation", async () => {
      const { username } = await createHostAndEvent();

      // Create booking (sequence 0)
      const bookRes = await request(app.getHttpServer())
        .post(`/api/v1/public/${username}/30min/book`)
        .send({
          startUtc: "2026-10-14T10:00:00.000Z",
          attendeeName: "ICS Tester",
          attendeeEmail: "icstester@example.com",
          attendeeTimeZone: "UTC",
        });

      const bookingId = bookRes.body.id;
      const token = bookRes.body.manageToken;

      // Initial .ics check
      const ics0 = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${bookingId}/ics`)
        .set("x-booking-token", token);
      expect(ics0.status).toBe(200);
      expect(ics0.text).toContain("SEQUENCE:0");
      expect(ics0.text).toContain("METHOD:REQUEST");
      expect(ics0.text).toContain("STATUS:CONFIRMED");

      // Reschedule (sequence 1)
      await request(app.getHttpServer())
        .patch(`/api/v1/public/bookings/${bookingId}/reschedule`)
        .set("x-booking-token", token)
        .send({ startUtc: "2026-10-14T14:00:00.000Z", expectedSequence: 0 });

      const ics1 = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${bookingId}/ics`)
        .set("x-booking-token", token);
      expect(ics1.status).toBe(200);
      expect(ics1.text).toContain("SEQUENCE:1");
      expect(ics1.text).toContain("METHOD:REQUEST");
      expect(ics1.text).toContain("20261014T140000Z");

      // Cancel (sequence 2)
      await request(app.getHttpServer())
        .patch(`/api/v1/public/bookings/${bookingId}/cancel`)
        .set("x-booking-token", token)
        .send({ expectedSequence: 1, reason: "No longer needed" });

      const icsCancelled = await request(app.getHttpServer())
        .get(`/api/v1/public/bookings/${bookingId}/ics`)
        .set("x-booking-token", token);
      expect(icsCancelled.status).toBe(200);
      expect(icsCancelled.text).toContain("SEQUENCE:2");
      expect(icsCancelled.text).toContain("METHOD:CANCEL");
      expect(icsCancelled.text).toContain("STATUS:CANCELLED");
    });
  });
});
