"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, type CurrentUser, type EventType } from "@/lib/api";

export function EventTypeList() {
  const [items, setItems] = useState<EventType[] | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [me, list] = await Promise.all([
        api<CurrentUser>("/auth/me"),
        api<EventType[]>("/event-types"),
      ]);
      setUser(me);
      setItems(list);
    } catch {
      setError("Could not load event types.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function archive(id: string) {
    await api(`/event-types/${id}/archive`, { method: "POST" });
    await load();
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Event types</h1>
          <p className="text-sm text-neutral-600">Active types appear on your public pages.</p>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {items?.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">No active event types yet.</p>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {items?.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-neutral-600">
                {item.durationMinutes} min · /public/{user?.username}/{item.slug}
              </p>
            </div>
            <div className="flex gap-2">
              {user ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/public/${user.username}/${item.slug}`} target="_blank">
                    Public page
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/event-types/${item.id}/edit`}>Edit</Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void archive(item.id)}>
                Archive
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
