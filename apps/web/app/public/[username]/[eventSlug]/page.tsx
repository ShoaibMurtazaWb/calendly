"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Video,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { TimeSlot } from "@sched/api-contract";

interface PublicEventDetails {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumNoticeMinutes: number;
  host: {
    name: string;
    username: string;
    timezone: string;
  };
}

export default function PublicBookingPage({
  params,
}: {
  params: Promise<{ username: string; eventSlug: string }>;
}) {
  const { username, eventSlug } = use(params);
  const [eventDetails, setEventDetails] = useState<PublicEventDetails | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timezone state
  const [attendeeTimezone, setAttendeeTimezone] = useState<string>("UTC");
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

  // Calendar date selection
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  // Slots state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBookedSimulated, setIsBookedSimulated] = useState(false);

  // Initialize browser timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setAttendeeTimezone(detected);
      setAvailableTimezones(Intl.supportedValuesOf("timeZone"));
    } catch {
      setAvailableTimezones(["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Karachi", "Asia/Tokyo"]);
    }
  }, []);

  // Fetch event details
  useEffect(() => {
    async function loadEvent() {
      setIsLoadingEvent(true);
      setError(null);
      try {
        const data = await api<PublicEventDetails>(`/public/${username}/${eventSlug}`);
        setEventDetails(data);
      } catch {
        setError("Event not found or link has been archived.");
      } finally {
        setIsLoadingEvent(false);
      }
    }
    void loadEvent();
  }, [username, eventSlug]);

  // Fetch slots whenever selectedDate or attendeeTimezone changes
  useEffect(() => {
    if (!eventDetails || !selectedDate) return;

    async function fetchSlots() {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const data = await api<TimeSlot[]>(
          `/public/${username}/${eventSlug}/slots?startDate=${selectedDate}&endDate=${selectedDate}&timezone=${encodeURIComponent(
            attendeeTimezone
          )}`
        );
        setSlots(data);
      } catch {
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    void fetchSlots();
  }, [eventDetails, selectedDate, attendeeTimezone, username, eventSlug]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (isLoadingEvent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Clock className="h-4 w-4 animate-spin text-neutral-900" />
          <span>Loading booking calendar...</span>
        </div>
      </div>
    );
  }

  if (error || !eventDetails) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-4">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900">Event Not Available</h1>
        <p className="mt-1 text-sm text-neutral-500 max-w-sm">
          {error || "This booking link is invalid or no longer active."}
        </p>
        <Link
          href={`/public/${username}`}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
        >
          <span>View All Host Events</span>
        </Link>
      </div>
    );
  }

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = new Date().toISOString().split("T")[0]!;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/public/${username}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All events by {eventDetails.host.name}</span>
          </Link>
        </div>

        {/* Main Booking Container */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200/80">
          {/* Left Column: Event & Host Details */}
          <div className="p-8 lg:col-span-4 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 font-bold text-white text-sm">
                  {eventDetails.host.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-neutral-900">{eventDetails.host.name}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p className="text-xs text-neutral-500">@{eventDetails.host.username}</p>
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{eventDetails.title}</h1>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-neutral-600">
                  <Clock className="h-4 w-4 text-neutral-500" />
                  <span>{eventDetails.durationMinutes} minutes</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
                  <Video className="h-4 w-4 text-neutral-400" />
                  <span>Google Meet / Web Conference</span>
                </div>
              </div>

              {eventDetails.description && (
                <p className="text-xs text-neutral-600 leading-relaxed pt-2 border-t border-neutral-100 whitespace-pre-wrap">
                  {eventDetails.description}
                </p>
              )}
            </div>

            {/* Timezone Selector Box */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Globe className="h-3.5 w-3.5 text-neutral-500" />
                <span>Your Timezone</span>
              </div>
              <select
                value={attendeeTimezone}
                onChange={(e) => setAttendeeTimezone(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 focus:ring-1 focus:ring-neutral-950"
              >
                {availableTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Middle Column: Calendar Month & Date Picker */}
          <div className="p-8 lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">{monthName}</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 transition"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 transition"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar Day Grid */}
            <div>
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-neutral-400 mb-2">
                <span>SUN</span>
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-9" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isSelected = selectedDate === dayStr;
                  const isPast = dayStr < todayStr;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelectedDate(dayStr)}
                      className={`h-9 w-9 mx-auto rounded-full text-xs font-medium transition flex items-center justify-center ${
                        isSelected
                          ? "bg-neutral-900 text-white font-bold shadow-xs"
                          : isPast
                          ? "text-neutral-300 cursor-not-allowed"
                          : "text-neutral-800 hover:bg-neutral-100 font-semibold cursor-pointer"
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 text-xs text-neutral-500 flex items-center justify-between">
              <span>Selected date:</span>
              <span className="font-mono font-semibold text-neutral-900">{selectedDate}</span>
            </div>
          </div>

          {/* Right Column: Time Slots & Confirmation */}
          <div className="p-8 lg:col-span-3 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-neutral-900">Available Slots</h3>
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  {slots.length} slots
                </span>
              </div>

              {isLoadingSlots ? (
                <div className="flex h-48 items-center justify-center">
                  <Clock className="h-4 w-4 animate-spin text-neutral-500" />
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-400">
                  No time slots available for this date. Try selecting another day.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.startUtc === slot.startUtc;
                    return (
                      <button
                        key={slot.startUtc}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          isSelected
                            ? "border-neutral-900 bg-neutral-900 text-white shadow-2xs"
                            : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                        }`}
                      >
                        <span>{slot.time}</span>
                        <span className={`text-[10px] ${isSelected ? "text-neutral-200" : "text-neutral-400"}`}>
                          {isSelected ? "Selected ✓" : "Pick →"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Slot Confirmation Preview */}
            {selectedSlot && (
              <div className="rounded-xl border border-neutral-900/20 bg-neutral-50 p-4 space-y-3">
                <div className="text-xs text-neutral-700">
                  <p className="font-semibold text-neutral-900">Booking Summary</p>
                  <p className="mt-1">
                    {selectedDate} at <span className="font-bold text-neutral-900">{selectedSlot.time}</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{attendeeTimezone}</p>
                </div>

                {isBookedSimulated ? (
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2.5 text-center text-xs font-semibold text-emerald-800 animate-fade-in">
                    🎉 Booking Request Recorded!
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      setIsBookedSimulated(true);
                      setTimeout(() => setIsBookedSimulated(false), 4000);
                    }}
                    className="w-full bg-neutral-900 text-white hover:bg-neutral-800 text-xs py-2 h-8"
                  >
                    Confirm & Reserve Slot
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
