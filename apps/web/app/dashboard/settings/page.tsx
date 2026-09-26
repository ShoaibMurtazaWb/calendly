"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Bell,
  Clock,
  Shield,
  Check,
  AlertCircle,
  Camera,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type UserSettingsResponse, type AuditLogEntry } from "@/lib/api";
import { ApiError } from "@/lib/api-error";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Rome",
  "Europe/Madrid",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettingsResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "scheduling" | "audit">("profile");

  // Profile Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notifications Form State
  const [emailReminders, setEmailReminders] = useState(true);
  const [bookingConfirmations, setBookingConfirmations] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Scheduling Form State
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [defaultBuffer, setDefaultBuffer] = useState(0);
  const [defaultTimezone, setDefaultTimezone] = useState("UTC");
  const [isSavingScheduling, setIsSavingScheduling] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await api<UserSettingsResponse>("/settings");
      setSettings(data);
      setName(data.profile.name);
      setUsername(data.profile.username);
      setTimezone(data.profile.timezone);
      setAvatarUrl(data.profile.avatarUrl || "");

      setEmailReminders(data.notificationPreferences.emailReminders);
      setBookingConfirmations(data.notificationPreferences.bookingConfirmations);
      setMarketingEmails(data.notificationPreferences.marketingEmails);

      setDefaultDuration(data.schedulingPreferences.defaultMeetingDuration);
      setDefaultBuffer(data.schedulingPreferences.defaultBufferMinutes);
      setDefaultTimezone(data.schedulingPreferences.defaultTimezone || data.profile.timezone);

      // Load audit logs in background
      void api<AuditLogEntry[]>("/settings/audit-logs")
        .then((logs) => setAuditLogs(logs))
        .catch(() => {});
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load account settings.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    setFeedback(null);
    try {
      const updated = await api<UserSettingsResponse>("/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          timezone,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });
      setSettings(updated);
      setFeedback({ type: "success", message: "Profile settings saved successfully." });
      
      // Real-time synchronization with Header and Sidebar user buttons
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sched_user_updated", { detail: updated.profile })
        );
      }
    } catch (err) {
      let msg = "Failed to update profile.";
      if (err instanceof ApiError && err.body.error.code === "USERNAME_CONFLICT") {
        msg = "This username is already taken by another account.";
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingNotifications(true);
    setFeedback(null);
    try {
      const updated = await api<UserSettingsResponse>("/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify({
          emailReminders,
          bookingConfirmations,
          marketingEmails,
        }),
      });
      setSettings(updated);
      setFeedback({ type: "success", message: "Notification preferences updated." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update notification preferences.",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  }

  async function handleSaveScheduling(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingScheduling(true);
    setFeedback(null);
    try {
      const updated = await api<UserSettingsResponse>("/settings/scheduling", {
        method: "PATCH",
        body: JSON.stringify({
          defaultMeetingDuration: Number(defaultDuration),
          defaultBufferMinutes: Number(defaultBuffer),
          defaultTimezone,
        }),
      });
      setSettings(updated);
      setFeedback({ type: "success", message: "Default scheduling preferences saved." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update scheduling preferences.",
      });
    } finally {
      setIsSavingScheduling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Please select a valid image file (PNG, JPG, WebP)." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Image size must be less than 5MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setAvatarUrl(compressedDataUrl);
          setFeedback({ type: "success", message: "Photo loaded! Click 'Save Profile' to apply your new avatar." });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Admin center
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          Manage your personal profile, delivery notifications, default scheduling rules, and security audit trail.
        </p>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-3.5 text-xs transition-all duration-150 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
              : "border-rose-200 bg-rose-50/70 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{feedback.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          <span>Profile</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "notifications"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Notifications</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("scheduling")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "scheduling"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Scheduling Preferences</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "audit"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Profile Settings */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xs">
          {/* Avatar Upload Section */}
          <div className="flex items-center gap-5 pb-5 border-b border-[var(--border-subtle)]">
            <div className="relative group">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xl select-none overflow-hidden ring-2 ring-neutral-200">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <label
                htmlFor="avatar-file-upload"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Upload profile photo"
              >
                <Camera className="h-5 w-5" />
              </label>
              <input
                id="avatar-file-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-1.5 flex-1">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Profile Photo</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="avatar-file-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-xs font-semibold text-neutral-800 hover:bg-neutral-100 hover:text-black transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Image</span>
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Upload a PNG, JPG, or WebP photo, or paste a link below.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-[var(--text-primary)]">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-neutral-900 focus:outline-none"
                placeholder="e.g. Shoaib Murtaza"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-[var(--text-primary)]">
                Username Handle
              </label>
              <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] focus-within:border-neutral-900">
                <span className="text-[var(--text-muted)] font-mono select-none">sched.to/</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-transparent font-mono text-xs text-[var(--text-primary)] focus:outline-none ml-0.5"
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-[var(--text-primary)]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={settings?.profile.email || ""}
                disabled
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-muted)] cursor-not-allowed"
              />
              <span className="text-[10px] text-[var(--text-muted)]">Managed via authentication provider</span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="timezone" className="text-xs font-semibold text-[var(--text-primary)]">
                Default Primary Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-neutral-900 focus:outline-none"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="avatarUrl" className="text-xs font-semibold text-[var(--text-primary)]">
              Or Avatar Image URL (Optional)
            </label>
            <input
              id="avatarUrl"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-neutral-900 focus:outline-none font-mono"
              placeholder="https://... or uploaded image"
            />
          </div>

          <div className="pt-3 flex items-center justify-end border-t border-[var(--border-subtle)]">
            <Button type="submit" disabled={isSavingProfile} size="sm">
              {isSavingProfile && <Spinner size="sm" className="mr-2" />}
              Save Profile
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Notification Preferences */}
      {activeTab === "notifications" && (
        <form onSubmit={handleSaveNotifications} className="space-y-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xs">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Email Notification Preferences</h2>
            <p className="text-xs text-[var(--text-secondary)]">Choose which transactional emails and system reminders you receive.</p>
          </div>

          <div className="space-y-3 divide-y divide-[var(--border-subtle)]">
            <label className="flex items-start justify-between pt-3 cursor-pointer">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-medium text-[var(--text-primary)]">Email Reminders</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Receive automated reminders (24 hours and 1 hour before scheduled bookings).
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailReminders}
                onChange={(e) => setEmailReminders(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-neutral-900 focus:ring-neutral-900 mt-1 cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between pt-3 cursor-pointer">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-medium text-[var(--text-primary)]">Booking Confirmations</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Get notified whenever an attendee creates, reschedules, or cancels a booking.
                </p>
              </div>
              <input
                type="checkbox"
                checked={bookingConfirmations}
                onChange={(e) => setBookingConfirmations(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-neutral-900 focus:ring-neutral-900 mt-1 cursor-pointer"
              />
            </label>

            <label className="flex items-start justify-between pt-3 cursor-pointer">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-medium text-[var(--text-primary)]">Product Updates & Tips</span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Occasional feature announcements and tips to optimize your scheduling workflow.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketingEmails}
                onChange={(e) => setMarketingEmails(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-subtle)] text-neutral-900 focus:ring-neutral-900 mt-1 cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end border-t border-[var(--border-subtle)]">
            <Button type="submit" disabled={isSavingNotifications} size="sm">
              {isSavingNotifications && <Spinner size="sm" className="mr-2" />}
              Save Preferences
            </Button>
          </div>
        </form>
      )}

      {/* Tab 3: Default Scheduling Preferences */}
      {activeTab === "scheduling" && (
        <form onSubmit={handleSaveScheduling} className="space-y-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xs">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Default Scheduling Rules</h2>
            <p className="text-xs text-[var(--text-secondary)]">Set default duration and buffer presets used when creating new event types.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="duration" className="text-xs font-semibold text-[var(--text-primary)]">
                Default Meeting Duration (Minutes)
              </label>
              <select
                id="duration"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-neutral-900 focus:outline-none"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 hour)</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="buffer" className="text-xs font-semibold text-[var(--text-primary)]">
                Default Buffer Time (Minutes)
              </label>
              <select
                id="buffer"
                value={defaultBuffer}
                onChange={(e) => setDefaultBuffer(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-neutral-900 focus:outline-none"
              >
                <option value={0}>0 minutes (No buffer)</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="defaultTimezone" className="text-xs font-semibold text-[var(--text-primary)]">
              Default Scheduling Timezone
            </label>
            <select
              id="defaultTimezone"
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-neutral-900 focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end border-t border-[var(--border-subtle)]">
            <Button type="submit" disabled={isSavingScheduling} size="sm">
              {isSavingScheduling && <Spinner size="sm" className="mr-2" />}
              Save Scheduling Defaults
            </Button>
          </div>
        </form>
      )}

      {/* Tab 4: Security & Audit Trail */}
      {activeTab === "audit" && (
        <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Enterprise Security Audit Log</h2>
              <p className="text-xs text-[var(--text-secondary)]">Immutable historical record of mutations, authentications, and configuration changes.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
              Active Tracking
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No recent audit records found.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        [{log.entityType}]
                      </span>
                    </div>
                    {log.ipAddress && (
                      <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        IP: {log.ipAddress} {log.requestId ? `• Req: ${log.requestId}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] shrink-0">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(log.createdAt))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
