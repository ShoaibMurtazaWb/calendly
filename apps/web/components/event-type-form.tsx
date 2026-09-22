"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Link2 } from "lucide-react";
import { createEventTypeBodySchema, updateEventTypeBodySchema } from "@sched/api-contract";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api, type CurrentUser, type EventType } from "@/lib/api";
import { ApiError, fieldErrors } from "@/lib/api-error";

const DURATION_PRESETS = [15, 30, 45, 60];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface EventTypeFormProps {
  eventTypeId?: string;
}

export function EventTypeForm({ eventTypeId }: EventTypeFormProps) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(Boolean(eventTypeId));

  // Controlled form values
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [description, setDescription] = useState("");
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  useEffect(() => {
    api<CurrentUser>("/auth/me").then(setUser).catch(() => {});

    if (!eventTypeId) {
      setLoadingInitial(false);
      return;
    }

    setLoadingInitial(true);
    api<EventType>(`/event-types/${eventTypeId}`)
      .then((data) => {
        setTitle(data.title);
        setSlug(data.slug);
        setDuration(data.durationMinutes);
        setDescription(data.description || "");
        setIsSlugTouched(true);
      })
      .catch(() => setError("Event type not found."))
      .finally(() => setLoadingInitial(false));
  }, [eventTypeId]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!isSlugTouched && !eventTypeId) {
      setSlug(generateSlug(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});

    const raw = {
      title,
      slug,
      description,
      durationMinutes: duration,
    };

    const parsed = eventTypeId
      ? updateEventTypeBodySchema.safeParse(raw)
      : createEventTypeBodySchema.safeParse(raw);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFields(next);
      return;
    }

    setPending(true);
    try {
      if (eventTypeId) {
        await api(`/event-types/${eventTypeId}`, {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        });
        toast.success("Event type updated", "Changes saved successfully.");
      } else {
        await api("/event-types", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
        toast.success("Event type created", "Your new booking link is live.");
      }
      router.push("/dashboard");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(fieldErrors(caught));
        toast.error("Could not save event type", caught.message);
      } else {
        setError("Could not save the event type.");
        toast.error("Could not save the event type");
      }
    } finally {
      setPending(false);
    }
  }

  if (loadingInitial) {
    return (
      <DashboardShell>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-96 rounded-xl border border-[var(--border-subtle)]" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 mb-6 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
          Back to Event Types
        </Link>

        {/* Form Card */}
        <Card className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
          <div className="pb-5 border-b border-[var(--border-subtle)]">
            <CardTitle className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {eventTypeId ? "Edit Event Type" : "Create New Event Type"}
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-[var(--text-muted)]">
              Configure duration, booking slug, and attendee details.
            </CardDescription>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {/* Title Field */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. 30-Minute Strategy Session"
                required
                aria-invalid={Boolean(fields.title)}
              />
              {fields.title && (
                <p className="text-xs text-[var(--status-danger-text)] font-medium">{fields.title}</p>
              )}
            </div>

            {/* URL Slug Field */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] focus-within:border-[var(--border-focus)] focus-within:ring-1 focus-within:ring-[var(--focus-ring)] focus-within:bg-[var(--bg-surface)] overflow-hidden shadow-2xs transition-[border-color,box-shadow,background-color] duration-150 ease-out">
                <span className="flex items-center gap-1.5 px-3 text-xs text-[var(--text-muted)] font-mono select-none">
                  <Link2 className="h-3.5 w-3.5" />
                  sched.com/public/@{user?.username || "username"}/
                </span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="intro-call"
                  required
                  className="w-full bg-transparent py-2 pr-3 text-xs font-mono text-[var(--text-primary)] outline-none"
                />
              </div>
              {fields.slug && (
                <p className="text-xs text-[var(--status-danger-text)] font-medium">{fields.slug}</p>
              )}
            </div>

            {/* Duration Field with Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="durationMinutes">Duration</Label>
                <span className="text-xs text-[var(--text-muted)] tabular-nums font-sans">
                  {duration} minutes
                </span>
              </div>

              {/* Quick Duration Preset Pills */}
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDuration(preset)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium tabular-nums font-sans transition-[background-color,border-color,color] duration-150 ease-out cursor-pointer ${
                      duration === preset
                        ? "bg-neutral-900 text-white shadow-2xs border border-transparent"
                        : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    <span>{preset} min</span>
                  </button>
                ))}
              </div>

              {/* Custom Numeric Input */}
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
                className="mt-2 tabular-nums"
                aria-invalid={Boolean(fields.durationMinutes)}
              />
              {fields.durationMinutes && (
                <p className="text-xs text-[var(--status-danger-text)] font-medium">
                  {fields.durationMinutes}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description & Preparation</Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly explain what attendees should prepare or expect during this session."
                rows={3}
                className="resize-none"
                aria-invalid={Boolean(fields.description)}
              />
              {fields.description && (
                <p className="text-xs text-[var(--status-danger-text)] font-medium">
                  {fields.description}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] p-3 text-xs text-[var(--status-danger-text)] font-medium">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
              >
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={pending}
                size="sm"
                className="gap-2"
              >
                {pending && <Spinner size="sm" />}
                <span>{pending ? "Saving…" : eventTypeId ? "Save Changes" : "Create Event Type"}</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
