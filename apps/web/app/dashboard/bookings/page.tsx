"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Mail,
  ExternalLink,
  Download,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  History,
  MapPin,
  Video,
  PhoneCall,
  PhoneForwarded,
  Trash2,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { BookingResponse, TimeSlot } from "@sched/api-contract";

type TabStatus = "upcoming" | "past" | "cancelled";

export default function BookingsPage() {
  const [tab, setTab] = useState<TabStatus>("upcoming");
  const [dataByStatus, setDataByStatus] = useState<{
    upcoming: BookingResponse[];
    past: BookingResponse[];
    cancelled: BookingResponse[];
  }>({
    upcoming: [],
    past: [],
    cancelled: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Cancellation Modal state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingResponse | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Deletion Modal state
  const [deleteModalBooking, setDeleteModalBooking] = useState<BookingResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reschedule Modal state
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState<BookingResponse | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [rescheduleMonth, setRescheduleMonth] = useState<Date>(new Date());
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const loadAllBookings = async () => {
    setIsLoading(true);
    try {
      const [upcoming, past, cancelled] = await Promise.all([
        api<BookingResponse[]>("/bookings?status=upcoming"),
        api<BookingResponse[]>("/bookings?status=past"),
        api<BookingResponse[]>("/bookings?status=cancelled"),
      ]);
      setDataByStatus({ upcoming, past, cancelled });
    } catch {
      toast.error("Failed to load bookings", "Could not fetch your meeting schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAllBookings();
  }, []);

  const bookings = dataByStatus[tab];

  // Fetch slots for host rescheduling modal
  useEffect(() => {
    if (!rescheduleModalBooking || !rescheduleDate) return;

    async function fetchHostSlots() {
      if (!rescheduleModalBooking) return;
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const data = await api<TimeSlot[]>(
          `/public/${rescheduleModalBooking.host.username}/${rescheduleModalBooking.eventType.slug}/slots?startDate=${rescheduleDate}&endDate=${rescheduleDate}&timezone=${encodeURIComponent(
            rescheduleModalBooking.host.timezone
          )}`
        );
        setRescheduleSlots(data);
      } catch {
        setRescheduleSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    void fetchHostSlots();
  }, [rescheduleModalBooking, rescheduleDate]);

  const handleCancelMeeting = async () => {
    if (!cancelModalBooking) return;
    setCancellingId(cancelModalBooking.id);
    try {
      await api<BookingResponse>(`/bookings/${cancelModalBooking.id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({
          expectedSequence: cancelModalBooking.sequence,
          reason: cancelReason || undefined,
        }),
      });

      toast.success(
        "Meeting Cancelled",
        `Booking with ${cancelModalBooking.attendeeName} has been cancelled.`
      );
      setCancelModalBooking(null);
      setCancelReason("");
      void loadAllBookings();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Cancellation Failed", err.message);
      } else {
        toast.error("Cancellation Failed", "An error occurred while cancelling.");
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleRescheduleMeeting = async () => {
    if (!rescheduleModalBooking || !selectedSlot) return;
    setIsRescheduling(true);
    try {
      await api<BookingResponse>(`/bookings/${rescheduleModalBooking.id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({
          newStartUtc: selectedSlot.startUtc,
          expectedSequence: rescheduleModalBooking.sequence,
          reason: rescheduleReason || undefined,
        }),
      });

      toast.success(
        "Meeting Rescheduled",
        `Booking with ${rescheduleModalBooking.attendeeName} was successfully rescheduled.`
      );
      setRescheduleModalBooking(null);
      setSelectedSlot(null);
      setRescheduleReason("");
      void loadAllBookings();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Reschedule Failed", err.message);
      } else {
        toast.error("Reschedule Failed", "Could not reschedule to the chosen slot.");
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteModalBooking) return;
    setIsDeleting(true);
    try {
      await api<{ success: boolean }>(`/bookings/${deleteModalBooking.id}`, {
        method: "DELETE",
      });

      toast.success(
        "Booking Deleted",
        `Booking with ${deleteModalBooking.attendeeName} was removed from your history.`
      );
      setDeleteModalBooking(null);
      void loadAllBookings();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error("Deletion Failed", err.message);
      } else {
        toast.error("Deletion Failed", "An error occurred while deleting the booking.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Reschedule calendar generation
  const resYear = rescheduleMonth.getFullYear();
  const resMonth = rescheduleMonth.getMonth();
  const firstDay = new Date(resYear, resMonth, 1).getDay();
  const daysInMonth = new Date(resYear, resMonth + 1, 0).getDate();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) {
    calDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const formatted = `${resYear}-${String(resMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calDays.push({ day: d, dateStr: formatted });
  }

  const resMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(rescheduleMonth);

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Bookings & Meetings
            </h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Track upcoming sessions, review meeting histories, reschedule conflicts, and manage cancellations.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              tab === "upcoming"
                ? "text-[var(--text-primary)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
            }`}
          >
            <span>Upcoming</span>
            <Badge variant="secondary" className="tabular-nums font-sans">
              {dataByStatus.upcoming.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setTab("past")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              tab === "past"
                ? "text-[var(--text-primary)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
            }`}
          >
            <span>Past</span>
            <Badge variant="secondary" className="tabular-nums font-sans">
              {dataByStatus.past.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setTab("cancelled")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
              tab === "cancelled"
                ? "text-[var(--text-primary)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
            }`}
          >
            <span>Cancelled</span>
            <Badge variant="secondary" className="tabular-nums font-sans">
              {dataByStatus.cancelled.length}
            </Badge>
          </button>
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-3">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              No {tab} bookings found
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              {tab === "upcoming"
                ? "Share your public booking link with clients and teammates to fill your schedule."
                : `You currently have no ${tab} sessions in your history.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const startDate = new Date(b.startTime);
              const endDate = new Date(b.endTime);

              const dayOfWeek = new Intl.DateTimeFormat("en-US", {
                timeZone: b.host.timezone,
                weekday: "short",
              }).format(startDate);

              const dayNumber = new Intl.DateTimeFormat("en-US", {
                timeZone: b.host.timezone,
                day: "numeric",
              }).format(startDate);

              const monthShort = new Intl.DateTimeFormat("en-US", {
                timeZone: b.host.timezone,
                month: "short",
              }).format(startDate);

              const timeStr = `${new Intl.DateTimeFormat("en-US", {
                timeZone: b.host.timezone,
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }).format(startDate)} – ${new Intl.DateTimeFormat("en-US", {
                timeZone: b.host.timezone,
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }).format(endDate)}`;

              const isCancelled = b.status === "CANCELLED";
              const isRescheduled = b.rescheduleCount > 0;

              return (
                <Card
                  key={b.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xs hover:border-[var(--border-strong)] transition-[border-color,box-shadow] duration-150"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Date badge + Details */}
                    <div className="flex items-start gap-4">
                      {/* Date Block */}
                      <div className="flex flex-col items-center justify-center h-14 w-14 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-center shrink-0">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                          {dayOfWeek}
                        </span>
                        <span className="text-base font-bold text-[var(--text-primary)] leading-tight tabular-nums font-sans">
                          {dayNumber}
                        </span>
                        <span className="text-[9px] font-medium uppercase text-[var(--text-muted)]">
                          {monthShort}
                        </span>
                      </div>

                      {/* Meeting Information */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                            {b.eventType.title}
                          </h2>
                          <Badge variant="secondary" className="tabular-nums font-sans">
                            {b.eventType.durationMinutes}m
                          </Badge>
                          {isCancelled && (
                            <Badge variant="danger">Cancelled</Badge>
                          )}
                          {isRescheduled && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <History className="h-3 w-3" />
                              <span>Rev #{b.sequence}</span>
                            </Badge>
                          )}
                        </div>

                        {/* Attendee Info */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1 font-medium text-[var(--text-primary)]">
                            <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            {b.attendeeName}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[var(--text-muted)]">
                            <Mail className="h-3 w-3" />
                            {b.attendeeEmail}
                          </span>
                        </div>

                        {/* Formatted Time */}
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span className="tabular-nums font-sans font-medium">{timeStr}</span>
                          <span className="font-mono text-[11px] text-[var(--text-muted)]">
                            ({b.host.timezone})
                          </span>
                        </div>

                        {/* Location Details */}
                        {b.location && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            {b.location.type === "IN_PERSON" && (
                              <>
                                <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                                <span>{String(b.location.data.address || "In-Person")}</span>
                              </>
                            )}
                            {(b.location.type === "STATIC_VIDEO" || b.location.type === "CUSTOM_LINK") && (
                              <>
                                <Video className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                                <a
                                  href={String(b.location.data.url || "#")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
                                >
                                  Join Video Meeting
                                </a>
                              </>
                            )}
                            {b.location.type === "HOST_CALLS_ATTENDEE" && (
                              <>
                                <PhoneCall className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                                <span>You call: <strong className="font-mono">{b.attendeePhoneNumber || "attendee phone"}</strong></span>
                              </>
                            )}
                            {b.location.type === "ATTENDEE_CALLS_HOST" && (
                              <>
                                <PhoneForwarded className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                                <span>Attendee calls: <strong className="font-mono">{String(b.location.data.hostPhoneNumber || "your phone")}</strong></span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Reschedule info / previous time */}
                        {isRescheduled && b.previousStartTime && !isCancelled && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                            Rescheduled from{" "}
                            {new Intl.DateTimeFormat("en-US", {
                              timeZone: b.host.timezone,
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(b.previousStartTime))}
                            {b.rescheduledBy && ` (${b.rescheduledBy === "HOST" ? "by you" : "by attendee"})`}
                            {b.rescheduleReason && ` · "${b.rescheduleReason}"`}
                          </p>
                        )}

                        {/* Attendee Notes or Cancellation Reason */}
                        {isCancelled && b.cancellationReason && (
                          <p className="text-[11px] text-[var(--status-danger-text)] mt-1">
                            Reason: &ldquo;{b.cancellationReason}&rdquo; ({b.cancelledBy === "HOST" ? "by host" : "by attendee"})
                          </p>
                        )}
                        {!isCancelled && b.attendeeNotes && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-1">
                            Notes: {b.attendeeNotes}
                          </p>
                        )}

                        {/* Custom Responses */}
                        {b.customResponses && b.customResponses.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]/70 space-y-1">
                            {b.customResponses.map((r) => (
                              <div key={r.questionId} className="flex items-baseline gap-1.5 text-[11px]">
                                <span className="text-[var(--text-muted)] font-medium">{r.label}:</span>
                                <span className="text-[var(--text-primary)] font-semibold">
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
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/public/bookings/${b.id}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          <span>Public Page</span>
                        </Link>
                      </Button>

                      {!isCancelled && (
                        <Button asChild variant="outline" size="sm" title="Download .ics">
                          <a href={`/api/v1/public/bookings/${b.id}/ics`} download>
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}

                      {!isCancelled && tab === "upcoming" && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRescheduleModalBooking(b);
                              setSelectedSlot(null);
                              setRescheduleReason("");
                            }}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Reschedule</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelModalBooking(b)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            Cancel
                          </Button>
                        </>
                      )}

                      {tab === "past" && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/public/${b.host.username}/${b.eventType.slug}`} target="_blank">
                            <span>Schedule Follow-up</span>
                          </Link>
                        </Button>
                      )}

                      {tab === "cancelled" && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRescheduleModalBooking(b);
                              setSelectedSlot(null);
                              setRescheduleReason("");
                            }}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Reschedule</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteModalBooking(b)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete booking from history"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            <span>Delete</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Reschedule Modal */}
        {rescheduleModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Reschedule Meeting
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {rescheduleModalBooking.eventType.title} with {rescheduleModalBooking.attendeeName}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRescheduleModalBooking(null)}
                >
                  ✕
                </Button>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{resMonthLabel}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRescheduleMonth(new Date(resYear, resMonth - 1, 1))
                      }
                      className="h-6 w-6 p-0"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRescheduleMonth(new Date(resYear, resMonth + 1, 1))
                      }
                      className="h-6 w-6 p-0"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="text-[10px] font-medium text-[var(--text-muted)] py-0.5">
                      {d}
                    </div>
                  ))}
                  {calDays.map((item, idx) => {
                    if (!item) {
                      return <div key={`empty-res-${idx}`} className="h-7" />;
                    }
                    const isSelected = rescheduleDate === item.dateStr;
                    const isPast =
                      new Date(`${item.dateStr}T23:59:59`).getTime() <
                      new Date().setHours(0, 0, 0, 0);

                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        disabled={isPast}
                        onClick={() => setRescheduleDate(item.dateStr)}
                        className={`h-7 w-full rounded text-xs font-medium transition-colors ${
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
              </div>

              {/* Time Slots */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Available Slots for {rescheduleDate} ({rescheduleModalBooking.host.timezone}):
                </label>
                {isLoadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                    <Skeleton className="h-8 w-full rounded" />
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-3 text-center">
                    No open availability slots on this day.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                    {rescheduleSlots.map((s) => {
                      const isSelected = selectedSlot?.startUtc === s.startUtc;
                      const timeLabel = new Intl.DateTimeFormat("en-US", {
                        timeZone: rescheduleModalBooking.host.timezone,
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }).format(new Date(s.startUtc));

                      return (
                        <button
                          key={s.startUtc}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          className={`px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
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

              {/* Reason Input */}
              <div className="space-y-1">
                <label htmlFor="hostRescheduleReason" className="text-xs font-medium text-[var(--text-secondary)]">
                  Reschedule Reason (Optional)
                </label>
                <input
                  id="hostRescheduleReason"
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Host schedule adjustment..."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRescheduleModalBooking(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!selectedSlot || isRescheduling}
                  onClick={handleRescheduleMeeting}
                >
                  {isRescheduling ? (
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
          </div>
        )}

        {/* Cancellation Reason Modal */}
        {cancelModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Cancel Meeting
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {cancelModalBooking.eventType.title} with {cancelModalBooking.attendeeName}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Are you sure you want to cancel this booking? The slot will be returned to your open availability calendar.
              </p>

              <div className="space-y-1">
                <label htmlFor="modalCancelReason" className="text-xs font-medium text-[var(--text-secondary)]">
                  Cancellation Reason (Optional)
                </label>
                <input
                  id="modalCancelReason"
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Unforeseen scheduling conflict..."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCancelModalBooking(null);
                    setCancelReason("");
                  }}
                >
                  Keep Meeting
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={Boolean(cancellingId)}
                  onClick={handleCancelMeeting}
                >
                  {cancellingId ? (
                    <>
                      <Spinner size="sm" />
                      <span>Cancelling…</span>
                    </>
                  ) : (
                    <span>Cancel Meeting</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xl space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Delete Cancelled Booking
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {deleteModalBooking.eventType.title} with {deleteModalBooking.attendeeName}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Are you sure you want to permanently remove this cancelled booking from your history? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteModalBooking(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDeleteBooking}
                >
                  {isDeleting ? (
                    <>
                      <Spinner size="sm" />
                      <span>Deleting…</span>
                    </>
                  ) : (
                    <span>Delete Booking</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
