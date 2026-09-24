import { z } from "zod";

export const analyticsRangeSchema = z.enum(["7d", "30d", "90d", "all"]).default("30d");
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;

export const analyticsQuerySchema = z.object({
  range: analyticsRangeSchema.optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface AnalyticsSummary {
  totalBookings: number;
  confirmedCount: number;
  cancelledCount: number;
  rescheduledCount: number;
  completionRate: number; // e.g. 85.5%
  totalMeetingMinutes: number;
}

export interface EventTypeMetric {
  eventTypeId: string;
  title: string;
  count: number;
  durationMinutes: number;
  percentage: number;
}

export interface DailyBookingMetric {
  date: string; // YYYY-MM-DD
  total: number;
  confirmed: number;
  cancelled: number;
}

export interface DayOfWeekMetric {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayName: string;
  count: number;
}

export interface HostAnalyticsResponse {
  timeframe: AnalyticsRange;
  startDate: string;
  endDate: string;
  summary: AnalyticsSummary;
  eventTypes: EventTypeMetric[];
  dailyTrends: DailyBookingMetric[];
  dayOfWeekHeatmap: DayOfWeekMetric[];
}
