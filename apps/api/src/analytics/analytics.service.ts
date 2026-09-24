import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../shared/prisma/prisma.service";
import type {
  AnalyticsQuery,
  AnalyticsRange,
  AnalyticsSummary,
  DailyBookingMetric,
  DayOfWeekMetric,
  EventTypeMetric,
  HostAnalyticsResponse,
} from "@sched/api-contract";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger("AnalyticsService");

  constructor(private readonly prisma: PrismaService) {}

  async getHostAnalytics(userId: string, query: AnalyticsQuery): Promise<HostAnalyticsResponse> {
    const range: AnalyticsRange = query.range || "30d";
    const now = new Date();
    let startDate: Date;

    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (range === "all") {
      startDate = new Date("2020-01-01T00:00:00Z");
    } else {
      // default: 30d
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Load user's timezone
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = user?.timezone || "UTC";

    // Fetch all bookings for the host in the given timeframe
    const bookings = await this.prisma.booking.findMany({
      where: {
        hostId: userId,
        startTime: {
          gte: startDate,
        },
      },
      include: {
        eventType: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const totalBookings = bookings.length;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let rescheduledCount = 0;
    let totalMeetingMinutes = 0;

    const eventTypeMap = new Map<
      string,
      { title: string; count: number; durationMinutes: number }
    >();
    const dailyMap = new Map<string, { total: number; confirmed: number; cancelled: number }>();
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];

    for (const b of bookings) {
      if (b.status === "CONFIRMED") {
        confirmedCount++;
        totalMeetingMinutes += b.eventType.durationMinutes;
      } else if (b.status === "CANCELLED") {
        cancelledCount++;
      }

      if (b.rescheduleCount > 0) {
        rescheduledCount++;
      }

      // Event type aggregation
      const et = eventTypeMap.get(b.eventTypeId) || {
        title: b.eventType.title,
        count: 0,
        durationMinutes: b.eventType.durationMinutes,
      };
      et.count++;
      eventTypeMap.set(b.eventTypeId, et);

      // Date string in host timezone (YYYY-MM-DD)
      const dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(b.startTime);

      const dMetric = dailyMap.get(dateStr) || { total: 0, confirmed: 0, cancelled: 0 };
      dMetric.total++;
      if (b.status === "CONFIRMED") dMetric.confirmed++;
      if (b.status === "CANCELLED") dMetric.cancelled++;
      dailyMap.set(dateStr, dMetric);

      // Day of week in host timezone
      const dayIdx = new Date(
        b.startTime.toLocaleString("en-US", { timeZone: timezone })
      ).getDay();
      dayOfWeekCounts[dayIdx] = (dayOfWeekCounts[dayIdx] || 0) + 1;
    }

    const completionRate =
      totalBookings > 0 ? Math.round((confirmedCount / totalBookings) * 1000) / 10 : 100;

    const summary: AnalyticsSummary = {
      totalBookings,
      confirmedCount,
      cancelledCount,
      rescheduledCount,
      completionRate,
      totalMeetingMinutes,
    };

    const eventTypes: EventTypeMetric[] = Array.from(eventTypeMap.entries())
      .map(([eventTypeId, item]) => ({
        eventTypeId,
        title: item.title,
        count: item.count,
        durationMinutes: item.durationMinutes,
        percentage:
          totalBookings > 0 ? Math.round((item.count / totalBookings) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const dailyTrends: DailyBookingMetric[] = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        confirmed: counts.confirmed,
        cancelled: counts.cancelled,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dayOfWeekHeatmap: DayOfWeekMetric[] = dayOfWeekCounts.map((count, idx) => ({
      dayOfWeek: idx,
      dayName: DAY_NAMES[idx] || "Day",
      count,
    }));

    return {
      timeframe: range,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      summary,
      eventTypes,
      dailyTrends,
      dayOfWeekHeatmap,
    };
  }
}
