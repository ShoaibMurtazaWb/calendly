"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Layers,
  Clock,
  Puzzle,
  Plus,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type CurrentUser } from "@/lib/api";
import { ApiError } from "@/lib/api-error";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkAuth() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const currentUser = await api<CurrentUser>("/auth/me");
      setUser(currentUser);
    } catch (error: unknown) {
      const isUnauthorized =
        (error instanceof ApiError && (error.status === 401 || error.status === 403)) ||
        (typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 401) ||
        (error instanceof Error && (error.message.includes("401") || error.message.includes("Unauthorized") || error.message.includes("Authentication required")));

      if (isUnauthorized) {
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to scheduling API (port 3001). Please ensure both web and API services are running."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void checkAuth();
  }, []);

  // Live timezone clock for the host
  useEffect(() => {
    if (!user?.timezone) return;

    function updateTime() {
      try {
        const formatter = new Intl.DateTimeFormat("en-GB", {
          timeZone: user?.timezone,
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        });
        setCurrentTime(formatter.format(new Date()));
      } catch {
        setCurrentTime("");
      }
    }

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [user?.timezone]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  const navItems = useMemo(
    () => [
      {
        label: "Event Types",
        href: "/dashboard",
        active: pathname === "/dashboard" || pathname.startsWith("/dashboard/event-types"),
        icon: Layers,
      },
      {
        label: "Scheduled Events",
        href: "#",
        active: false,
        disabled: true,
        badge: "v0.2",
        icon: Calendar,
      },
      {
        label: "Availability",
        href: "#",
        active: false,
        disabled: true,
        badge: "v0.2",
        icon: Clock,
      },
      {
        label: "Integrations",
        href: "#",
        active: false,
        disabled: true,
        badge: "v0.3",
        icon: Puzzle,
      },
    ],
    [pathname]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500 font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          <span>Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (errorMessage && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 sm:p-8 shadow-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
            <span className="font-mono text-lg font-bold">!</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">API Connection Issue</h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              type="button"
              onClick={() => void checkAuth()}
              className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs px-4"
            >
              Retry Connection
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-slate-200 text-xs px-4"
            >
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          <span>Redirecting to login…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col justify-between antialiased">
      {/* Top Main Navigation Bar */}
      <div>
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-2.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            {/* Left Brand + Nav Tabs */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              {/* Brand Logo */}
              <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
                  <span className="font-mono">S</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold tracking-tight text-slate-950 text-base">Sched</span>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    v0.1
                  </span>
                </div>
              </Link>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1 pl-1 shrink-0">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.disabled ? "#" : item.href}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                      item.active
                        ? "bg-blue-50/90 text-blue-700 font-semibold shadow-2xs border border-blue-100/80"
                        : item.disabled
                        ? "text-slate-400 hover:text-slate-500 cursor-not-allowed"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-slate-100 text-slate-400 font-normal px-1 py-0.2 rounded shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Host Status & Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Host Identity Pill */}
              <div className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 shadow-2xs whitespace-nowrap shrink-0">
                <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50 shrink-0" />
                <span className="text-sm font-medium text-slate-900 hidden sm:inline-block">
                  {user.name}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                  @{user.username}
                </span>
                {user.timezone && (
                  <span className="hidden xl:inline-block border-l border-slate-200 pl-2 text-xs text-slate-500">
                    {user.timezone} {currentTime && `· ${currentTime}`}
                  </span>
                )}
              </div>

              {/* Create CTA Button */}
              <Button asChild size="sm" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 shadow-xs h-9 px-3.5 whitespace-nowrap shrink-0">
                <Link href="/dashboard/event-types/new" className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4 stroke-[2.5] shrink-0" />
                  <span className="hidden sm:inline font-medium">Create Event Type</span>
                </Link>
              </Button>

              {/* User Avatar Circle */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-tr from-slate-200 to-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 select-none shadow-2xs shrink-0"
                title={`${user.name} (@${user.username})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>

              {/* Logout Icon Button */}
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="mx-auto max-w-7xl px-4 sm:px-8 py-8">{children}</main>
      </div>

      {/* Global Dashboard Footer */}
      <footer className="border-t border-slate-200/80 bg-white px-4 sm:px-8 py-6 mt-16">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900">Sched</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>High-precision calendar scheduling infrastructure.</span>
          </div>
          <div className="flex items-center gap-5 font-medium text-slate-600">
            <span className="text-slate-400">Settings (v0.2)</span>
            <Link
              href={`/public/${user.username}/30min`}
              target="_blank"
              className="hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              Public Profile
              <ExternalLink className="h-3 w-3" />
            </Link>
            <span className="text-slate-400 font-normal">© 2026 Sched Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
