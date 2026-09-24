"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  User,
  Mail,
  MapPin,
  Video,
  PhoneCall,
  PhoneForwarded,
  Link2,
  Phone,
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
import { ApiError, fieldErrors, getExistingBookingFromError } from "@/lib/api-error";
import type { BookingResponse, CustomQuestion, PublicLocationMetadata, TimeSlot } from "@sched/api-contract";

interface PublicEventDetails {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  location: PublicLocationMetadata | null;
  customQuestions: CustomQuestion[];
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

  // Conflict & duplicate states
  const [slotConflictMessage, setSlotConflictMessage] = useState<string | null>(null);
  const [existingBookingDuplicate, setExistingBookingDuplicate] = useState<{
    id: string;
    startTime: string;
    manageUrl: string;
  } | null>(null);

  // Form input state
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeePhone, setAttendeePhone] = useState("");
  const [attendeeNotes, setAttendeeNotes] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({});

  const setCustomAnswer = (qId: string, val: string | boolean) => {
    setCustomAnswers((prev) => ({ ...prev, [qId]: val }));
  };

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

  const loadSlots = async () => {
    if (!eventDetails || !selectedDate) return;
    setIsLoadingSlots(true);
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
  };

  // Fetch slots whenever selectedDate or attendeeTimezone changes
  useEffect(() => {
    setSelectedSlot(null);
    void loadSlots();
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
    setSlotConflictMessage(null);

    try {
      const result = await api<BookingResponse>(`/public/${username}/${eventSlug}/book`, {
        method: "POST",
        body: JSON.stringify({
          startUtc: selectedSlot.startUtc,
          attendeeName,
          attendeeEmail,
          attendeeTimeZone: attendeeTimezone,
          attendeePhoneNumber: attendeePhone || undefined,
          attendeeNotes: attendeeNotes || undefined,
          customResponses: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
        }),
      });

      toast.success("Booking Confirmed!", "Your meeting has been scheduled.");
      router.push(`/public/bookings/${result.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const code = err.body?.error?.code || err.body?.code;
        if (code === "BOOKING_ALREADY_EXISTS") {
          const existing = getExistingBookingFromError(err);
          if (existing) {
            setExistingBookingDuplicate(existing);
            return;
          }
        } else if (code === "SLOT_ALREADY_BOOKED" || code === "SLOT_UNAVAILABLE") {
          setSelectedSlot(null);
          setSlotConflictMessage(
            "This time slot was just booked by someone else. Please select another available time."
          );
          setMobileStep("slots");
          void loadSlots();
          return;
        }

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
      <div className="min-h-screen bg-[var(--bg-canvas)] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-96 w-full rounded-2xl border border-[var(--border-subtle)]" />
        </div>
      </div>
    );
  }

  if (error || !eventDetails) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 text-center font-sans">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Event Not Available</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {error || "This booking link may have expired or been deactivated by the host."}
        </p>
        <Button asChild size="sm" className="mt-6">
          <Link href={`/public/${username}`}>View Host Profile</Link>
        </Button>
      </div>
    );
  }

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const daysMatrix = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysMatrix.push(null);
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    daysMatrix.push({ day, dateString: formatted });
  }

  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(currentMonth);

  const formattedSelectedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: attendeeTimezone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${selectedDate}T12:00:00Z`));

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--bg-canvas)] font-sans text-[var(--text-primary)] selection:bg-neutral-900 selection:text-white">
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Back to Host Link */}
          <Link
            href={`/public/${username}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
            <span>All events with {eventDetails.host.name}</span>
          </Link>

          {/* Mobile Tab Stepper */}
          <div className="flex md:hidden items-center justify-between border-b border-[var(--border-subtle)] pb-2 gap-2">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 font-bold text-white text-xs select-none dark:bg-neutral-100 dark:text-neutral-900">
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
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span className="tabular-nums font-sans">{eventDetails.durationMinutes}m</span>
                    </div>

                    {/* Location Badge */}
                    {eventDetails.location && (
                      <div className="flex items-center gap-1 text-[var(--text-primary)] font-medium bg-[var(--bg-subtle)] px-2 py-0.5 rounded-md">
                        {eventDetails.location.type === "IN_PERSON" && (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                            <span>In-Person{eventDetails.location.publicAddress ? `: ${eventDetails.location.publicAddress}` : ""}</span>
                          </>
                        )}
                        {eventDetails.location.type === "STATIC_VIDEO" && (
                          <>
                            <Video className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                            <span>Video Meeting</span>
                          </>
                        )}
                        {eventDetails.location.type === "CUSTOM_LINK" && (
                          <>
                            <Link2 className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                            <span>Web Conference</span>
                          </>
                        )}
                        {eventDetails.location.type === "HOST_CALLS_ATTENDEE" && (
                          <>
                            <PhoneCall className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                            <span>Phone Call (Host calls you)</span>
                          </>
                        )}
                        {eventDetails.location.type === "ATTENDEE_CALLS_HOST" && (
                          <>
                            <PhoneForwarded className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                            <span>Phone Call (You call host)</span>
                          </>
                        )}
                      </div>
                    )}
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

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1 text-center font-medium text-[11px] text-[var(--text-muted)]">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
                  <div key={dayName} className="py-1">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {daysMatrix.map((item, idx) => {
                  if (!item) {
                    return <div key={`empty-${idx}`} className="h-9 w-full" />;
                  }

                  const isSelected = selectedDate === item.dateString;
                  const isPast =
                    new Date(`${item.dateString}T23:59:59`).getTime() < new Date().setHours(0, 0, 0, 0);

                  return (
                    <button
                      key={item.dateString}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        setSelectedDate(item.dateString);
                        setMobileStep("slots");
                      }}
                      className={`h-9 w-full rounded-lg text-xs font-medium tabular-nums font-sans transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-neutral-900 text-white font-bold shadow-xs dark:bg-neutral-100 dark:text-neutral-900"
                          : isPast
                          ? "text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                          : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                      }`}
                    >
                      {item.day}
                    </button>
                  );
                })}
              </div>

              {/* Mobile next trigger */}
              <div className="md:hidden pt-4">
                <Button
                  type="button"
                  onClick={() => setMobileStep("slots")}
                  className="w-full"
                  size="sm"
                >
                  View Available Slots
                </Button>
              </div>
            </div>

            {/* Right Column: Time Slots & Attendee Form */}
            <div
              className={`p-6 sm:p-8 lg:col-span-4 space-y-6 ${
                mobileStep === "date" ? "hidden md:block" : "block"
              }`}
            >
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {formattedSelectedDate}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Select a slot in your timezone ({attendeeTimezone})
                </p>
              </div>

              {/* Duplicate Booking Detected Dialog or Slots / Form */}
              {existingBookingDuplicate ? (
                <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5 animate-in fade-in-0 duration-150">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      You already have a booking for this meeting.
                    </h3>
                    <div className="pt-2 text-xs space-y-1 text-[var(--text-secondary)]">
                      <p className="font-semibold text-[var(--text-primary)]">Existing booking:</p>
                      <p>
                        <span className="text-[var(--text-muted)]">Date: </span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: attendeeTimezone,
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(existingBookingDuplicate.startTime))}
                        </span>
                      </p>
                      <p>
                        <span className="text-[var(--text-muted)]">Time: </span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: attendeeTimezone,
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          }).format(new Date(existingBookingDuplicate.startTime))} ({attendeeTimezone})
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-[var(--text-primary)] pt-2 border-t border-[var(--border-subtle)]">
                    What would you like to do?
                  </p>

                  <div className="space-y-2">
                    <Button asChild className="w-full" size="sm">
                      <Link href={existingBookingDuplicate.manageUrl}>View Existing Booking</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onClick={() => {
                        setExistingBookingDuplicate(null);
                        setSelectedSlot(null);
                      }}
                    >
                      Choose Another Time
                    </Button>
                    <Button asChild variant="outline" className="w-full" size="sm">
                      <Link href={`${existingBookingDuplicate.manageUrl}&action=reschedule`}>
                        Reschedule Existing Booking
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : !selectedSlot ? (
                <div className="space-y-3">
                  {slotConflictMessage && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <p className="font-semibold">{slotConflictMessage}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSlotConflictMessage(null);
                          void loadSlots();
                        }}
                        className="w-full text-xs h-8"
                      >
                        Choose Another Time
                      </Button>
                    </div>
                  )}

                  {isLoadingSlots ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-6 text-center">
                      <p className="text-xs text-[var(--text-muted)]">
                        No available slots on this day. Please choose another date on the calendar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {slots.map((slot) => {
                        const dateObj = new Date(slot.startUtc);
                        const slotTimeStr = new Intl.DateTimeFormat("en-US", {
                          timeZone: attendeeTimezone,
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }).format(dateObj);

                        return (
                          <button
                            key={slot.startUtc}
                            type="button"
                            onClick={() => {
                              setSelectedSlot(slot);
                              setMobileStep("details");
                            }}
                            className="w-full flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-neutral-900 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 dark:hover:border-white transition-[background-color,border-color,color] duration-150 ease-out cursor-pointer shadow-2xs group"
                          >
                            <span className="tabular-nums font-sans">{slotTimeStr}</span>
                            <span className="text-[11px] font-medium text-[var(--text-muted)] group-hover:text-white/80 dark:group-hover:text-neutral-700">
                              Select →
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Details Submission Form */
                <form onSubmit={handleBookSubmit} className="space-y-4 animate-in fade-in-0 duration-150">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone: attendeeTimezone,
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }).format(new Date(selectedSlot.startUtc))}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono">
                        {formattedSelectedDate}
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

                  {/* Attendee Phone Number if HOST_CALLS_ATTENDEE */}
                  {eventDetails.location?.type === "HOST_CALLS_ATTENDEE" && (
                    <div className="space-y-1">
                      <Label htmlFor="attendeePhone">Your Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <Input
                          id="attendeePhone"
                          type="tel"
                          value={attendeePhone}
                          onChange={(e) => setAttendeePhone(e.target.value)}
                          placeholder="+14155552671"
                          required
                          className="pl-8 font-mono text-xs"
                          aria-invalid={Boolean(fieldValidationErrors.attendeePhoneNumber)}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Include country code (e.g. +14155552671). The host will dial you directly.
                      </p>
                      {fieldValidationErrors.attendeePhoneNumber && (
                        <p className="text-[11px] text-[var(--status-danger-text)]">
                          {fieldValidationErrors.attendeePhoneNumber}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custom Questions */}
                  {eventDetails.customQuestions && eventDetails.customQuestions.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                      {eventDetails.customQuestions.map((q) => {
                        const val = customAnswers[q.id];

                        if (q.type === "TEXT") {
                          return (
                            <div key={q.id} className="space-y-1">
                              <Label htmlFor={`q_${q.id}`}>
                                {q.label}{" "}
                                {q.required && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                id={`q_${q.id}`}
                                value={typeof val === "string" ? val : ""}
                                onChange={(e) => setCustomAnswer(q.id, e.target.value)}
                                placeholder={q.placeholder || ""}
                                required={q.required}
                              />
                            </div>
                          );
                        }

                        if (q.type === "TEXTAREA") {
                          return (
                            <div key={q.id} className="space-y-1">
                              <Label htmlFor={`q_${q.id}`}>
                                {q.label}{" "}
                                {q.required && <span className="text-red-500">*</span>}
                              </Label>
                              <Textarea
                                id={`q_${q.id}`}
                                value={typeof val === "string" ? val : ""}
                                onChange={(e) => setCustomAnswer(q.id, e.target.value)}
                                placeholder={q.placeholder || ""}
                                required={q.required}
                                rows={2}
                              />
                            </div>
                          );
                        }

                        if (q.type === "SELECT") {
                          return (
                            <div key={q.id} className="space-y-1">
                              <Label htmlFor={`q_${q.id}`}>
                                {q.label}{" "}
                                {q.required && <span className="text-red-500">*</span>}
                              </Label>
                              <select
                                id={`q_${q.id}`}
                                value={typeof val === "string" ? val : ""}
                                onChange={(e) => setCustomAnswer(q.id, e.target.value)}
                                required={q.required}
                                className="w-full h-9 rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-900 shadow-xs focus:border-neutral-900 focus:outline-none dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100"
                              >
                                <option value="">Select an option...</option>
                                {q.options.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        if (q.type === "CHECKBOX") {
                          return (
                            <div key={q.id} className="pt-1">
                              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  id={`q_${q.id}`}
                                  checked={Boolean(val)}
                                  onChange={(e) => setCustomAnswer(q.id, e.target.checked)}
                                  required={q.required}
                                  className="mt-0.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 h-4 w-4"
                                />
                                <span className="text-xs text-[var(--text-primary)] leading-tight">
                                  {q.label}{" "}
                                  {q.required && <span className="text-red-500">*</span>}
                                </span>
                              </label>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}

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
