import { Injectable } from "@nestjs/common";
import type { ScheduleResponse, TimeSlot } from "@sched/api-contract";

interface EventTypeConfig {
  durationMinutes: number;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumNoticeMinutes: number;
}

@Injectable()
export class SlotsService {
  computeAvailableSlots(
    schedule: ScheduleResponse,
    eventType: EventTypeConfig,
    startDateStr: string,
    endDateStr: string,
    inviteeTimezone: string,
    now: Date = new Date(),
    existingBookings: Array<{ startTime: Date; endTime: Date }> = []
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const hostTimeZone = schedule.timeZone || "UTC";

    const currentDate = new Date(startDateStr + "T00:00:00Z");
    const targetEndDate = new Date(endDateStr + "T00:00:00Z");

    if (currentDate > targetEndDate) return [];

    const overridesMap = new Map<string, (typeof schedule.overrides)[number]>();
    for (const override of schedule.overrides) {
      overridesMap.set(override.date, override);
    }

    const minNoticeMs = eventType.minimumNoticeMinutes * 60 * 1000;
    const nowThreshold = new Date(now.getTime() + minNoticeMs);

    let loopSafety = 0;
    while (currentDate <= targetEndDate && loopSafety < 60) {
      loopSafety++;

      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getUTCDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const override = overridesMap.get(dateStr);

      if (override?.isUnavailable) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        continue;
      }

      let intervals: Array<{ startTime: string; endTime: string }> = [];

      if (override && override.startTime && override.endTime) {
        intervals = [{ startTime: override.startTime, endTime: override.endTime }];
      } else {
        // Calculate day of week (0=Sun..6=Sat) in host timezone
        const hostDayOfWeek = this.getDayOfWeekInTimezone(dateStr, hostTimeZone);
        intervals = schedule.days
          .filter((d) => d.dayOfWeek === hostDayOfWeek)
          .map((d) => ({ startTime: d.startTime, endTime: d.endTime }));
      }

      for (const interval of intervals) {
        const intervalSlots = this.generateIntervalSlots(
          dateStr,
          interval.startTime,
          interval.endTime,
          eventType.durationMinutes,
          eventType.beforeBufferMinutes,
          eventType.afterBufferMinutes,
          hostTimeZone,
          inviteeTimezone,
          nowThreshold
        );
        slots.push(...intervalSlots);
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Filter out any slots that collide with existing confirmed bookings
    const availableSlots = slots.filter((slot) => {
      const slotStart = new Date(slot.startUtc).getTime();
      const slotEnd = new Date(slot.endUtc).getTime();
      const blockedStart = slotStart - eventType.beforeBufferMinutes * 60 * 1000;
      const blockedEnd = slotEnd + eventType.afterBufferMinutes * 60 * 1000;

      for (const booking of existingBookings) {
        const bookingStart = new Date(booking.startTime).getTime();
        const bookingEnd = new Date(booking.endTime).getTime();

        // Check interval overlap: [blockedStart, blockedEnd] overlaps [bookingStart, bookingEnd]
        if (blockedStart < bookingEnd && blockedEnd > bookingStart) {
          return false;
        }
      }
      return true;
    });

    // Sort all slots chronologically by UTC start time
    availableSlots.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime());

    return availableSlots;
  }

  private generateIntervalSlots(
    dateStr: string,
    startTimeStr: string,
    endTimeStr: string,
    durationMinutes: number,
    beforeBufferMinutes: number,
    afterBufferMinutes: number,
    hostTimeZone: string,
    inviteeTimeZone: string,
    nowThreshold: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const [startHour, startMinute] = startTimeStr.split(":").map(Number);
    const [endHour, endMinute] = endTimeStr.split(":").map(Number);

    let currentMinutes = (startHour ?? 0) * 60 + (startMinute ?? 0) + beforeBufferMinutes;
    const intervalEndMinutes = (endHour ?? 0) * 60 + (endMinute ?? 0) - afterBufferMinutes;

    // Slot step is either 15 minutes, 30 minutes, or the duration (whichever is smaller)
    const step = Math.min(30, durationMinutes);

    while (currentMinutes + durationMinutes <= intervalEndMinutes) {
      const slotHour = Math.floor(currentMinutes / 60);
      const slotMin = currentMinutes % 60;
      const slotTimeStr = `${String(slotHour).padStart(2, "0")}:${String(slotMin).padStart(2, "0")}`;

      const slotStartUtc = this.zonedTimeToUtc(dateStr, slotTimeStr, hostTimeZone);
      const slotEndUtc = new Date(slotStartUtc.getTime() + durationMinutes * 60 * 1000);

      // Verify slot is after the minimum notice threshold
      if (slotStartUtc > nowThreshold) {
        const formattedTime = this.formatTimeInTimezone(slotStartUtc, inviteeTimeZone);
        const localDate = this.formatDateInTimezone(slotStartUtc, inviteeTimeZone);

        slots.push({
          time: formattedTime,
          startUtc: slotStartUtc.toISOString(),
          endUtc: slotEndUtc.toISOString(),
          localDate,
        });
      }

      currentMinutes += step;
    }

    return slots;
  }

  private getDayOfWeekInTimezone(dateStr: string, timeZone: string): number {
    const [year, month, day] = dateStr.split("-").map(Number);
    const utcDate = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0));
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
    const weekday = formatter.format(utcDate);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekday] ?? 0;
  }

  private zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    const utcGuess = new Date(Date.UTC(year!, month! - 1, day!, hours!, minutes!, 0));

    const invDate = new Date(utcGuess.toLocaleString("en-US", { timeZone: "UTC" }));
    const targetDate = new Date(utcGuess.toLocaleString("en-US", { timeZone }));
    const diff = invDate.getTime() - targetDate.getTime();

    return new Date(utcGuess.getTime() + diff);
  }

  private formatTimeInTimezone(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }

  private formatDateInTimezone(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // YYYY-MM-DD
  }
}
