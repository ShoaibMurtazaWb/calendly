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
import { Spinner } from "@/components/ui/spinner";
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

  // Minute-level clock updates to eliminate per-second repaints
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
    window.location.replace("/");
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
        label: "Bookings",
        href: "/dashboard/bookings",
        active: pathname.startsWith("/dashboard/bookings"),
        disabled: false,
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--text-secondary)] font-medium">
          <Spinner size="default" />
          <span>Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (errorMessage && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-6">
        <div className="w-full max-w-md rounded-xl border border-[var(--status-danger-border)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] mb-4">
            <span className="font-mono text-lg font-bold">!</span>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">API Connection Issue</h2>
          <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">{errorMessage}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              type="button"
              onClick={() => void checkAuth()}
              size="sm"
            >
              Retry Connection
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)]">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] font-medium">
          <Spinner size="default" />
          <span>Redirecting to login…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between antialiased">
      {/* Top Main Navigation Bar */}
      <div>
        <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md px-4 sm:px-8 py-2.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            {/* Left Brand + Nav Tabs */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              {/* Brand Logo */}
              <Link href="/" className="flex items-center gap-2.5 group shrink-0" title="Go to Home">
                <Logo className="h-7 w-7 shrink-0 transition-transform duration-150 group-hover:scale-105" />
                <span className="font-semibold tracking-tight text-[var(--text-primary)] text-base">Sched</span>
              </Link>

              {/* Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1 pl-1 shrink-0">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.disabled ? "#" : item.href}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-[background-color,color] duration-150 ease-out whitespace-nowrap shrink-0 ${
                      item.active
                        ? "bg-neutral-900 text-white font-semibold shadow-xs"
                        : item.disabled
                        ? "text-[var(--text-disabled)] cursor-not-allowed"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.disabled && (
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[var(--bg-muted)] text-[var(--text-muted)] leading-none">
                        Soon
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right Actions: Header Create Button & User Profile Dropdown */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Header Create CTA Button */}
              <Button asChild size="sm" className="h-8 px-3 whitespace-nowrap shrink-0 gap-1.5">
                <Link href="/dashboard/event-types/new">
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Create</span>
                </Link>
              </Button>

              {/* User Avatar & Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-[var(--bg-subtle)] transition-[background-color,border-color] duration-150 cursor-pointer border border-transparent hover:border-[var(--border-subtle)]"
                  aria-expanded={isDropdownOpen}
                  aria-label="User menu"
                >
                  <div className="relative">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white text-[11px] font-bold shadow-2xs select-none">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <ChevronDown className={`h-3 w-3 text-[var(--text-muted)] transition-transform duration-150 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Card */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                    {/* User Identity Header */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-bold text-xs shadow-xs select-none">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{user.name}</p>
                        <p className="truncate text-[11px] font-mono text-[var(--text-muted)]">@{user.username}</p>
                        <p className="truncate text-[10px] text-[var(--text-disabled)]">{user.email}</p>
                      </div>
                    </div>

                    {/* Timezone / Live Clock Row */}
                    {user.timezone && (
                      <div className="mt-2 flex items-center justify-between px-2.5 py-1.5 text-xs text-[var(--text-secondary)] rounded-md bg-[var(--bg-subtle)]/50">
                        <div className="flex items-center gap-1.5 truncate">
                          <Globe className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                          <span className="truncate font-mono text-[11px]">{user.timezone}</span>
                        </div>
                        {currentTime && (
                          <span className="text-[11px] font-mono font-medium text-[var(--text-primary)] shrink-0 tabular-nums">
                            {currentTime}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="my-2 border-t border-[var(--border-subtle)]" />

                    {/* Navigation Menu Items */}
                    <div className="space-y-0.5">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors duration-150"
                      >
                        <Layers className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <span>Event Types Dashboard</span>
                      </Link>

                      <Link
                        href={`/public/${user.username}`}
                        target="_blank"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors duration-150"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserIcon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          <span>Public Booking Profile</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-[var(--text-muted)]" />
                      </Link>
                    </div>

                    <div className="my-2 border-t border-[var(--border-subtle)]" />

                    {/* Logout Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        void logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
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
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-8 py-6 mt-16">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[var(--text-primary)]">Sched</span>
            <span className="hidden sm:inline text-[var(--border-subtle)]">|</span>
            <span>High-precision calendar scheduling infrastructure.</span>
          </div>
          <div className="flex items-center gap-5 font-medium text-[var(--text-secondary)]">
            <Link
              href={`/public/${user.username}`}
              target="_blank"
              className="hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors duration-150"
            >
              Public Profile
              <ExternalLink className="h-3 w-3" />
            </Link>
            <span className="text-[var(--text-muted)] font-normal">© 2026 Sched Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
