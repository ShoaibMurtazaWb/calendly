"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Link2, Sparkles } from "lucide-react";
import { createEventTypeBodySchema, updateEventTypeBodySchema } from "@sched/api-contract";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function EventTypeForm({ eventTypeId }: { eventTypeId?: string }) {
  const router = useRouter();
  const [existing, setExisting] = useState<EventType | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  // Controlled form values for live slug & duration pills
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [description, setDescription] = useState("");
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  useEffect(() => {
    api<CurrentUser>("/auth/me").then(setUser).catch(() => {});

    if (!eventTypeId) return;
    api<EventType>(`/event-types/${eventTypeId}`)
      .then((data) => {
        setExisting(data);
        setTitle(data.title);
        setSlug(data.slug);
        setDuration(data.durationMinutes);
        setDescription(data.description || "");
        setIsSlugTouched(true);
      })
      .catch(() => setError("Event type not found."));
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
      } else {
        await api("/event-types", {
          method: "POST",
          body: JSON.stringify(parsed.data),
        });
      }
      router.push("/dashboard");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(fieldErrors(caught));
      } else {
        setError("Could not save the event type.");
      }
    } finally {
      setPending(false);
    }
  }

  if (eventTypeId && !existing && !error) {
    return (
      <DashboardShell>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            Loading event type…
          </div>
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
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Event Types
        </Link>

        {/* Form Card */}
        <Card className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-slate-950">
                {eventTypeId ? "Edit Event Type" : "Create New Event Type"}
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-slate-500">
                Configure duration, slug, and public details for this booking link.
              </CardDescription>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            {/* Title Field */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold text-slate-700">
                Event Title
              </Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. 30-Minute Strategy & Review"
                required
                className="h-10 rounded-xl text-sm border-slate-200 shadow-2xs focus-visible:ring-slate-900"
              />
              {fields.title && <p className="text-xs text-red-600 font-medium">{fields.title}</p>}
            </div>

            {/* URL Slug Field */}
            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs font-semibold text-slate-700">
                URL Slug
              </Label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/70 focus-within:ring-2 focus-within:ring-slate-900 focus-within:bg-white overflow-hidden shadow-2xs">
                <span className="flex items-center gap-1.5 px-3 text-xs text-slate-400 font-mono select-none">
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
                  className="w-full bg-transparent py-2.5 pr-3 text-xs font-mono text-slate-900 outline-none"
                />
              </div>
              {fields.slug && <p className="text-xs text-red-600 font-medium">{fields.slug}</p>}
            </div>

            {/* Duration Field with Presets */}
            <div className="space-y-2">
              <Label htmlFor="durationMinutes" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Duration</span>
                <span className="text-slate-400 font-normal">{duration} minutes</span>
              </Label>

              {/* Quick Duration Preset Pills */}
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDuration(preset)}
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      duration === preset
                        ? "bg-slate-950 text-white shadow-xs"
                        : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    <span>{preset}m</span>
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
                className="h-10 rounded-xl text-sm border-slate-200 shadow-2xs mt-2"
              />
              {fields.durationMinutes && (
                <p className="text-xs text-red-600 font-medium">{fields.durationMinutes}</p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
                Description & Agenda
              </Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly explain what attendees should prepare or expect during this session."
                rows={3}
                className="rounded-xl text-sm border-slate-200 shadow-2xs resize-none"
              />
              {fields.description && (
                <p className="text-xs text-red-600 font-medium">{fields.description}</p>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                asChild
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200 text-xs font-medium"
              >
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-medium px-5 shadow-xs"
              >
                {pending ? "Saving…" : eventTypeId ? "Save Changes" : "Create Event Type"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
