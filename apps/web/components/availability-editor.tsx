"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Globe,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Check,
  AlertCircle,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { ScheduleResponse, DaySchedule, ScheduleOverride } from "@sched/api-contract";

const DAYS_OF_WEEK = [
  { day: 1, name: "Monday", short: "Mon" },
  { day: 2, name: "Tuesday", short: "Tue" },
  { day: 3, name: "Wednesday", short: "Wed" },
  { day: 4, name: "Thursday", short: "Thu" },
  { day: 5, name: "Friday", short: "Fri" },
  { day: 6, name: "Saturday", short: "Sat" },
  { day: 0, name: "Sunday", short: "Sun" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const hourStr = String(hours).padStart(2, "0");
  const value = `${hourStr}:${minutes}`;

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const label = `${displayHour}:${minutes} ${period}`;

  return { value, label };
});

export function AvailabilityEditor() {
  const [timeZone, setTimeZone] = useState<string>("UTC");
  const [name, setName] = useState<string>("Working Hours");
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New Override form state
  const [newOverrideDate, setNewOverrideDate] = useState<string>("");
  const [newOverrideUnavailable, setNewOverrideUnavailable] = useState(true);
  const [newOverrideStart, setNewOverrideStart] = useState("09:00");
  const [newOverrideEnd, setNewOverrideEnd] = useState("17:00");

  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

  useEffect(() => {
    try {
      setAvailableTimezones(Intl.supportedValuesOf("timeZone"));
    } catch {
      setAvailableTimezones(["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Karachi", "Asia/Tokyo"]);
    }
  }, []);

  useEffect(() => {
    async function fetchSchedule() {
      setIsLoading(true);
      try {
        const data = await api<ScheduleResponse>("/schedules/default");
        setName(data.name);
        setTimeZone(data.timeZone);
        setDays(data.days);
        setOverrides(data.overrides);
      } catch {
        setFeedback({ type: "error", message: "Failed to load schedule." });
      } finally {
        setIsLoading(false);
      }
    }
    void fetchSchedule();
  }, []);

  const isDayEnabled = (dayOfWeek: number) => {
    return days.some((d) => d.dayOfWeek === dayOfWeek);
  };

  const getDayIntervals = (dayOfWeek: number) => {
    return days.filter((d) => d.dayOfWeek === dayOfWeek);
  };

  const toggleDay = (dayOfWeek: number) => {
    if (isDayEnabled(dayOfWeek)) {
      setDays((prev) => prev.filter((d) => d.dayOfWeek !== dayOfWeek));
    } else {
      setDays((prev) => [...prev, { dayOfWeek, startTime: "09:00", endTime: "17:00" }]);
    }
  };

  const addInterval = (dayOfWeek: number) => {
    setDays((prev) => [...prev, { dayOfWeek, startTime: "13:00", endTime: "17:00" }]);
  };

  const removeInterval = (dayOfWeek: number, index: number) => {
    let dayCount = 0;
    setDays((prev) =>
      prev.filter((d) => {
        if (d.dayOfWeek === dayOfWeek) {
          const keep = dayCount !== index;
          dayCount++;
          return keep;
        }
        return true;
      })
    );
  };

  const updateIntervalTime = (
    dayOfWeek: number,
    index: number,
    field: "startTime" | "endTime",
    val: string
  ) => {
    let dayCount = 0;
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek === dayOfWeek) {
          if (dayCount === index) {
            dayCount++;
            return { ...d, [field]: val };
          }
          dayCount++;
        }
        return d;
      })
    );
  };

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOverrideDate) return;

    const existingIndex = overrides.findIndex((o) => o.date === newOverrideDate);
    const newEntry: ScheduleOverride = {
      date: newOverrideDate,
      isUnavailable: newOverrideUnavailable,
      startTime: newOverrideUnavailable ? null : newOverrideStart,
      endTime: newOverrideUnavailable ? null : newOverrideEnd,
    };

    if (existingIndex >= 0) {
      setOverrides((prev) => prev.map((o, idx) => (idx === existingIndex ? newEntry : o)));
    } else {
      setOverrides((prev) => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)));
    }

    setNewOverrideDate("");
  };

  const removeOverride = (date: string) => {
    setOverrides((prev) => prev.filter((o) => o.date !== date));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const updated = await api<ScheduleResponse>("/schedules/default", {
        method: "PUT",
        body: JSON.stringify({
          name,
          timeZone,
          days,
          overrides,
        }),
      });
      setName(updated.name);
      setTimeZone(updated.timeZone);
      setDays(updated.days);
      setOverrides(updated.overrides);
      setFeedback({ type: "success", message: "Availability schedule saved successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback({ type: "error", message: "Could not save schedule. Ensure all start times precede end times." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Clock className="h-4 w-4 animate-spin text-neutral-900" />
            <span>Loading availability schedule...</span>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Availability</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Configure your default working hours, recurring weekly schedules, and date overrides.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="self-start sm:self-auto bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs gap-2"
          >
            {isSaving ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`rounded-xl border p-4 flex items-center gap-3 text-sm transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {feedback.type === "success" ? (
              <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* General Schedule Settings */}
        <Card className="p-6 bg-white border-neutral-200/90 shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Globe className="h-4 w-4 text-neutral-600" />
            <span>Timezone & Schedule Settings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schedule-name" className="text-xs font-medium text-neutral-700">
                Schedule Name
              </Label>
              <Input
                id="schedule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-9 text-xs rounded-lg bg-neutral-50/50 border-neutral-200"
              />
            </div>

            <div>
              <Label htmlFor="schedule-timezone" className="text-xs font-medium text-neutral-700">
                Host Timezone
              </Label>
              <select
                id="schedule-timezone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-1 text-xs text-neutral-900 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950"
              >
                {availableTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Weekly Recurring Availability Editor */}
        <Card className="p-6 bg-white border-neutral-200/90 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Weekly Hours</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Define the hours when you are available for bookings every week.
            </p>
          </div>

          <div className="divide-y divide-neutral-100">
            {DAYS_OF_WEEK.map(({ day, name: dayName }) => {
              const enabled = isDayEnabled(day);
              const intervals = getDayIntervals(day);

              return (
                <div key={day} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  {/* Day Toggle */}
                  <div className="flex h-8 items-center gap-3 w-32 shrink-0">
                    <input
                      type="checkbox"
                      id={`day-${day}`}
                      checked={enabled}
                      onChange={() => toggleDay(day)}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950 cursor-pointer"
                    />
                    <label
                      htmlFor={`day-${day}`}
                      className={`text-sm font-medium cursor-pointer select-none leading-none ${
                        enabled ? "text-neutral-900" : "text-neutral-400"
                      }`}
                    >
                      {dayName}
                    </label>
                  </div>

                  {/* Intervals list or Unavailable badge */}
                  <div className="flex-1 space-y-2">
                    {!enabled ? (
                      <div className="flex h-8 items-center">
                        <span className="text-xs font-medium text-neutral-400">
                          Unavailable
                        </span>
                      </div>
                    ) : (
                      intervals.map((interval, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <select
                            value={interval.startTime}
                            onChange={(e) => updateIntervalTime(day, idx, "startTime", e.target.value)}
                            className="flex h-8 items-center rounded-lg border border-neutral-200 bg-white px-2.5 py-0 text-xs text-neutral-800 shadow-2xs focus:ring-1 focus:ring-neutral-900 leading-none cursor-pointer"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>

                          <span className="text-xs text-neutral-400 select-none leading-none px-0.5">—</span>

                          <select
                            value={interval.endTime}
                            onChange={(e) => updateIntervalTime(day, idx, "endTime", e.target.value)}
                            className="flex h-8 items-center rounded-lg border border-neutral-200 bg-white px-2.5 py-0 text-xs text-neutral-800 shadow-2xs focus:ring-1 focus:ring-neutral-900 leading-none cursor-pointer"
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>

                          {intervals.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInterval(day, idx)}
                              className="inline-flex h-8 w-8 items-center justify-center text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
                              title="Remove interval"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {idx === intervals.length - 1 && (
                            <button
                              type="button"
                              onClick={() => addInterval(day)}
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-300 px-3 text-xs font-medium text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 hover:bg-neutral-50 transition-all cursor-pointer shrink-0 leading-none"
                              title="Add split shift / lunch break window"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add interval</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Date Overrides Section */}
        <Card className="p-6 bg-white border-neutral-200/90 shadow-xs space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-neutral-600" />
              <h2 className="text-base font-semibold text-neutral-900">Date-Specific Overrides</h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Add vacation days, holidays, or specific dates with custom working hours.
            </p>
          </div>

          {/* Add Override Inline Form */}
          <form onSubmit={handleAddOverride} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Add Date Override</p>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="override-date" className="text-xs text-neutral-600">
                  Select Date
                </Label>
                <Input
                  id="override-date"
                  type="date"
                  value={newOverrideDate}
                  onChange={(e) => setNewOverrideDate(e.target.value)}
                  className="mt-1 h-8 w-40 text-xs rounded-lg bg-white border-neutral-200"
                  required
                />
              </div>

              <div>
                <Label className="text-xs text-neutral-600">Type</Label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewOverrideUnavailable(true)}
                    className={`h-8 rounded-lg px-3 text-xs font-medium border transition ${
                      newOverrideUnavailable
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    Unavailable (All day)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOverrideUnavailable(false)}
                    className={`h-8 rounded-lg px-3 text-xs font-medium border transition ${
                      !newOverrideUnavailable
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    Custom Hours
                  </button>
                </div>
              </div>

              {!newOverrideUnavailable && (
                <div className="flex items-center gap-2">
                  <div>
                    <Label className="text-xs text-neutral-600">Start</Label>
                    <select
                      value={newOverrideStart}
                      onChange={(e) => setNewOverrideStart(e.target.value)}
                      className="mt-1 flex h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs text-neutral-400 mt-5">—</span>
                  <div>
                    <Label className="text-xs text-neutral-600">End</Label>
                    <select
                      value={newOverrideEnd}
                      onChange={(e) => setNewOverrideEnd(e.target.value)}
                      className="mt-1 flex h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="sm"
                className="h-8 bg-neutral-900 text-white hover:bg-neutral-800 text-xs px-3.5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Add Override</span>
              </Button>
            </div>
          </form>

          {/* List Existing Overrides */}
          {overrides.length === 0 ? (
            <p className="text-xs text-neutral-400 py-2">No date overrides configured.</p>
          ) : (
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {overrides.map((override) => (
                <div key={override.date} className="flex items-center justify-between p-3.5 bg-white hover:bg-neutral-50/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-neutral-900">{override.date}</span>
                    {override.isUnavailable ? (
                      <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        Unavailable (Blackout)
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        Custom Hours: {override.startTime} – {override.endTime}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOverride(override.date)}
                    className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-neutral-100 transition-colors"
                    title="Delete override"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
