import { SlotsService } from "../src/schedules/slots.service";
import type { FullSchedule } from "../src/schedules/schedules.types";

describe("SlotsService", () => {
  const service = new SlotsService();

  const mockSchedule: FullSchedule = {
    id: "sch-1",
    userId: "usr-1",
    name: "Working Hours",
    timeZone: "America/New_York",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    days: [
      { id: "d1", scheduleId: "sch-1", dayOfWeek: 1, startTime: "09:00", endTime: "11:00" }, // Monday 9-11
      { id: "d2", scheduleId: "sch-1", dayOfWeek: 2, startTime: "14:00", endTime: "16:00" }, // Tuesday 14-16
    ],
    overrides: [
      {
        id: "o1",
        scheduleId: "sch-1",
        date: "2026-10-05", // A Monday
        isUnavailable: true, // Blackout holiday
        startTime: null,
        endTime: null,
        createdAt: new Date(),
      },
      {
        id: "o2",
        scheduleId: "sch-1",
        date: "2026-10-07", // A Wednesday (normally off)
        isUnavailable: false,
        startTime: "10:00",
        endTime: "11:00", // Custom override hours
        createdAt: new Date(),
      },
    ],
  };

  it("generates slots within active day intervals and applies timezone projection", () => {
    // 2026-10-12 is a Monday.
    // Host schedule: America/New_York (UTC-4 in October EDT), 09:00 - 11:00.
    // Event: 30 mins, 0 buffer, 0 notice.
    const event = {
      durationMinutes: 30,
      beforeBufferMinutes: 0,
      afterBufferMinutes: 0,
      minimumNoticeMinutes: 0,
    };

    const slots = service.computeAvailableSlots(
      mockSchedule,
      event,
      "2026-10-12",
      "2026-10-12",
      "America/New_York",
      new Date("2026-01-01T00:00:00Z") // In the past
    );

    expect(slots).toHaveLength(4); // 09:00, 09:30, 10:00, 10:30
    expect(slots[0]!.time).toBe("9:00 AM");
    expect(slots[3]!.time).toBe("10:30 AM");
    expect(slots[0]!.localDate).toBe("2026-10-12");
  });

  it("respects blackout date overrides by generating zero slots on holiday", () => {
    // 2026-10-05 is a Monday with isUnavailable = true
    const event = {
      durationMinutes: 30,
      beforeBufferMinutes: 0,
      afterBufferMinutes: 0,
      minimumNoticeMinutes: 0,
    };

    const slots = service.computeAvailableSlots(
      mockSchedule,
      event,
      "2026-10-05",
      "2026-10-05",
      "America/New_York",
      new Date("2026-01-01T00:00:00Z")
    );

    expect(slots).toHaveLength(0);
  });

  it("allows custom hours on date overrides even if the day is normally off", () => {
    // 2026-10-07 is Wednesday (normally 0 slots) with custom override 10:00 - 11:00
    const event = {
      durationMinutes: 30,
      beforeBufferMinutes: 0,
      afterBufferMinutes: 0,
      minimumNoticeMinutes: 0,
    };

    const slots = service.computeAvailableSlots(
      mockSchedule,
      event,
      "2026-10-07",
      "2026-10-07",
      "America/New_York",
      new Date("2026-01-01T00:00:00Z")
    );

    expect(slots).toHaveLength(2); // 10:00, 10:30
    expect(slots[0]!.time).toBe("10:00 AM");
    expect(slots[1]!.time).toBe("10:30 AM");
  });

  it("filters out past slots and enforces minimum notice minutes", () => {
    // 2026-10-12: Slots are 9:00, 9:30, 10:00, 10:30 EDT (EDT is UTC-4 => 13:00, 13:30, 14:00, 14:30 UTC)
    // If current time is 2026-10-12 09:15 EDT (13:15 UTC) and notice is 30 mins:
    // Threshold is 09:45 EDT (13:45 UTC).
    // Slots before 09:45 (9:00 and 9:30) must be excluded!
    const event = {
      durationMinutes: 30,
      beforeBufferMinutes: 0,
      afterBufferMinutes: 0,
      minimumNoticeMinutes: 30,
    };

    const now = new Date("2026-10-12T13:15:00.000Z"); // 09:15 AM EDT

    const slots = service.computeAvailableSlots(
      mockSchedule,
      event,
      "2026-10-12",
      "2026-10-12",
      "America/New_York",
      now
    );

    expect(slots).toHaveLength(2); // 10:00 AM, 10:30 AM
    expect(slots[0]!.time).toBe("10:00 AM");
    expect(slots[1]!.time).toBe("10:30 AM");
  });
});
