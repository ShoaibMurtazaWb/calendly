"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Layers,
  Clock,
  Puzzle,
  BarChart3,
  Plus,
  LogOut,
  ExternalLink,
  ChevronDown,
  Globe,
  User as UserIcon,
  Settings,
  Menu,
  X,
  Copy,
  Check,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Click-outside listener to close user menu dropdown
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

  // Minute-level clock updates
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

  const handleCopyProfileLink = async () => {
    if (!user) return;
    const url = `${window.location.origin}/public/${user.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const navGroups = useMemo(
    () => [
      {
        title: "Scheduling",
        items: [
          {
            label: "Event Types",
            href: "/dashboard",
            active: pathname === "/dashboard" || pathname.startsWith("/dashboard/event-types"),
            icon: Layers,
          },
          {
            label: "Scheduled Events",
            href: "/dashboard/bookings",
            active: pathname.startsWith("/dashboard/bookings"),
            icon: Calendar,
          },
          {
            label: "Availability",
            href: "/dashboard/availability",
            active: pathname.startsWith("/dashboard/availability"),
            icon: Clock,
          },
        ],
      },
      {
        title: "Insights & Apps",
        items: [
          {
            label: "Analytics",
            href: "/dashboard/analytics",
            active: pathname.startsWith("/dashboard/analytics"),
            icon: BarChart3,
          },
          {
            label: "Integrations & Apps",
            href: "/dashboard/integrations",
            active: pathname.startsWith("/dashboard/integrations"),
            icon: Puzzle,
          },
        ],
      },
      {
        title: "Configuration",
        items: [
          {
            label: "Settings & Profile",
            href: "/dashboard/settings",
            active: pathname.startsWith("/dashboard/settings"),
            icon: Settings,
          },
        ],
      },
    ],
    [pathname]
  );

  // Active page title helper for breadcrumb
  const activePageTitle = useMemo(() => {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/event-types")) return "Event Types";
    if (pathname.startsWith("/dashboard/bookings")) return "Scheduled Events";
    if (pathname.startsWith("/dashboard/availability")) return "Availability & Schedules";
    if (pathname.startsWith("/dashboard/analytics")) return "Analytics & Reports";
    if (pathname.startsWith("/dashboard/integrations")) return "Integrations & Apps";
    if (pathname.startsWith("/dashboard/settings")) return "Account Settings";
    return "Dashboard";
  }, [pathname]);

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
            <Button type="button" onClick={() => void checkAuth()} size="sm">
              Retry Connection
            </Button>
            <Button asChild variant="outline" size="sm">
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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col md:flex-row antialiased">
      {/* Mobile Header Bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-bold tracking-tight text-[var(--text-primary)] text-base">Sched</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-8 px-2.5 text-xs gap-1">
            <Link href="/dashboard/event-types/new">
              <Plus className="h-3.5 w-3.5" />
              <span>Create</span>
            </Link>
          </Button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white text-[11px] font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Calendly-Style Left Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Sidebar Top Header & Navigation */}
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5">
          {/* Brand Logo & Name */}
          <div className="flex items-center justify-between px-2 mb-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <Logo className="h-7 w-7 transition-transform duration-150 group-hover:scale-105" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-[var(--text-primary)] text-lg">Sched</span>
                <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                  Pro
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Primary "+ Create" Action Button (Calendly Style) */}
          <div className="mb-6 px-1">
            <Button
              asChild
              className="w-full justify-center gap-2 h-10 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm font-semibold text-sm transition-all"
            >
              <Link href="/dashboard/event-types/new">
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Create Event Type</span>
              </Link>
            </Button>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-[background-color,color] duration-150 ${
                          item.active
                            ? "bg-neutral-900 text-white font-semibold shadow-xs"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            item.active ? "text-white" : "text-[var(--text-muted)]"
                          }`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom Profile Card */}
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
          {/* Host Local Time */}
          {user.timezone && (
            <div className="flex items-center justify-between px-2.5 py-1.5 mb-2 rounded-lg bg-[var(--bg-subtle)] text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5 truncate">
                <Globe className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                <span className="truncate font-mono">{user.timezone}</span>
              </div>
              {currentTime && (
                <span className="font-mono font-medium text-[var(--text-primary)] tabular-nums shrink-0">
                  {currentTime}
                </span>
              )}
            </div>
          )}

          {/* User Profile / Account Quick Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl p-2 hover:bg-[var(--bg-subtle)] transition-[background-color] duration-150 cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold shadow-2xs select-none">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)] leading-tight">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] font-mono text-[var(--text-muted)]">
                    @{user.username}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-150 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Popup */}
            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="p-2 border-b border-[var(--border-subtle)] mb-1">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                </div>

                <Link
                  href={`/public/${user.username}`}
                  target="_blank"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>View Public Page</span>
                  </div>
                  <ExternalLink className="h-3 w-3 text-[var(--text-muted)]" />
                </Link>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>Account Settings</span>
                </Link>

                <div className="my-1 border-t border-[var(--border-subtle)]" />

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Bar for Desktop Content Area */}
        <header className="hidden md:flex sticky top-0 z-30 h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md px-8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Workspace</span>
            <span className="text-[var(--text-muted)]">/</span>
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">{activePageTitle}</h1>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            {/* Fast Copy Public Booking Link */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyProfileLink}
              className="gap-1.5 text-xs h-8"
              title="Copy your personal booking link"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>Copy Page Link</span>
                </>
              )}
            </Button>

            {/* Direct Link to Public Profile */}
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <Link href={`/public/${user.username}`} target="_blank">
                <span>View Live Page</span>
                <ExternalLink className="h-3 w-3 text-[var(--text-muted)]" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-8 py-4 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <Logo className="h-4 w-4" />
              <span className="font-semibold text-[var(--text-primary)]">Sched</span>
              <span>— Autonomous Scheduling Infrastructure</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
              <span>© 2026 Sched</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
