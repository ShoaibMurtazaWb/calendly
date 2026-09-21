import type { Schedule, ScheduleDay, ScheduleOverride } from "@prisma/client";
import type { ScheduleResponse } from "@sched/api-contract";

export type FullSchedule = Schedule & {
  days: ScheduleDay[];
  overrides: ScheduleOverride[];
};

export function toScheduleResponse(row: FullSchedule): ScheduleResponse {
  return {
    id: row.id,
    name: row.name,
    timeZone: row.timeZone,
    isDefault: row.isDefault,
    days: row.days.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
    })),
    overrides: row.overrides.map((o) => ({
      date: o.date,
      isUnavailable: o.isUnavailable,
      startTime: o.startTime,
      endTime: o.endTime,
    })),
  };
}
