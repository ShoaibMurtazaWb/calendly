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
import type { BookingResponse } from "@sched/api-contract";

export default function PublicBookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation dialog state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api<BookingResponse>(`/public/bookings/${id}`);
        setBooking(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Unable to load booking details.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void loadBooking();
  }, [id]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const updated = await api<BookingResponse>(`/public/bookings/${id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason: cancelReason || undefined }),
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
          {error || "We could not find this booking or the link is invalid."}
        </p>
        <Button asChild size="sm" className="mt-6">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  const isCancelled = booking.status === "CANCELLED";

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
                  <Badge variant="success" className="mb-2">
                    Confirmed
                  </Badge>
                  <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    You are scheduled!
                  </h1>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    A calendar invitation has been generated for your session with {booking.host.name}.
                  </p>
                </>
              )}
            </div>

            {/* Meeting Details Content */}
            <div className="py-6 space-y-4 text-xs">
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
              {!isCancelled && (
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
                      <a href={`/api/v1/public/bookings/${booking.id}/ics`} download>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        .ics File
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancellation Section */}
              {!isCancelled && (
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  {isCancelOpen ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-3">
                      <p className="font-semibold text-[var(--text-primary)]">Cancel this booking?</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        This will free up the time slot for other attendees.
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
                      <button
                        type="button"
                        onClick={() => setIsCancelOpen(true)}
                        className="font-medium text-rose-600 hover:underline cursor-pointer"
                      >
                        Cancel booking
                      </button>
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

