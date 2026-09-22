"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Calendar,
  ArrowRight,
  Globe,
  CheckCircle2,
  Video,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import type { PublicHostProfileResponse } from "@sched/api-contract";

export default function PublicHostPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [profile, setProfile] = useState<PublicHostProfileResponse | null>(null);
  const [hostTime, setHostTime] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHostProfile() {
      setIsLoading(true);
      try {
        const data = await api<PublicHostProfileResponse>(`/public/${username}`);
        setProfile(data);
      } catch {
        setError("Host profile not found or unavailable.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadHostProfile();
  }, [username]);

  useEffect(() => {
    if (!profile?.user.timezone) return;

    function updateClock() {
      try {
        const now = new Date();
        setHostTime(
          now.toLocaleTimeString("en-US", {
            timeZone: profile?.user.timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } catch {
        setHostTime("");
      }
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [profile?.user.timezone]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Clock className="h-4 w-4 animate-spin text-neutral-900" />
          <span>Loading booking profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-4">
          <Calendar className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900">Host Not Found</h1>
        <p className="mt-1 text-sm text-neutral-500 max-w-sm">
          The user @{username} does not exist or has no active public booking links.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
        >
          <span>Return Home</span>
        </Link>
      </div>
    );
  }

  const initials = profile.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "H";

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200/80 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7 shrink-0" />
            <span className="font-bold text-sm tracking-tight text-neutral-900">Sched</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Accepting bookings</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        {/* Host Profile Card */}
        <Card className="p-8 bg-white border-neutral-200 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-2xl font-bold text-white shadow-sm">
            {initials}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-bold text-neutral-900">{profile.user.name}</h1>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="text-sm font-mono text-neutral-500">@{profile.user.username}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-neutral-500">
              <div className="flex items-center gap-1.5 font-mono">
                <Globe className="h-3.5 w-3.5 text-neutral-400" />
                <span>{profile.user.timezone}</span>
              </div>
              {hostTime && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Clock className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Local Time: {hostTime}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Active Event Types List */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Select an Event Type</h2>
            <p className="text-xs text-neutral-500">Choose a meeting format to view available dates and times.</p>
          </div>

          {profile.eventTypes.length === 0 ? (
            <Card className="p-8 text-center bg-white border-neutral-200">
              <p className="text-sm text-neutral-500">This host has no active event types available for booking.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.eventTypes.map((et) => (
                <Link
                  key={et.id}
                  href={`/public/${profile.user.username}/${et.slug}`}
                  className="group block"
                >
                  <Card className="h-full p-6 bg-white border-neutral-200/90 shadow-2xs hover:border-neutral-900 hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                          {et.durationMinutes} min meeting
                        </span>
                        <div className="flex items-center gap-1 text-xs text-neutral-400 group-hover:text-neutral-900 transition">
                          <span>Select</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>

                      <h3 className="mt-3 text-base font-bold text-neutral-900 group-hover:text-neutral-950">
                        {et.title}
                      </h3>

                      {et.description && (
                        <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                          {et.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <Video className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Google Meet / Zoom</span>
                      </div>
                      <span>Instant sync</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 text-center border-t border-neutral-200/60 mt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition"
        >
          <span>Powered by</span>
          <Logo className="h-4 w-4" />
          <span className="font-semibold text-neutral-600">Sched</span>
        </Link>
      </footer>
    </div>
  );
}
