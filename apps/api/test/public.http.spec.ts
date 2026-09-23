import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("public event type HTTP", () => {
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

  it("exposes public host profile and hides inactive event types", async () => {
    const username = uniqueLabel("pub-host");
    const register = await request(app.getHttpServer()).post("/api/v1/auth/register").send({
      email: `${username}@example.com`,
      password: "password-10",
      name: "Alex Rivera",
      username,
      timezone: "America/New_York",
    });
    const cookies = register.headers["set-cookie"] as unknown as string[];

    // Create 2 event types: one active, one archived
    const ev1 = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "30 Min Discovery",
        slug: "discovery",
        description: "Introductory chat",
        durationMinutes: 30,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(ev1.status).toBe(201);

    const ev2 = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Archived Sync",
        slug: "archived-sync",
        description: "Old link",
        durationMinutes: 15,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(ev2.status).toBe(201);

    await request(app.getHttpServer())
      .post(`/api/v1/event-types/${ev2.body.id}/archive`)
      .set("Cookie", cookies)
      .expect(201);

    // Read public host profile
    const hostProfile = await request(app.getHttpServer()).get(`/api/v1/public/${username}`);
    expect(hostProfile.status).toBe(200);
    expect(hostProfile.body.user.name).toBe("Alex Rivera");
    expect(hostProfile.body.user.username).toBe(username);
    expect(hostProfile.body.user.timezone).toBe("America/New_York");
    expect(hostProfile.body.eventTypes).toHaveLength(1);
    expect(hostProfile.body.eventTypes[0].slug).toBe("discovery");

    // Fetch slots for the active event type
    const slotsRes = await request(app.getHttpServer()).get(
      `/api/v1/public/${username}/discovery/slots?startDate=2026-10-12&endDate=2026-10-12&timezone=America/New_York`
    );
    expect(slotsRes.status).toBe(200);
    expect(Array.isArray(slotsRes.body)).toBe(true);
    expect(slotsRes.body.length).toBeGreaterThan(0);
    expect(slotsRes.body[0].time).toBeDefined();
    expect(slotsRes.body[0].startUtc).toBeDefined();
  });

  it("exposes active event types and hides email, archives, and unknown paths", async () => {
    const username = uniqueLabel("pub");
    const register = await request(app.getHttpServer()).post("/api/v1/auth/register").send({
      email: `${username}@example.com`,
      password: "password-10",
      name: "Public Host",
      username,
      timezone: "America/New_York",
    });
    const cookies = register.headers["set-cookie"] as unknown as string[];

    const created = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Office hours",
        slug: "office-hours",
        description: "Ask questions",
        durationMinutes: 20,
        location: {
          type: "STATIC_VIDEO",
          data: { url: "https://meet.google.com/abc-defg-hij" },
        },
      });
    expect(created.status).toBe(201);

    const visible = await request(app.getHttpServer()).get(`/api/v1/public/${username}/office-hours`);
    expect(visible.status).toBe(200);
    expect(visible.body.title).toBe("Office hours");
    expect(visible.body.host.name).toBe("Public Host");
    expect(visible.body.host.email).toBeUndefined();

    await request(app.getHttpServer())
      .post(`/api/v1/event-types/${created.body.id}/archive`)
      .set("Cookie", cookies)
      .expect(201);

    const archived = await request(app.getHttpServer()).get(`/api/v1/public/${username}/office-hours`);
    expect(archived.status).toBe(404);

    const missingUser = await request(app.getHttpServer()).get("/api/v1/public/no-such-user/office-hours");
    expect(missingUser.status).toBe(404);
  });
});
