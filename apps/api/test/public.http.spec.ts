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

  it("exposes active event types and hides email, archives, and unknown paths", async () => {
    const username = uniqueLabel("pub");
    const register = await request(app.getHttpServer()).post("/api/v1/auth/register").send({
      email: `${username}@example.com`,
      password: "password-10",
      name: "Public Host",
      username,
      timezone: "America/New_York",
    });
    const cookies = register.headers["set-cookie"] as string[];

    const created = await request(app.getHttpServer())
      .post("/api/v1/event-types")
      .set("Cookie", cookies)
      .send({
        title: "Office hours",
        slug: "office-hours",
        description: "Ask questions",
        durationMinutes: 20,
      });
    expect(created.status).toBe(201);

    const visible = await request(app.getHttpServer()).get(`/api/v1/public/${username}/office-hours`);
    expect(visible.status).toBe(200);
    expect(visible.body.title).toBe("Office hours");
    expect(visible.body.host.name).toBe("Public Host");
    expect(visible.body.host.email).toBeUndefined();
    expect(visible.body.id).toBeUndefined();

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
