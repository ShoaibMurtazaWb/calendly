"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  User,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  History,
  MapPin,
  Video,
  PhoneCall,
  PhoneForwarded,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { BookingResponse, TimeSlot } from "@sched/api-contract";

export default function PublicBookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [capabilityToken, setCapabilityToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation dialog state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Rescheduling state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleStep, setRescheduleStep] = useState<"date" | "slot" | "confirm">("date");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Bootstrap capability token and remove from URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    let token = tokenFromUrl;

    if (tokenFromUrl) {
      // Store in session storage for refreshing
      try {
        sessionStorage.setItem(`booking_token_${id}`, tokenFromUrl);
      } catch {
        // Ignore storage errors
      }
      // Remove token query param from visible browser URL without reloading
      urlParams.delete("token");
      const newRelativePathQuery =
        window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : "");
      window.history.replaceState({}, "", newRelativePathQuery);
    } else {
      try {
        token = sessionStorage.getItem(`booking_token_${id}`);
      } catch {
        // Ignore storage errors
      }
    }

    setCapabilityToken(token);
  }, [id]);

  useEffect(() => {
    async function loadBooking() {
      setIsLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (capabilityToken) {
          headers["x-booking-token"] = capabilityToken;
        }
        const data = await api<BookingResponse>(`/public/bookings/${id}`, {
          headers,
        });
        setBooking(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Booking not found or this link is no longer valid.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Booking not found or this link is no longer valid.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void loadBooking();
  }, [id, capabilityToken]);

  // Load slots when rescheduling
  useEffect(() => {
    if (!isRescheduling || !booking || !selectedDate) return;

    async function fetchSlots() {
      if (!booking) return;
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const data = await api<TimeSlot[]>(
          `/public/${booking.host.username}/${booking.eventType.slug}/slots?startDate=${selectedDate}&endDate=${selectedDate}&timezone=${encodeURIComponent(
            booking.attendeeTimeZone
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
  }, [isRescheduling, booking, selectedDate]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const headers: Record<string, string> = {};
      if (capabilityToken) {
        headers["x-booking-token"] = capabilityToken;
      }

      const updated = await api<BookingResponse>(`/public/bookings/${id}/cancel`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          expectedSequence: booking.sequence,
          reason: cancelReason || undefined,
        }),
      });
      setBooking(updated);
      setIsCancelOpen(false);
      toast.success("Meeting Cancelled", "Your booking has been cancelled successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Cancellation Failed", err.message);
      } else {
        toast.error("Cancellation Failed", "An error occurred while cancelling.");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!booking || !selectedSlot) return;
    setIsSubmittingReschedule(true);
    try {
      const headers: Record<string, string> = {};
      if (capabilityToken) {
        headers["x-booking-token"] = capabilityToken;
      }

      const updated = await api<BookingResponse>(`/public/bookings/${id}/reschedule`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          newStartUtc: selectedSlot.startUtc,
          expectedSequence: booking.sequence,
          reason: rescheduleReason || undefined,
        }),
      });

      setBooking(updated);
      setIsRescheduling(false);
      setSelectedSlot(null);
      setRescheduleReason("");
      setRescheduleStep("date");
      toast.success("Meeting Rescheduled", "Your booking has been updated with the new time slot.");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Rescheduling Failed", err.message);
      } else {
        toast.error("Rescheduling Failed", "Could not reschedule to the chosen slot.");
      }
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-xl space-y-6">
          <Skeleton className="h-6 w-32 mx-auto rounded-md" />
          <Skeleton className="h-96 w-full rounded-2xl border border-[var(--border-subtle)]" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Booking Not Found</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-sm">
          {error || "Booking not found or this link is no longer valid."}
        </p>
        <Button asChild size="sm" className="mt-6">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  const isCancelled = booking.status === "CANCELLED";
  const isRescheduled = booking.rescheduleCount > 0;

  // Formatted date and times
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.attendeeTimeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(startDate);

  const formattedStartTime = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.attendeeTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startDate);

  const formattedEndTime = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.attendeeTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(endDate);

  const hostFormattedTime = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startDate);

  // Google Calendar URL generator
  const formatGoogleTime = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${booking.eventType.title} with ${booking.host.name}`
  )}&dates=${formatGoogleTime(startDate)}/${formatGoogleTime(endDate)}&details=${encodeURIComponent(
    `Meeting between ${booking.host.name} and ${booking.attendeeName}\n\nNotes: ${booking.attendeeNotes || "None"}`
  )}`;

  // Outlook Calendar URL generator
  const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
    `${booking.eventType.title} with ${booking.host.name}`
  )}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(
    `Meeting with ${booking.host.name}\n\nNotes: ${booking.attendeeNotes || "None"}`
  )}`;

  // ICS download URL with token if present
  const icsDownloadUrl = `/api/v1/public/bookings/${booking.id}/ics${
    capabilityToken ? `?token=${encodeURIComponent(capabilityToken)}` : ""
  }`;

  // Calendar matrix generator for reschedule picker
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ day: d, dateStr: formatted });
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(currentMonth);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--bg-canvas)] font-sans text-[var(--text-primary)] selection:bg-neutral-900 selection:text-white">
      <main className="flex-1 py-12 px-4 sm:px-6 flex flex-col justify-center">
        <div className="mx-auto max-w-xl w-full">
          {/* Card Shell */}
          <Card className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-sm">
            {/* Header Status */}
            <div className="text-center pb-6 border-b border-[var(--border-subtle)]">
              {isCancelled ? (
                <>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] mb-3">
                    <XCircle className="h-7 w-7" />
                  </div>
                  <Badge variant="danger" className="mb-2">
                    Cancelled
                  </Badge>
                  <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    Meeting Cancelled
                  </h1>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {booking.cancelledBy === "HOST"
                      ? `Cancelled by host (${booking.host.name})`
                      : "Cancelled by attendee"}
                    {booking.cancellationReason && ` · "${booking.cancellationReason}"`}
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-text)] mb-3">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Badge variant="success">Confirmed</Badge>
                    {isRescheduled && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        <span>Revision #{booking.sequence}</span>
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    {isRescheduled ? "Meeting Rescheduled!" : "You are scheduled!"}
                  </h1>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {isRescheduled
                      ? `Updated confirmation details for your session with ${booking.host.name}.`
                      : `A calendar invitation has been generated for your session with ${booking.host.name}.`}
                  </p>
                </>
              )}
            </div>

            {/* Meeting Details Content */}
            <div className="py-6 space-y-4 text-xs">
              {/* Previous time notice if rescheduled */}
              {isRescheduled && booking.previousStartTime && !isCancelled && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 p-3.5 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Rescheduled from previous time:</p>
                    <p className="text-[11px]">
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: booking.attendeeTimeZone,
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(booking.previousStartTime))}
                      {booking.rescheduleReason && ` · Reason: "${booking.rescheduleReason}"`}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      {booking.eventType.title}
                    </h2>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      with {booking.host.name} (@{booking.host.username})
                    </p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums font-sans">
                    {booking.eventType.durationMinutes}m
                  </Badge>
                </div>

                {/* Date and Time */}
                <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
                  <CalendarIcon className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{formattedDate}</p>
                    <p className="tabular-nums font-sans">
                      {formattedStartTime} – {formattedEndTime} ({booking.attendeeTimeZone})
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                      Host local: {hostFormattedTime} ({booking.host.timezone})
                    </p>
                  </div>
                </div>

                {/* Attendee Info */}
                <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                  <User className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                  <span>
                    {booking.attendeeName} ({booking.attendeeEmail})
                  </span>
                </div>

                {/* Location / Meeting Details */}
                {booking.location && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
                    <p className="font-semibold text-[var(--text-primary)]">Location & Meeting Details:</p>
                    {booking.location.type === "IN_PERSON" && (
                      <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                        <MapPin className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {String(booking.location.data.address || "In-Person Venue")}
                          </p>
                          {Boolean(booking.location.data.extraNotes) && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                              {String(booking.location.data.extraNotes)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {(booking.location.type === "STATIC_VIDEO" || booking.location.type === "CUSTOM_LINK") && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                          <a
                            href={String(booking.location.data.url || "#")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {String(booking.location.data.url || "Join Meeting")}
                          </a>
                        </div>
                        {Boolean(booking.location.data.extraNotes) && (
                          <p className="text-[11px] text-[var(--text-muted)] pl-6">
                            {String(booking.location.data.extraNotes)}
                          </p>
                        )}
                      </div>
                    )}
                    {booking.location.type === "HOST_CALLS_ATTENDEE" && (
                      <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                        <PhoneCall className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            Host will call you at: {booking.attendeePhoneNumber || "your phone number"}
                          </p>
                          {Boolean(booking.location.data.extraNotes) && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                              {String(booking.location.data.extraNotes)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {booking.location.type === "ATTENDEE_CALLS_HOST" && (
                      <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                        <PhoneForwarded className="h-4 w-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            Please call host at: {String(booking.location.data.hostPhoneNumber || "")}
                          </p>
                          {Boolean(booking.location.data.extraNotes) && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                              {String(booking.location.data.extraNotes)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Form Answers */}
                {booking.customResponses && booking.customResponses.length > 0 && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                    <p className="font-semibold text-[var(--text-primary)]">Custom Form Answers:</p>
                    <div className="space-y-1.5 text-xs">
                      {booking.customResponses.map((r) => (
                        <div
                          key={r.questionId}
                          className="flex flex-col sm:flex-row sm:justify-between text-[var(--text-secondary)] py-0.5 border-b border-[var(--border-subtle)]/50 last:border-b-0"
                        >
                          <span className="font-medium text-[var(--text-muted)]">{r.label}:</span>
                          <span className="font-semibold text-[var(--text-primary)] sm:text-right">
                            {r.type === "CHECKBOX"
                              ? r.value
                                ? "✓ Yes"
                                : "No"
                              : r.type === "SELECT"
                              ? r.selectedOptionLabel || String(r.value)
                              : String(r.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {booking.attendeeNotes && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <p className="font-medium text-[var(--text-primary)]">Notes / Agenda:</p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)] whitespace-pre-wrap">
                      {booking.attendeeNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Calendar Export Actions (if not cancelled) */}
              {!isCancelled && !isRescheduling && (
                <div className="space-y-2 pt-2">
                  <p className="font-semibold text-[var(--text-primary)] text-xs">Add to Calendar:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button asChild variant="outline" size="sm" className="w-full justify-center">
                      <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Google Cal
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="w-full justify-center">
                      <a href={outlookCalendarUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Outlook
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="w-full justify-center">
                      <a href={icsDownloadUrl} download>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        .ics File
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* Interactive Reschedule Flow */}
              {!isCancelled && isRescheduling && (
                <div className="rounded-xl border border-neutral-900/20 bg-[var(--bg-canvas)] p-4 space-y-4 animate-in fade-in-0 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                        Reschedule Meeting
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsRescheduling(false);
                        setSelectedSlot(null);
                        setRescheduleStep("date");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* Step Indicators on Mobile */}
                  <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)] sm:hidden">
                    <span
                      className={rescheduleStep === "date" ? "text-neutral-950 font-bold" : ""}
                    >
                      1. Date
                    </span>
                    <span>→</span>
                    <span
                      className={rescheduleStep === "slot" ? "text-neutral-950 font-bold" : ""}
                    >
                      2. Slot
                    </span>
                    <span>→</span>
                    <span
                      className={rescheduleStep === "confirm" ? "text-neutral-950 font-bold" : ""}
                    >
                      3. Confirm
                    </span>
                  </div>

                  {/* Date Picker Section */}
                  {(rescheduleStep === "date" || typeof window === "undefined") && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--text-primary)]">
                          {monthLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCurrentMonth(new Date(year, month - 1, 1))
                            }
                            className="h-7 w-7 p-0"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setCurrentMonth(new Date(year, month + 1, 1))
                            }
                            className="h-7 w-7 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                          <div key={d} className="text-[10px] font-medium text-[var(--text-muted)] py-1">
                            {d}
                          </div>
                        ))}
                        {calendarDays.map((item, idx) => {
                          if (!item) {
                            return <div key={`empty-${idx}`} className="h-8" />;
                          }
                          const isSelected = selectedDate === item.dateStr;
                          const isPast =
                            new Date(`${item.dateStr}T23:59:59`).getTime() <
                            new Date().setHours(0, 0, 0, 0);

                          return (
                            <button
                              key={item.dateStr}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                setSelectedDate(item.dateStr);
                                setRescheduleStep("slot");
                              }}
                              className={`h-8 w-full rounded-md text-xs font-medium transition-colors ${
                                isSelected
                                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold"
                                  : isPast
                                  ? "text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                                  : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer"
                              }`}
                            >
                              {item.day}
                            </button>
                          );
                        })}
                      </div>

                      <div className="sm:hidden flex justify-end pt-2">
                        <Button
                          size="sm"
                          onClick={() => setRescheduleStep("slot")}
                        >
                          Continue to Times
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Slot Selection Section */}
                  {(rescheduleStep === "slot" || typeof window === "undefined") && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs text-[var(--text-primary)]">
                          Available times on {selectedDate} ({booking.attendeeTimeZone}):
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="sm:hidden text-xs h-7"
                          onClick={() => setRescheduleStep("date")}
                        >
                          Change Date
                        </Button>
                      </div>

                      {isLoadingSlots ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <Skeleton className="h-9 w-full rounded-lg" />
                          <Skeleton className="h-9 w-full rounded-lg" />
                          <Skeleton className="h-9 w-full rounded-lg" />
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                          No slots available on this date. Please pick another date.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                          {slots.map((s) => {
                            const isSelected = selectedSlot?.startUtc === s.startUtc;
                            const timeLabel = new Intl.DateTimeFormat("en-US", {
                              timeZone: booking.attendeeTimeZone,
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }).format(new Date(s.startUtc));

                            return (
                              <button
                                key={s.startUtc}
                                type="button"
                                onClick={() => {
                                  setSelectedSlot(s);
                                  setRescheduleStep("confirm");
                                }}
                                className={`px-3 py-2 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                                  isSelected
                                    ? "border-neutral-900 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                    : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-neutral-400"
                                }`}
                              >
                                {timeLabel}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reschedule Confirmation Review */}
                  {rescheduleStep === "confirm" && selectedSlot && (
                    <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                      <div className="rounded-lg bg-[var(--bg-subtle)] p-3 space-y-1 text-xs">
                        <p className="font-semibold text-[var(--text-primary)]">
                          New Meeting Time:
                        </p>
                        <p className="text-[var(--text-secondary)]">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: booking.attendeeTimeZone,
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(selectedSlot.startUtc))}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-xs text-[var(--text-secondary)]">
                          Reason for Rescheduling (Optional)
                        </label>
                        <input
                          type="text"
                          value={rescheduleReason}
                          onChange={(e) => setRescheduleReason(e.target.value)}
                          placeholder="e.g. Need to move to later in the week..."
                          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRescheduleStep("slot")}
                        >
                          Back
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSubmittingReschedule}
                          onClick={handleConfirmReschedule}
                        >
                          {isSubmittingReschedule ? (
                            <>
                              <Spinner size="sm" />
                              <span>Rescheduling…</span>
                            </>
                          ) : (
                            <span>Confirm Reschedule</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reschedule / Cancellation Action Bar */}
              {!isCancelled && !isRescheduling && (
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                  {isCancelOpen ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-3">
                      <p className="font-semibold text-[var(--text-primary)]">Cancel this booking?</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        This will release your reserved time slot and notify {booking.host.name}.
                      </p>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Optional reason for cancellation..."
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCancelOpen(false)}
                        >
                          Keep Meeting
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isCancelling}
                          onClick={handleCancelBooking}
                        >
                          {isCancelling ? (
                            <>
                              <Spinner size="sm" />
                              <span>Cancelling…</span>
                            </>
                          ) : (
                            <span>Confirm Cancellation</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>Need to make changes?</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRescheduling(true);
                            setRescheduleStep("date");
                          }}
                          className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Reschedule</span>
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => setIsCancelOpen(true)}
                          className="font-medium text-rose-600 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <Link
                href={`/public/${booking.host.username}`}
                className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Book another meeting</span>
              </Link>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-6 text-center">
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
