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
    return { cookies: res.headers["set-cookie"] as string[], user: res.body as { id: string; username: string } };
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
      });
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe("intro-call");

    const clash = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({ title: "Other", slug: "intro-call", description: "", durationMinutes: 15 });
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
  });

  it("returns 404 when another user guesses an id", async () => {
    const owner = await register(uniqueLabel("owner"));
    const stranger = await register(uniqueLabel("other"));
    const created = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", owner.cookies)
      .send({ title: "Private", slug: "private", description: "", durationMinutes: 15 });

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
  });
});
