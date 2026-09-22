"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Check,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
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

interface InitialState {
  name: string;
  timeZone: string;
  days: DaySchedule[];
  overrides: ScheduleOverride[];
}

export function AvailabilityEditor() {
  const [initialState, setInitialState] = useState<InitialState | null>(null);
  const [timeZone, setTimeZone] = useState<string>("UTC");
  const [name, setName] = useState<string>("Working Hours");
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        setInitialState({
          name: data.name,
          timeZone: data.timeZone,
          days: data.days,
          overrides: data.overrides,
        });
      } catch {
        toast.error("Failed to load schedule", "Please check your network connection.");
      } finally {
        setIsLoading(false);
      }
    }
    void fetchSchedule();
  }, []);

  // Compute form dirty state
  const isDirty = useMemo(() => {
    if (!initialState) return false;
    return (
      name !== initialState.name ||
      timeZone !== initialState.timeZone ||
      JSON.stringify(days) !== JSON.stringify(initialState.days) ||
      JSON.stringify(overrides) !== JSON.stringify(initialState.overrides)
    );
  }, [name, timeZone, days, overrides, initialState]);

  const handleDiscard = () => {
    if (!initialState) return;
    setName(initialState.name);
    setTimeZone(initialState.timeZone);
    setDays(initialState.days);
    setOverrides(initialState.overrides);
    toast.info("Changes discarded", "Reset to original schedule.");
  };

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
      toast.info("Date override updated", newOverrideDate);
    } else {
      setOverrides((prev) => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)));
      toast.success("Date override added", newOverrideDate);
    }

    setNewOverrideDate("");
  };

  const removeOverride = (date: string) => {
    setOverrides((prev) => prev.filter((o) => o.date !== date));
    toast.info("Date override removed", date);
  };

  const handleSave = async () => {
    setIsSaving(true);
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
      setInitialState({
        name: updated.name,
        timeZone: updated.timeZone,
        days: updated.days,
        overrides: updated.overrides,
      });
      toast.success("Schedule saved", "Your weekly availability has been updated.");
    } catch {
      toast.error("Could not save schedule", "Ensure all start times precede end times.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-4xl space-y-6 pb-16">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-40 rounded-xl border border-[var(--border-subtle)]" />
          <Skeleton className="h-96 rounded-xl border border-[var(--border-subtle)]" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl space-y-8 pb-24">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Availability</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Configure your default working hours, recurring weekly schedules, and date overrides.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            size="sm"
            className="self-start sm:self-auto gap-2"
          >
            {isSaving ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
            <span>{isSaving ? "Saving…" : "Save Changes"}</span>
          </Button>
        </div>

        {/* General Schedule Settings */}
        <Card className="p-6 bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-xs space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Globe className="h-4 w-4 text-[var(--text-secondary)]" />
            <span>Timezone & Schedule Settings</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-name">Schedule Name</Label>
              <Input
                id="schedule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedule-timezone">Host Timezone</Label>
              <Select
                id="schedule-timezone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="font-mono text-xs"
              >
                {availableTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        {/* Weekly Recurring Availability Editor */}
        <Card className="p-6 bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Weekly Hours</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Define the hours when you are available for bookings every week.
            </p>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
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
                      className="h-4 w-4 rounded border-[var(--border-strong)] text-neutral-900 focus:ring-[var(--focus-ring)] cursor-pointer"
                    />
                    <label
                      htmlFor={`day-${day}`}
                      className={`text-sm font-medium cursor-pointer select-none leading-none ${
                        enabled ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {dayName}
                    </label>
                  </div>

                  {/* Intervals list or Unavailable label */}
                  <div className="flex-1 space-y-2">
                    {!enabled ? (
                      <div className="flex h-8 items-center">
                        <span className="text-xs font-medium text-[var(--text-disabled)]">
                          Unavailable
                        </span>
                      </div>
                    ) : (
                      intervals.map((interval, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <div className="w-28">
                            <Select
                              size="sm"
                              value={interval.startTime}
                              onChange={(e) => updateIntervalTime(day, idx, "startTime", e.target.value)}
                              className="tabular-nums font-sans"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <span className="text-xs text-[var(--text-muted)] select-none px-0.5">—</span>

                          <div className="w-28">
                            <Select
                              size="sm"
                              value={interval.endTime}
                              onChange={(e) => updateIntervalTime(day, idx, "endTime", e.target.value)}
                              className="tabular-nums font-sans"
                            >
                              {TIME_OPTIONS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </Select>
                          </div>

                          {intervals.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeInterval(day, idx)}
                              className="text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50"
                              title="Remove interval"
                              aria-label="Remove interval"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          {idx === intervals.length - 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addInterval(day)}
                              className="border-dashed gap-1 text-xs"
                              title="Add split shift interval"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add interval</span>
                            </Button>
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
        <Card className="p-6 bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-xs space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[var(--text-secondary)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Date-Specific Overrides</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Add vacation days, holidays, or specific dates with custom working hours.
            </p>
          </div>

          {/* Add Override Form */}
          <form onSubmit={handleAddOverride} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Add Date Override</p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="override-date">Select Date</Label>
                <Input
                  id="override-date"
                  type="date"
                  size="sm"
                  value={newOverrideDate}
                  onChange={(e) => setNewOverrideDate(e.target.value)}
                  className="w-40"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Type</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewOverrideUnavailable(true)}
                    className={`h-8 rounded-lg px-3 text-xs font-medium border transition-[background-color,border-color,color] duration-150 cursor-pointer ${
                      newOverrideUnavailable
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                    }`}
                  >
                    Unavailable (All day)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOverrideUnavailable(false)}
                    className={`h-8 rounded-lg px-3 text-xs font-medium border transition-[background-color,border-color,color] duration-150 cursor-pointer ${
                      !newOverrideUnavailable
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                    }`}
                  >
                    Custom Hours
                  </button>
                </div>
              </div>

              {!newOverrideUnavailable && (
                <div className="flex items-center gap-2">
                  <div className="w-28 space-y-1">
                    <Label>Start</Label>
                    <Select
                      size="sm"
                      value={newOverrideStart}
                      onChange={(e) => setNewOverrideStart(e.target.value)}
                      className="tabular-nums font-sans"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] mt-5">—</span>
                  <div className="w-28 space-y-1">
                    <Label>End</Label>
                    <Select
                      size="sm"
                      value={newOverrideEnd}
                      onChange={(e) => setNewOverrideEnd(e.target.value)}
                      className="tabular-nums font-sans"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="sm"
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Override</span>
              </Button>
            </div>
          </form>

          {/* List Existing Overrides */}
          {overrides.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-2">No date overrides configured.</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              {overrides.map((override) => (
                <div key={override.date} className="flex items-center justify-between p-3.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">{override.date}</span>
                    {override.isUnavailable ? (
                      <Badge variant="danger">Unavailable (Blackout)</Badge>
                    ) : (
                      <Badge variant="success">Custom: {override.startTime} – {override.endTime}</Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOverride(override.date)}
                    className="text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50"
                    title="Delete override"
                    aria-label="Delete override"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Minimal Floating Dirty-State Unsaved Changes Bar */}
        {isDirty && (
          <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-xl w-full z-[60] bg-neutral-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-5 fade-in-0 duration-200 border border-neutral-800">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-xs font-medium text-neutral-200">
                You have unsaved changes
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={isSaving}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs h-8"
              >
                Discard
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-white text-neutral-900 hover:bg-neutral-100 text-xs h-8 gap-1.5 font-semibold"
              >
                {isSaving ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5 text-neutral-900" />}
                <span>{isSaving ? "Saving…" : "Save Changes"}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
