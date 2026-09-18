"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, type CurrentUser } from "@/lib/api";
import { ApiError } from "@/lib/api-error";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    api<CurrentUser>("/auth/me")
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/login");
        }
      });
  }, [router]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!user) {
    return <p className="p-8 text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div>
          <Link href="/dashboard" className="font-semibold">
            Sched
          </Link>
          <p className="text-xs text-neutral-500">
            {user.name} · @{user.username}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="sm">
            <Link href="/dashboard/event-types/new">New event type</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
