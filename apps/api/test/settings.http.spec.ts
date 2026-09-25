import { HttpStatus, INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AppModule } from "../src/app.module";
import { HttpErrorFilter } from "../src/shared/filters/http-error.filter";
import { PrismaService } from "../src/shared/prisma/prisma.service";

describe("Settings & Audit API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authCookie: string;
  let registeredUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.use(json());
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();

    prisma = app.get(PrismaService);

    // Register a user for settings testing
    const uniqueSuffix = Math.random().toString(36).substring(2, 10);
    const email = `settings-${uniqueSuffix}@example.com`;
    const username = `settings-${uniqueSuffix}`;

    const regRes = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email,
        password: "Password123!",
        name: "Settings Tester",
        username,
        timezone: "America/New_York",
      })
      .expect(HttpStatus.CREATED);

    registeredUserId = regRes.body.id;
    const cookies = regRes.headers["set-cookie"] as unknown as string[] | string;
    authCookie = Array.isArray(cookies) ? (cookies[0] || "") : (cookies || "");
  });

  afterAll(async () => {
    if (registeredUserId) {
      await prisma.auditLog.deleteMany({ where: { userId: registeredUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: registeredUserId } }).catch(() => {});
    }
    await app.close();
  });

  it("GET /api/v1/settings - retrieves user profile and preference settings", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/settings")
      .set("Cookie", authCookie)
      .expect(HttpStatus.OK);

    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.name).toBe("Settings Tester");
    expect(res.body.profile.timezone).toBe("America/New_York");
    expect(res.body.notificationPreferences).toBeDefined();
    expect(res.body.notificationPreferences.emailReminders).toBe(true);
    expect(res.body.schedulingPreferences).toBeDefined();
    expect(res.body.schedulingPreferences.defaultMeetingDuration).toBe(30);
  });

  it("PATCH /api/v1/settings/profile - updates profile details and creates audit log", async () => {
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const newUsername = `updated-${uniqueSuffix}`;

    const res = await request(app.getHttpServer())
      .patch("/api/v1/settings/profile")
      .set("Cookie", authCookie)
      .send({
        name: "Updated Name",
        username: newUsername,
        timezone: "Europe/London",
        avatarUrl: "https://example.com/avatar.jpg",
      })
      .expect(HttpStatus.OK);

    expect(res.body.profile.name).toBe("Updated Name");
    expect(res.body.profile.username).toBe(newUsername);
    expect(res.body.profile.timezone).toBe("Europe/London");
    expect(res.body.profile.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("PATCH /api/v1/settings/notifications - updates notification toggles", async () => {
    const res = await request(app.getHttpServer())
      .patch("/api/v1/settings/notifications")
      .set("Cookie", authCookie)
      .send({
        emailReminders: false,
        bookingConfirmations: true,
        marketingEmails: true,
      })
      .expect(HttpStatus.OK);

    expect(res.body.notificationPreferences.emailReminders).toBe(false);
    expect(res.body.notificationPreferences.marketingEmails).toBe(true);
  });

  it("PATCH /api/v1/settings/scheduling - updates default scheduling preferences", async () => {
    const res = await request(app.getHttpServer())
      .patch("/api/v1/settings/scheduling")
      .set("Cookie", authCookie)
      .send({
        defaultMeetingDuration: 45,
        defaultBufferMinutes: 10,
        defaultTimezone: "Europe/London",
      })
      .expect(HttpStatus.OK);

    expect(res.body.schedulingPreferences.defaultMeetingDuration).toBe(45);
    expect(res.body.schedulingPreferences.defaultBufferMinutes).toBe(10);
  });

  it("GET /api/v1/settings/audit-logs - returns recorded audit trail records", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/settings/audit-logs")
      .set("Cookie", authCookie)
      .expect(HttpStatus.OK);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const actions = res.body.map((log: { action: string }) => log.action);
    expect(actions).toContain("AUTHENTICATION_REGISTER");
    expect(actions).toContain("SETTINGS_PROFILE_UPDATED");
  });
});
