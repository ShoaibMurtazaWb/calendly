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
import type { BookingResponse } from "@sched/api-contract";

type TabStatus = "upcoming" | "past" | "cancelled";

export default function BookingsPage() {
  const [tab, setTab] = useState<TabStatus>("upcoming");
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingResponse | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadBookings = async (status: TabStatus) => {
    setIsLoading(true);
    try {
      const data = await api<BookingResponse[]>(`/bookings?status=${status}`);
      setBookings(data);
    } catch {
      setBookings([]);
      toast.error("Failed to load bookings", "Could not fetch your meeting schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBookings(tab);
  }, [tab]);

  const handleCancelMeeting = async () => {
    if (!cancelModalBooking) return;
    setCancellingId(cancelModalBooking.id);
    try {
      await api<BookingResponse>(`/bookings/${cancelModalBooking.id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });

      toast.success(
        "Meeting Cancelled",
        `Booking with ${cancelModalBooking.attendeeName} has been cancelled.`
      );
      setCancelModalBooking(null);
      setCancelReason("");
      void loadBookings(tab);
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
              Track upcoming sessions, review meeting histories, and manage cancellations.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-1">
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-[color,border-color] duration-150 cursor-pointer border-b-2 ${
              tab === "upcoming"
                ? "border-neutral-900 text-[var(--text-primary)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>Upcoming</span>
            {tab === "upcoming" && (
              <Badge variant="secondary" className="tabular-nums font-sans">
                {bookings.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("past")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-[color,border-color] duration-150 cursor-pointer border-b-2 ${
              tab === "past"
                ? "border-neutral-900 text-[var(--text-primary)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>Past</span>
            {tab === "past" && (
              <Badge variant="secondary" className="tabular-nums font-sans">
                {bookings.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("cancelled")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-[color,border-color] duration-150 cursor-pointer border-b-2 ${
              tab === "cancelled"
                ? "border-neutral-900 text-[var(--text-primary)] font-semibold"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>Cancelled</span>
            {tab === "cancelled" && (
              <Badge variant="secondary" className="tabular-nums font-sans">
                {bookings.length}
              </Badge>
            )}
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
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/public/bookings/${b.id}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          <span>Details</span>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelModalBooking(b)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
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
      </div>
    </DashboardShell>
  );
}
