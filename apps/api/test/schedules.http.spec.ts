import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("Schedules HTTP", () => {
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

  async function register(prefix: string) {
    const payload = {
      email: `${prefix}@example.com`,
      password: "Password123!",
      name: "Schedule Tester",
      username: prefix,
      timezone: "America/New_York",
    };
    const res = await request(app.getHttpServer()).post("/api/v1/auth/register").send(payload);
    expect(res.status).toBe(201);
    return { cookies: res.headers["set-cookie"] as unknown as string[] };
  }

  it("lazily creates and returns a default Mon-Fri schedule", async () => {
    const { cookies } = await register(uniqueLabel("sch-user"));

    const res = await request(app.getHttpServer())
      .get("/api/v1/schedules/default")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Working Hours");
    expect(res.body.timeZone).toBe("America/New_York");
    expect(res.body.days).toHaveLength(5);
    expect(res.body.days[0].dayOfWeek).toBe(1); // Monday
    expect(res.body.days[0].startTime).toBe("09:00");
    expect(res.body.days[0].endTime).toBe("17:00");
  });

  it("updates schedule days, timezone, and adds date overrides", async () => {
    const { cookies } = await register(uniqueLabel("sch-user2"));

    const updatePayload = {
      name: "Custom Engineering Schedule",
      timeZone: "Asia/Karachi",
      days: [
        { dayOfWeek: 1, startTime: "10:00", endTime: "14:00" },
        { dayOfWeek: 1, startTime: "15:00", endTime: "19:00" }, // Multi-interval (lunch break)
        { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      ],
      overrides: [
        { date: "2026-10-15", isUnavailable: true },
        { date: "2026-10-20", isUnavailable: false, startTime: "13:00", endTime: "16:00" },
      ],
    };

    const updateRes = await request(app.getHttpServer())
      .put("/api/v1/schedules/default")
      .set("Cookie", cookies)
      .send(updatePayload);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe("Custom Engineering Schedule");
    expect(updateRes.body.timeZone).toBe("Asia/Karachi");
    expect(updateRes.body.days).toHaveLength(3);
    expect(updateRes.body.overrides).toHaveLength(2);
    expect(updateRes.body.overrides[0].date).toBe("2026-10-15");
    expect(updateRes.body.overrides[0].isUnavailable).toBe(true);
  });
});
