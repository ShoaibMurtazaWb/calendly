"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Layers,
  Clock,
  Puzzle,
  Plus,
  LogOut,
  ExternalLink,
  ChevronDown,
  Globe,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { api, type CurrentUser } from "@/lib/api";
import { ApiError } from "@/lib/api-error";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside listener to close user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

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
        icon: Calendar,
      },
      {
        label: "Availability",
        href: "/dashboard/availability",
        active: pathname.startsWith("/dashboard/availability"),
        disabled: false,
        icon: Clock,
      },
      {
        label: "Integrations",
        href: "#",
        active: false,
        disabled: true,
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
                <Logo className="h-8 w-8 shrink-0 transition-transform group-hover:scale-105" />
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold tracking-tight text-slate-950 text-base">Sched</span>
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
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Actions: Header Create Button & User Profile Dropdown */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Header Create CTA Button */}
              <Button asChild size="sm" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 shadow-xs h-9 px-3.5 whitespace-nowrap shrink-0">
                <Link href="/dashboard/event-types/new" className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4 stroke-[2.5] shrink-0" />
                  <span className="font-medium">Create</span>
                </Link>
              </Button>

              {/* User Avatar & Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  aria-expanded={isDropdownOpen}
                  aria-label="User menu"
                >
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-tr from-slate-900 to-slate-700 text-white text-xs font-bold shadow-2xs select-none">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Card */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                    {/* User Identity Header */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white font-bold text-sm shadow-xs select-none">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                        </div>
                        <p className="truncate text-xs font-mono text-slate-500">@{user.username}</p>
                        <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                      </div>
                    </div>

                    {/* Timezone / Live Clock Row */}
                    {user.timezone && (
                      <div className="mt-2 flex items-center justify-between px-2.5 py-2 text-xs text-slate-600 rounded-lg bg-slate-50/50">
                        <div className="flex items-center gap-1.5 truncate">
                          <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{user.timezone}</span>
                        </div>
                        {currentTime && (
                          <span className="text-[11px] font-mono font-medium text-slate-700 shrink-0">
                            {currentTime}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="my-2 border-t border-slate-100" />

                    {/* Navigation Menu Items */}
                    <div className="space-y-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Layers className="h-4 w-4 text-slate-400" />
                        <span>Event Types Dashboard</span>
                      </Link>

                      <Link
                        href={`/public/${user.username}/30min`}
                        target="_blank"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserIcon className="h-4 w-4 text-slate-400" />
                          <span>Public Booking Link</span>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </Link>
                    </div>

                    <div className="my-2 border-t border-slate-100" />

                    {/* Logout Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        void logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
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
            <span className="text-slate-400">Settings</span>
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
