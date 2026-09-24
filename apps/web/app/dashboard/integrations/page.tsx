"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { GoogleCalendarLogo } from "@/components/google-calendar-logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type {
  CalendarIntegrationResponse,
  CalendarListResponse,
  CalendarItem,
} from "@sched/api-contract";

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [integration, setIntegration] = useState<CalendarIntegrationResponse | null>(null);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
  const [conflictCalendarIds, setConflictCalendarIds] = useState<string[]>(["primary"]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [, startTransition] = useTransition();

  // Load Integration Data
  async function loadIntegration() {
    try {
      setIsLoading(true);
      const data = await api<CalendarIntegrationResponse | null>("/integrations/google");
      setIntegration(data);

      if (data && data.status === "CONNECTED") {
        let initialSelectedId = data.selectedCalendarId || "primary";
        let initialConflictIds =
          data.conflictCalendarIds && data.conflictCalendarIds.length > 0
            ? data.conflictCalendarIds
            : ["primary"];

        // Fetch user's calendars
        try {
          const calList = await api<CalendarListResponse>("/integrations/google/calendars");
          setCalendars(calList.calendars);

          const primaryCal = calList.calendars.find((c) => c.isPrimary);
          if (primaryCal) {
            if (initialSelectedId === "primary") {
              initialSelectedId = primaryCal.id;
            }
            initialConflictIds = initialConflictIds.map((id) =>
              id === "primary" ? primaryCal.id : id
            );
          }
        } catch (calErr) {
          console.error("Failed to load calendars", calErr);
        }

        setSelectedCalendarId(initialSelectedId);
        setConflictCalendarIds(initialConflictIds);
      }
    } catch (err) {
      console.error("Failed to load Google Calendar integration", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle OAuth Return Callback or Status Query Params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "google") {
      setFeedback({
        type: "success",
        message: "Successfully connected Google Calendar!",
      });
      startTransition(() => {
        router.replace("/dashboard/integrations");
      });
    } else if (error) {
      setFeedback({
        type: "error",
        message: `Google OAuth error: ${decodeURIComponent(error)}`,
      });
      startTransition(() => {
        router.replace("/dashboard/integrations");
      });
    }

    void loadIntegration();
  }, [searchParams]);

  // Connect / Reconnect Google Calendar: Browser navigation to authenticated backend GET endpoint
  function handleConnect() {
    setIsConnecting(true);
    setFeedback(null);
    window.location.href = "/api/v1/integrations/google/connect";
  }

  // Save Calendar Preferences
  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    if (!integration) return;

    try {
      setIsSaving(true);
      setFeedback(null);
      const updated = await api<CalendarIntegrationResponse>("/integrations/google/calendars", {
        method: "PATCH",
        body: JSON.stringify({
          selectedCalendarId,
          conflictCalendarIds,
        }),
      });

      setIntegration(updated);
      setFeedback({
        type: "success",
        message: "Calendar preferences saved successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof ApiError ? err.message : "Failed to update calendar preferences.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Disconnect Google Calendar
  async function handleDisconnect() {
    if (
      !window.confirm(
        "Are you sure you want to disconnect Google Calendar? Future bookings will no longer sync automatically."
      )
    ) {
      return;
    }

    try {
      setIsDisconnecting(true);
      setFeedback(null);
      const res = await api<CalendarIntegrationResponse>("/integrations/google/disconnect", {
        method: "POST",
      });

      setIntegration(res);
      setCalendars([]);
      setFeedback({
        type: "success",
        message: "Google Calendar disconnected.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof ApiError ? err.message : "Failed to disconnect Google Calendar.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  }

  function toggleConflictCalendar(id: string) {
    setConflictCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((calId) => calId !== id) : [...prev, id]
    );
  }

  const isConnected = integration?.status === "CONNECTED";
  const isRevoked = integration?.status === "REVOKED";

  return (
    <div className="mx-auto max-w-4xl py-6 px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Calendar Integrations
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Connect your Google Calendar to synchronize busy times, prevent double-bookings, and
          automatically create host events.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm ${
            feedback.type === "success"
              ? "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
              : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Revoked Notice */}
      {isRevoked && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Google Calendar Access Revoked or Expired</p>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">
                Sched can no longer check busy times or synchronize events with your Google account (
                <span className="font-mono">{integration?.accountEmail}</span>). Please re-authorize
                access to resume calendar synchronization.
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isConnecting ? <Spinner size="sm" className="mr-2" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                  Re-connect Google Calendar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="default" />
          <span className="ml-3 text-sm text-[var(--text-secondary)]">Loading integrations…</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Google Calendar Card */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] shadow-xs">
                  <GoogleCalendarLogo className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      Google Calendar
                    </h2>
                    {isConnected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    )}
                    {isRevoked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="h-3 w-3" /> Re-auth Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {isConnected && integration?.accountEmail
                      ? `Connected as ${integration.accountEmail}`
                      : "Sync outbound bookings and query real-time FreeBusy intervals."}
                  </p>
                </div>
              </div>

              <div>
                {!isConnected ? (
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full sm:w-auto"
                  >
                    {isConnecting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect Google Calendar
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] border-[var(--status-danger-border)]"
                  >
                    {isDisconnecting ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1.5" />
                    )}
                    Disconnect
                  </Button>
                )}
              </div>
            </div>

            {/* Connected Configuration Form */}
            {isConnected && (
              <form onSubmit={handleSavePreferences} className="mt-6 space-y-6">
                {/* Write/Destination Calendar */}
                <div>
                  <label
                    htmlFor="destinationCalendar"
                    className="block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Destination Calendar (Add new bookings to)
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-2">
                    Events for confirmed Sched bookings will be created on this calendar.
                  </p>
                  <select
                    id="destinationCalendar"
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  >
                    {calendars.length === 0 ? (
                      <option value="primary">Primary Calendar (Default)</option>
                    ) : (
                      calendars
                        .filter((cal) => cal.writable)
                        .map((cal) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.name} {cal.isPrimary ? "(Primary)" : ""}
                          </option>
                        ))
                    )}
                  </select>
                </div>

                {/* Conflict/FreeBusy Calendars */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Check for Conflicts
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-3">
                    Select the calendars you want Sched to check for busy times. Slots overlapping
                    with events on these calendars will be marked unavailable.
                  </p>

                  <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 p-4 max-w-md">
                    {calendars.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span>Primary Calendar (Checked by default)</span>
                      </div>
                    ) : (
                      calendars.map((cal) => {
                        const isChecked = conflictCalendarIds.includes(cal.id);
                        return (
                          <label
                            key={cal.id}
                            className="flex items-center gap-3 text-sm text-[var(--text-primary)] cursor-pointer hover:opacity-90"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleConflictCalendar(cal.id)}
                              className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                            />
                            <span className="flex-1 font-normal">
                              {cal.name} {cal.isPrimary ? "(Primary)" : ""}
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)] uppercase font-mono">
                              {cal.accessRole}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Spinner size="sm" className="mr-2" /> : <Check className="h-4 w-4 mr-1.5" />}
                    Save Calendar Settings
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Architecture Information Card */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-primary)]" />
              Security & Reliability Guarantees
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Decoupled Outbox Sync:</strong> Google Calendar event creation runs
                  asynchronously in a background worker. Booking confirmations succeed instantly
                  and never depend on Google API availability.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Double-Bookings:</strong> Final booking confirmation executes a
                  pre-transaction Google FreeBusy check, backed by PostgreSQL atomic exclusion
                  constraints.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Encrypted Vault:</strong> Refresh and access tokens are secured using
                  authenticated AES-256-GCM encryption with session-bound PKCE state.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <DashboardShell>
      <Suspense
        fallback={
          <div className="flex min-h-[400px] items-center justify-center">
            <Spinner size="default" />
          </div>
        }
      >
        <IntegrationsContent />
      </Suspense>
    </DashboardShell>
  );
}
