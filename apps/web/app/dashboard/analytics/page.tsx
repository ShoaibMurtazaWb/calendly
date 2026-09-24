"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { AnalyticsRange, HostAnalyticsResponse } from "@sched/api-contract";

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [data, setData] = useState<HostAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      setIsAnimated(false);
      try {
        const response = await api<HostAnalyticsResponse>(`/analytics/overview?range=${range}`);
        setData(response);
      } catch {
        toast.error("Failed to load analytics", "Could not fetch host meeting metrics.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAnalytics();
  }, [range]);

  useEffect(() => {
    if (!isLoading && data) {
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [isLoading, data]);

  const formatMinutes = (totalMinutes: number) => {
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const rangeLabels: Record<AnalyticsRange, string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    all: "All Time",
  };

  return (
    <div className="space-y-6">
        {/* Page Header with Timeframe Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Analytics & Insights
            </h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Overview of meeting volume, show rates, time commitments, and event type popularity.
            </p>
          </div>

          {/* Timeframe Filter Pills */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
            {(["7d", "30d", "90d", "all"] as AnalyticsRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  range === r
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        ) : !data || data.summary.totalBookings === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-3">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No meeting data for this period
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              Share your booking links to start scheduling meetings. Your analytics and schedule insights will automatically populate here.
            </p>
          </div>
        ) : (
          /* Analytics Dashboard View */
          <div className="space-y-6">
            {/* KPI Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Bookings */}
              <Card className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Total Bookings</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums font-sans">
                    {data.summary.totalBookings}
                  </span>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Across all event types
                  </p>
                </div>
              </Card>

              {/* Confirmed Meetings */}
              <Card className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Confirmed Sessions</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums font-sans">
                    {data.summary.confirmedCount}
                  </span>
                  <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {data.summary.completionRate}% completion rate
                  </p>
                </div>
              </Card>

              {/* Total Scheduled Time */}
              <Card className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Meeting Duration</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums font-sans">
                    {formatMinutes(data.summary.totalMeetingMinutes)}
                  </span>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Total confirmed time
                  </p>
                </div>
              </Card>

              {/* Cancellations & Reschedules */}
              <Card className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Modifications</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-rose-600 dark:text-rose-400">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <div>
                    <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums font-sans">
                      {data.summary.cancelledCount}
                    </span>
                    <span className="ml-1 text-[11px] text-[var(--status-danger-text)]">cancelled</span>
                  </div>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <div>
                    <span className="text-xl font-bold text-[var(--text-primary)] tabular-nums font-sans">
                      {data.summary.rescheduledCount}
                    </span>
                    <span className="ml-1 text-[11px] text-amber-600 dark:text-amber-400">rescheduled</span>
                  </div>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Schedule adjustments
                </p>
              </Card>
            </div>

            {/* Event Types Breakdown & Day-of-Week Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Event Type Popularity */}
              <Card className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[var(--text-muted)]" />
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        Event Types Popularity
                      </h2>
                    </div>
                    <Badge variant="secondary" className="tabular-nums font-sans text-[11px]">
                      {data.eventTypes.length} active
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-4">
                    {data.eventTypes.map((et) => (
                      <div key={et.eventTypeId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="font-medium text-[var(--text-primary)] truncate">{et.title}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">({et.durationMinutes}m)</span>
                          </div>
                          <div className="flex items-center gap-1.5 tabular-nums font-sans shrink-0">
                            <span className="font-semibold text-[var(--text-primary)]">{et.count}</span>
                            <span className="text-[var(--text-muted)] text-[11px]">({et.percentage}%)</span>
                          </div>
                        </div>
                        {/* Proportional Progress Bar */}
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F4F4F5] border border-[#E4E4E7]">
                          <div
                            className="h-full rounded-full bg-[#18181B] transition-all duration-700 ease-out"
                            style={{
                              width: isAnimated
                                ? `${Math.min(Math.max(et.percentage, 0), 100)}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                  <span>Based on total bookings</span>
                  <span className="tabular-nums font-sans font-medium text-[var(--text-secondary)]">
                    {data.summary.totalBookings} total
                  </span>
                </div>
              </Card>

              {/* Day-of-Week Meeting Distribution */}
              <Card className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        Day of Week Distribution
                      </h2>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)]">Booking frequency</span>
                  </div>

                  {/* Vertical Bar Chart Area */}
                  {(() => {
                    const maxCount = Math.max(...data.dayOfWeekHeatmap.map((d) => d.count), 0);
                    const currentDayOfWeek = new Date().getDay();

                    return (
                      <div className="pt-4">
                        {/* Chart Grid Area with Baseline */}
                        <div className="h-36 flex items-end justify-between gap-1.5 sm:gap-3 pb-1 border-b border-[var(--border-subtle)]">
                          {data.dayOfWeekHeatmap.map((day) => {
                            const hasBookings = day.count > 0;
                            const isToday = day.dayOfWeek === currentDayOfWeek;
                            const heightPercent = maxCount > 0 ? Math.round((day.count / maxCount) * 100) : 0;

                            return (
                              <div
                                key={day.dayOfWeek}
                                className="flex-1 flex flex-col items-center justify-end h-full group relative"
                              >
                                {hasBookings ? (
                                  <>
                                    {/* Hover Count Badge */}
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute -top-5 text-[10px] tabular-nums font-sans px-1.5 py-0.5 rounded bg-neutral-900 text-white pointer-events-none whitespace-nowrap z-10 shadow-xs">
                                      {day.count} {day.count === 1 ? "booking" : "bookings"}
                                    </span>
                                    {/* Active Bar */}
                                    <div
                                      className={`w-full max-w-[28px] sm:max-w-[36px] rounded-t-sm transition-all duration-700 ease-out group-hover:opacity-85 cursor-default ${
                                        isToday ? "bg-[#18181B]" : "bg-[#E5E7EB]"
                                      }`}
                                      style={{
                                        height: isAnimated
                                          ? `${Math.max(heightPercent, 8)}%`
                                          : "0%",
                                      }}
                                      title={`${day.dayName}: ${day.count} meetings${isToday ? " (Today)" : ""}`}
                                    />
                                  </>
                                ) : (
                                  /* Inactive Baseline Marker */
                                  <div
                                    className={`w-full max-w-[28px] sm:max-w-[36px] h-1 rounded-sm ${
                                      isToday ? "bg-[#18181B]" : "bg-[#E5E7EB]"
                                    }`}
                                    title={`${day.dayName}: 0 meetings${isToday ? " (Today)" : ""}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* X-Axis Labels: Day & Count */}
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 pt-2 text-center">
                          {data.dayOfWeekHeatmap.map((day) => {
                            const isToday = day.dayOfWeek === currentDayOfWeek;
                            return (
                              <div key={day.dayOfWeek} className="flex flex-col items-center">
                                <span
                                  className={`text-[11px] transition-colors ${
                                    isToday
                                      ? "font-bold text-[var(--text-primary)]"
                                      : "font-medium text-[var(--text-muted)]"
                                  }`}
                                >
                                  {day.dayName.slice(0, 3)}
                                </span>
                                <span
                                  className={`text-[10px] tabular-nums font-sans ${
                                    isToday
                                      ? "font-bold text-[var(--text-primary)]"
                                      : "font-medium text-[var(--text-muted)]"
                                  }`}
                                >
                                  {day.count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                  <span>Bookings by weekday</span>
                  <span className="tabular-nums font-sans font-medium text-[var(--text-secondary)]">
                    {data.dayOfWeekHeatmap.reduce((acc, d) => acc + d.count, 0)} sessions
                  </span>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
  );
}
