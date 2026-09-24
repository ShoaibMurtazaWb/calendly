import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/shared/prisma/prisma.service";
import { createTestApp, resetDatabase, uniqueLabel } from "./app.helper";

describe("Analytics Module Integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await resetDatabase(app);
    await app.close();
  });

  async function setupHost(prefix: string) {
    const registerRes = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({
        email: `${prefix}@example.com`,
        password: "Password123!",
        name: "Analytics Host",
        username: prefix,
        timezone: "America/New_York",
      });
    const cookies = registerRes.headers["set-cookie"] as unknown as string[];

    const user = await prisma.user.findUnique({ where: { username: prefix } });

    // Create 2 event types
    const et1 = await prisma.eventType.create({
      data: {
        userId: user!.id,
        title: "Quick Sync 15m",
        slug: "quick-sync",
        durationMinutes: 15,
      },
    });

    const et2 = await prisma.eventType.create({
      data: {
        userId: user!.id,
        title: "Deep Dive 60m",
        slug: "deep-dive",
        durationMinutes: 60,
      },
    });

    return { user: user!, cookies, et1, et2 };
  }

  it("calculates summary KPIs, event type distribution, and trends accurately", async () => {
    const { user, cookies, et1, et2 } = await setupHost(uniqueLabel("analytics-user1"));

    const now = new Date();
    const day1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const day2 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

    // 1. Confirmed booking for ET1
    await prisma.booking.create({
      data: {
        hostId: user.id,
        eventTypeId: et1.id,
        startTime: day1,
        endTime: new Date(day1.getTime() + 15 * 60 * 1000),
        status: "CONFIRMED",
        attendeeName: "Alice Attendee",
        attendeeEmail: "alice@example.com",
        attendeeTimeZone: "America/New_York",
      },
    });

    // 2. Confirmed booking for ET2
    await prisma.booking.create({
      data: {
        hostId: user.id,
        eventTypeId: et2.id,
        startTime: day2,
        endTime: new Date(day2.getTime() + 60 * 60 * 1000),
        status: "CONFIRMED",
        attendeeName: "Bob Attendee",
        attendeeEmail: "bob@example.com",
        attendeeTimeZone: "America/New_York",
        rescheduleCount: 1,
      },
    });

    // 3. Cancelled booking for ET1
    await prisma.booking.create({
      data: {
        hostId: user.id,
        eventTypeId: et1.id,
        startTime: now,
        endTime: new Date(now.getTime() + 15 * 60 * 1000),
        status: "CANCELLED",
        attendeeName: "Charlie Cancel",
        attendeeEmail: "charlie@example.com",
        attendeeTimeZone: "America/New_York",
      },
    });

    const res = await request(app.getHttpServer())
      .get("/api/v1/analytics/overview?range=30d")
      .set("Cookie", cookies)
      .expect(200);

    const body = res.body;
    expect(body.timeframe).toBe("30d");
    expect(body.summary.totalBookings).toBe(3);
    expect(body.summary.confirmedCount).toBe(2);
    expect(body.summary.cancelledCount).toBe(1);
    expect(body.summary.rescheduledCount).toBe(1);
    expect(body.summary.totalMeetingMinutes).toBe(75); // 15 + 60
    expect(body.summary.completionRate).toBe(66.7); // 2/3 = 66.7%

    expect(body.eventTypes).toHaveLength(2);
    const et1Metric = body.eventTypes.find((e: { eventTypeId: string }) => e.eventTypeId === et1.id);
    expect(et1Metric.count).toBe(2);
    expect(et1Metric.title).toBe("Quick Sync 15m");

    const et2Metric = body.eventTypes.find((e: { eventTypeId: string }) => e.eventTypeId === et2.id);
    expect(et2Metric.count).toBe(1);
    expect(et2Metric.title).toBe("Deep Dive 60m");

    expect(body.dailyTrends.length).toBeGreaterThanOrEqual(1);
    expect(body.dayOfWeekHeatmap).toHaveLength(7);
  });
});
