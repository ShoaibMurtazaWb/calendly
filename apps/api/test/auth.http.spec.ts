import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { SESSION_COOKIE_NAME } from "../src/shared/constants";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("auth HTTP", () => {
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

  function registerPayload(overrides: Record<string, string> = {}) {
    const label = uniqueLabel("user");
    return {
      email: `${label}@example.com`,
      password: "password-10",
      name: "Ada Lovelace",
      username: label,
      timezone: "Asia/Karachi",
      ...overrides,
    };
  }

  it("registers, returns the current user, and sets an HttpOnly session cookie", async () => {
    const payload = registerPayload();
    const res = await request(app.getHttpServer()).post("/api/v1/auth/register").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(payload.email);
    expect(res.body.username).toBe(payload.username);
    expect(res.body.passwordHash).toBeUndefined();
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
  });

  it("rejects duplicate emails case-insensitively and duplicate usernames", async () => {
    const first = registerPayload({ email: "Ada@Example.com", username: "ada-one" });
    await request(app.getHttpServer()).post("/api/v1/auth/register").send(first).expect(201);

    const emailClash = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(registerPayload({ email: "ada@example.com", username: "ada-two" }));
    expect(emailClash.status).toBe(409);
    expect(emailClash.body.error.code).toBe("EMAIL_CONFLICT");

    const usernameClash = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(registerPayload({ username: "ada-one" }));
    expect(usernameClash.status).toBe(409);
    expect(usernameClash.body.error.code).toBe("USERNAME_CONFLICT");
  });

  it("logs in, reads /me, and rejects a revoked cookie after logout", async () => {
    const payload = registerPayload();
    await request(app.getHttpServer()).post("/api/v1/auth/register").send(payload).expect(201);

    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(login.status).toBe(200);
    const cookies = login.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const me = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Cookie", cookies);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(payload.email);

    await request(app.getHttpServer()).post("/api/v1/auth/logout").set("Cookie", cookies).expect(204);

    const after = await request(app.getHttpServer()).get("/api/v1/auth/me").set("Cookie", cookies);
    expect(after.status).toBe(401);
  });

  it("does not distinguish missing users from bad passwords", async () => {
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "password-10" });
    expect(missing.status).toBe(401);
    expect(missing.body.error.message).toBe("Invalid email or password");
  });
});
