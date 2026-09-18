"use client";

import { createEventTypeBodySchema, updateEventTypeBodySchema } from "@sched/api-contract";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, type EventType } from "@/lib/api";
import { ApiError, fieldErrors } from "@/lib/api-error";

export function EventTypeForm({ eventTypeId }: { eventTypeId?: string }) {
  const router = useRouter();
  const [existing, setExisting] = useState<EventType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!eventTypeId) return;
    api<EventType>(`/event-types/${eventTypeId}`)
      .then(setExisting)
      .catch(() => setError("Event type not found."));
  }, [eventTypeId]);

  async function onSubmit(formData: FormData) {
    setError(null);
    setFields({});
    const raw = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description") ?? "",
      durationMinutes: formData.get("durationMinutes"),
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
        await api(`/event-types/${eventTypeId}`, { method: "PATCH", body: JSON.stringify(parsed.data) });
      } else {
        await api("/event-types", { method: "POST", body: JSON.stringify(parsed.data) });
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
        <p className="text-sm text-neutral-500">Loading…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <Card className="max-w-lg">
        <CardTitle>{eventTypeId ? "Edit event type" : "New event type"}</CardTitle>
        <form className="mt-6 grid gap-4" action={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={existing?.title} required />
            {fields.title ? <p className="text-sm text-red-600">{fields.title}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={existing?.slug} required />
            {fields.slug ? <p className="text-sm text-red-600">{fields.slug}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={5}
              max={480}
              defaultValue={existing?.durationMinutes ?? 30}
              required
            />
            {fields.durationMinutes ? <p className="text-sm text-red-600">{fields.durationMinutes}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={existing?.description} />
            {fields.description ? <p className="text-sm text-red-600">{fields.description}</p> : null}
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>
    </DashboardShell>
  );
}
