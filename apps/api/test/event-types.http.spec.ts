import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("event types HTTP", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  async function register(username: string) {
    const payload = {
      email: `${username}@example.com`,
      password: "password-10",
      name: username,
      username,
      timezone: "Europe/London",
    };
    const res = await request(app.getHttpServer()).post("/api/v1/auth/register").send(payload);
    expect(res.status).toBe(201);
    return { cookies: res.headers["set-cookie"] as unknown as string[], user: res.body as { id: string; username: string } };
  }

  it("creates, lists, updates, and archives event types for the owner", async () => {
    const { cookies } = await register(uniqueLabel("host"));
    const created = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Intro call",
        slug: "intro-call",
        description: "A first meeting",
        durationMinutes: 30,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe("intro-call");

    const clash = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Other",
        slug: "intro-call",
        description: "",
        durationMinutes: 15,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe("EVENT_TYPE_SLUG_CONFLICT");

    const listed = await request(app.getHttpServer()).get("/api/v1/event-types").set("Cookie", cookies);
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/event-types/${created.body.id}`)
      .set("Cookie", cookies)
      .send({ durationMinutes: 45 });
    expect(updated.status).toBe(200);
    expect(updated.body.durationMinutes).toBe(45);

    const archived = await request(app.getHttpServer())
      .post(`/api/v1/event-types/${created.body.id}/archive`)
      .set("Cookie", cookies);
    expect(archived.status).toBe(201);
    expect(archived.body.archivedAt).toBeTruthy();

    const again = await request(app.getHttpServer())
      .post(`/api/v1/event-types/${created.body.id}/archive`)
      .set("Cookie", cookies);
    expect(again.status).toBe(201);
    expect(again.body.archivedAt).toBe(archived.body.archivedAt);

    const active = await request(app.getHttpServer()).get("/api/v1/event-types").set("Cookie", cookies);
    expect(active.body).toHaveLength(0);
    const hidden = await request(app.getHttpServer())
      .get("/api/v1/event-types?status=archived")
      .set("Cookie", cookies);
    expect(hidden.body).toHaveLength(1);

    const editArchived = await request(app.getHttpServer())
      .patch(`/api/v1/event-types/${created.body.id}`)
      .set("Cookie", cookies)
      .send({ title: "Nope" });
    expect(editArchived.status).toBe(409);

    const unarchived = await request(app.getHttpServer())
      .post(`/api/v1/event-types/${created.body.id}/unarchive`)
      .set("Cookie", cookies);
    expect(unarchived.status).toBe(201);
    expect(unarchived.body.archivedAt).toBeNull();

    const activeAfterRestore = await request(app.getHttpServer()).get("/api/v1/event-types").set("Cookie", cookies);
    expect(activeAfterRestore.body).toHaveLength(1);
  });

  it("returns 404 when another user guesses an id", async () => {
    const owner = await register(uniqueLabel("owner"));
    const stranger = await register(uniqueLabel("other"));
    const created = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", owner.cookies)
      .send({
        title: "Private",
        slug: "private",
        description: "",
        durationMinutes: 15,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });

    const get = await request(app.getHttpServer())
      .get(`/api/v1/event-types/${created.body.id}`)
      .set("Cookie", stranger.cookies);
    expect(get.status).toBe(404);

    const patch = await request(app.getHttpServer())
      .patch(`/api/v1/event-types/${created.body.id}`)
      .set("Cookie", stranger.cookies)
      .send({ title: "Stolen" });
    expect(patch.status).toBe(404);

    const archive = await request(app.getHttpServer())
      .post(`/api/v1/event-types/${created.body.id}/archive`)
      .set("Cookie", stranger.cookies);
    expect(archive.status).toBe(404);

    const del = await request(app.getHttpServer())
      .delete(`/api/v1/event-types/${created.body.id}`)
      .set("Cookie", stranger.cookies);
    expect(del.status).toBe(404);
  });

  it("deletes event type when there are no bookings, but blocks deletion when bookings exist", async () => {
    const { cookies, user } = await register(uniqueLabel("delhost"));

    // Set schedule
    await request(app.getHttpServer())
      .put("/api/v1/schedules/default")
      .set("Cookie", cookies)
      .send({
        name: "Standard Hours",
        timeZone: "Europe/London",
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

    // 1. Create an event type that will have NO bookings
    const noBookingEt = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Unused Session",
        slug: "unused-session",
        durationMinutes: 30,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(noBookingEt.status).toBe(201);

    // Delete it directly
    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/event-types/${noBookingEt.body.id}`)
      .set("Cookie", cookies);
    expect(deleteRes.status).toBe(200);

    // Verify it is gone
    const verifyGet = await request(app.getHttpServer())
      .get(`/api/v1/event-types/${noBookingEt.body.id}`)
      .set("Cookie", cookies);
    expect(verifyGet.status).toBe(404);

    // 2. Create an event type with a booking
    const withBookingEt = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Popular Session",
        slug: "popular-session",
        durationMinutes: 30,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(withBookingEt.status).toBe(201);

    // Book it
    const startTime = "2028-10-15T10:00:00.000Z";
    const bookRes = await request(app.getHttpServer())
      .post(`/api/v1/public/${user.username}/popular-session/book`)
      .send({
        startUtc: startTime,
        attendeeName: "Jane Doe",
        attendeeEmail: "jane@example.com",
        attendeeTimeZone: "Europe/London",
      });
    expect(bookRes.status).toBe(201);

    // Verify bookingCount is 1
    const getAfterBook = await request(app.getHttpServer())
      .get(`/api/v1/event-types/${withBookingEt.body.id}`)
      .set("Cookie", cookies);
    expect(getAfterBook.status).toBe(200);
    expect(getAfterBook.body.bookingCount).toBe(1);

    // Attempt to delete it
    const blockDeleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/event-types/${withBookingEt.body.id}`)
      .set("Cookie", cookies);
    expect(blockDeleteRes.status).toBe(400);
    expect(blockDeleteRes.body.error.code).toBe("CANNOT_DELETE_WITH_BOOKINGS");

    // But archiving it should work perfectly and preserve historical bookings
    const archiveRes = await request(app.getHttpServer())
      .post(`/api/v1/event-types/${withBookingEt.body.id}/archive`)
      .set("Cookie", cookies);
    expect(archiveRes.status).toBe(201);
    expect(archiveRes.body.archivedAt).toBeTruthy();
    expect(archiveRes.body.bookingCount).toBe(1);
  });
});
