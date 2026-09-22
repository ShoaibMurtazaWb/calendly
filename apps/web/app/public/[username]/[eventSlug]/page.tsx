"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowLeft,
  User,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { ApiError, fieldErrors } from "@/lib/api-error";
import type { BookingResponse, TimeSlot } from "@sched/api-contract";

interface PublicEventDetails {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
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
  const router = useRouter();
  const { username, eventSlug } = use(params);
  const [eventDetails, setEventDetails] = useState<PublicEventDetails | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timezone state
  const [attendeeTimezone, setAttendeeTimezone] = useState<string>("UTC");
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);

  // Mobile active step ('date' | 'slots' | 'details')
  const [mobileStep, setMobileStep] = useState<"date" | "slots" | "details">("date");

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

  // Form input state
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeeNotes, setAttendeeNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});

  // Initialize browser timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setAttendeeTimezone(detected);
      setAvailableTimezones(Intl.supportedValuesOf("timeZone"));
    } catch {
      setAvailableTimezones([
        "UTC",
        "America/New_York",
        "America/Los_Angeles",
        "Europe/London",
        "Asia/Karachi",
        "Asia/Tokyo",
      ]);
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

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error("Slot Required", "Please select an available time slot first.");
      return;
    }

    setIsSubmitting(true);
    setFieldValidationErrors({});

    try {
      const result = await api<BookingResponse>(`/public/${username}/${eventSlug}/book`, {
        method: "POST",
        body: JSON.stringify({
          startUtc: selectedSlot.startUtc,
          attendeeName,
          attendeeEmail,
          attendeeTimeZone: attendeeTimezone,
          attendeeNotes: attendeeNotes || undefined,
        }),
      });

      toast.success("Booking Confirmed!", "Your meeting has been scheduled.");
      router.push(`/public/bookings/${result.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldValidationErrors(fieldErrors(err));
        toast.error("Booking Failed", err.message);
      } else {
        toast.error("Booking Failed", "An error occurred while confirming your booking.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-[480px] rounded-2xl border border-[var(--border-subtle)]" />
        </div>
      </div>
    );
  }

  if (error || !eventDetails) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-4">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Event Not Available</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">
          {error || "This booking link is invalid or no longer active."}
        </p>
        <Link
          href={`/public/${username}`}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors duration-150"
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
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0]!;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--bg-canvas)] font-sans text-[var(--text-primary)] selection:bg-neutral-900 selection:text-white">
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {/* Back Link */}
          <div className="mb-6">

          <Link
            href={`/public/${username}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All events by {eventDetails.host.name}</span>
          </Link>
        </div>

        {/* Mobile Progressive Step Selector (< 768px) */}
        <div className="flex md:hidden items-center rounded-lg bg-[var(--bg-subtle)] p-1 mb-4 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setMobileStep("date")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              mobileStep === "date"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-xs"
                : "text-[var(--text-secondary)]"
            }`}
          >
            1. Date
          </button>
          <button
            type="button"
            onClick={() => setMobileStep("slots")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              mobileStep === "slots"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-xs"
                : "text-[var(--text-secondary)]"
            }`}
          >
            2. Slot ({slots.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileStep("details")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              mobileStep === "details"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-xs"
                : "text-[var(--text-secondary)]"
            }`}
          >
            3. Details
          </button>
        </div>

        {/* Main High-Emphasis Booking Shell */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)]">
          {/* Left Column: Event & Host Details */}
          <div className="p-6 sm:p-8 lg:col-span-4 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 font-bold text-white text-xs select-none">
                  {eventDetails.host.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{eventDetails.host.name}</p>
                  <p className="text-xs font-mono text-[var(--text-muted)]">@{eventDetails.host.username}</p>
                </div>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {eventDetails.title}
                </h1>
                <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="tabular-nums font-sans">{eventDetails.durationMinutes} minutes</span>
                </div>
              </div>

              {eventDetails.description && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-3 border-t border-[var(--border-subtle)] whitespace-pre-wrap">
                  {eventDetails.description}
                </p>
              )}
            </div>

            {/* Timezone Selector Box */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <Globe className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span>Your Timezone</span>
              </div>
              <Select
                size="sm"
                value={attendeeTimezone}
                onChange={(e) => setAttendeeTimezone(e.target.value)}
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

          {/* Middle Column: Calendar Month & Date Picker */}
          <div
            className={`p-6 sm:p-8 lg:col-span-4 space-y-6 ${
              mobileStep !== "date" ? "hidden md:block" : "block"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{monthName}</h2>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 text-[var(--text-secondary)]"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-7 w-7 text-[var(--text-secondary)]"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Day Grid */}
            <div>
              <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[var(--text-muted)] mb-2">
                <span>SUN</span>
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
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
                      onClick={() => {
                        setSelectedDate(dayStr);
                        setMobileStep("slots");
                      }}
                      className={`h-9 w-9 mx-auto rounded-md text-xs tabular-nums font-sans transition-[background-color,color] duration-150 flex items-center justify-center ${
                        isSelected
                          ? "bg-neutral-900 text-white font-semibold shadow-xs"
                          : isPast
                          ? "text-[var(--text-disabled)] cursor-not-allowed"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] font-medium cursor-pointer"
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
              <span>Selected date:</span>
              <span className="font-mono font-medium text-[var(--text-primary)]">{selectedDate}</span>
            </div>
          </div>

          {/* Right Column: Time Slots & Attendee Form */}
          <div
            className={`p-6 sm:p-8 lg:col-span-4 flex flex-col justify-between space-y-6 ${
              mobileStep === "date" ? "hidden md:flex" : "flex"
            }`}
          >
            {!selectedSlot ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">Available Slots</h3>
                  <span className="rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] tabular-nums font-sans text-[var(--text-secondary)]">
                    {slots.length} slots
                  </span>
                </div>

                {isLoadingSlots ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-9 w-full rounded-lg" />
                    <Skeleton className="h-9 w-full rounded-lg" />
                    <Skeleton className="h-9 w-full rounded-lg" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                    No available slots for this date.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {slots.map((slot) => {
                      return (
                        <button
                          key={slot.startUtc}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot);
                            setMobileStep("details");
                          }}
                          className="w-full flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs tabular-nums font-sans text-[var(--text-primary)] hover:border-neutral-900 hover:bg-[var(--bg-subtle)] transition-[background-color,border-color] duration-150 ease-out cursor-pointer"
                        >
                          <span>{slot.time}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">Book →</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Attendee Form */
              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-primary)]">Confirm Booking</h3>
                    <p className="text-[11px] text-[var(--text-muted)] tabular-nums font-sans">
                      {selectedDate} at {selectedSlot.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                  >
                    Change slot
                  </button>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <Label htmlFor="attendeeName">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <Input
                      id="attendeeName"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="pl-8"
                      aria-invalid={Boolean(fieldValidationErrors.attendeeName)}
                    />
                  </div>
                  {fieldValidationErrors.attendeeName && (
                    <p className="text-[11px] text-[var(--status-danger-text)]">
                      {fieldValidationErrors.attendeeName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="attendeeEmail">Your Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <Input
                      id="attendeeEmail"
                      type="email"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      placeholder="jane@company.com"
                      required
                      className="pl-8"
                      aria-invalid={Boolean(fieldValidationErrors.attendeeEmail)}
                    />
                  </div>
                  {fieldValidationErrors.attendeeEmail && (
                    <p className="text-[11px] text-[var(--status-danger-text)]">
                      {fieldValidationErrors.attendeeEmail}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label htmlFor="attendeeNotes">Notes / Agenda (Optional)</Label>
                  <Textarea
                    id="attendeeNotes"
                    value={attendeeNotes}
                    onChange={(e) => setAttendeeNotes(e.target.value)}
                    placeholder="Briefly share what you would like to discuss..."
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full mt-2 gap-2">
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" />
                      <span>Reserving Slot…</span>
                    </>
                  ) : (
                    <span>Schedule Meeting</span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>



      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-6 text-center mt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
        >
          <span>Powered by</span>
          <Logo className="h-4 w-4" />
          <span className="font-semibold text-[var(--text-secondary)]">Sched</span>
        </Link>
      </footer>
    </div>
  );
}


