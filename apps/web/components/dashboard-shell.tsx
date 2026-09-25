"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Link2,
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
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Sliders,
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
  
  // Persisted collapsible sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sched_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sched_sidebar_collapsed", String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

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

  // Navigation Items matching Calendly's exact taxonomy
  const mainNavItems = useMemo(
    () => [
      {
        label: "Scheduling",
        href: "/dashboard",
        active: pathname === "/dashboard" || pathname.startsWith("/dashboard/event-types"),
        icon: Link2,
      },
      {
        label: "Meetings",
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
      {
        label: "Integrations & apps",
        href: "/dashboard/integrations",
        active: pathname.startsWith("/dashboard/integrations"),
        icon: Puzzle,
      },
    ],
    [pathname]
  );

  const secondaryNavItems = useMemo(
    () => [
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        active: pathname.startsWith("/dashboard/analytics"),
        icon: BarChart3,
      },
      {
        label: "Admin center",
        href: "/dashboard/settings",
        active: pathname.startsWith("/dashboard/settings"),
        icon: Sliders,
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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Refreshed Announcement Banner (Calendly Style) */}
      <div className="border-b border-pink-200/60 bg-gradient-to-r from-purple-100 via-pink-50 to-amber-50 px-4 py-2 text-center text-xs font-medium text-neutral-800 shrink-0">
        <div className="flex items-center justify-center gap-2">
          <span>A new, refreshed Sched is live!</span>
          <Link
            href="/dashboard"
            className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-900 border border-neutral-300/80 shadow-2xs hover:bg-white transition-colors inline-flex items-center gap-1"
          >
            Explore features →
          </Link>
        </div>
      </div>

      {/* Main App Container */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile Header Bar (< md) */}
        <header className="md:hidden sticky top-0 z-40 flex w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <Logo className="h-7 w-7" />
              <span className="font-bold tracking-tight text-[var(--text-primary)] text-base">Sched</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-7 px-2.5 text-xs rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1">
              <Link href="/dashboard/event-types/new">
                <Plus className="h-3 w-3" />
                <span>Create</span>
              </Link>
            </Button>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
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

        {/* Dynamic Collapsible Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-[width,transform] duration-500 ease-in-out md:static md:translate-x-0 relative ${
            isMobileMenuOpen ? "translate-x-0 w-[240px]" : "-translate-x-full md:translate-x-0"
          } ${isCollapsed ? "md:w-[76px]" : "md:w-[240px]"}`}
        >
          {/* Floating Expand Button on Right Border (When Collapsed) */}
          {isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden md:flex absolute -right-4 top-3.5 z-50 h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-md text-neutral-900 hover:bg-neutral-50 hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="h-4 w-4 stroke-[2.5] text-neutral-800" />
            </button>
          )}

          {/* Top Section: Logo & Toggle Button + Create CTA */}
          <div className={`flex flex-col flex-1 overflow-y-auto ${isCollapsed ? "px-2" : "px-4"} py-4 transition-[padding] duration-500`}>
            {/* Logo Row + Collapse Button */}
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} mb-5 px-1 min-h-[40px]`}>
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <Logo className="h-10 w-10 transition-transform duration-150 group-hover:scale-105 shrink-0" />
                {!isCollapsed && (
                  <span className="font-bold tracking-tight text-[var(--text-primary)] text-xl whitespace-nowrap overflow-hidden transition-all duration-300">
                    Sched
                  </span>
                )}
              </Link>

              {/* Desktop Collapse Button (When Expanded) - No border, circular hover */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden md:flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <ChevronsLeft className="h-4 w-4 stroke-[2.5]" />
                </button>
              )}

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* "+ Create" Action Button (Calendly Style) */}
            <div className="mb-5">
              {isCollapsed ? (
                <div className="flex justify-center">
                  <Button
                    asChild
                    size="icon"
                    className="h-10 w-10 rounded-full border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 shadow-2xs hover:border-neutral-400 transition-all cursor-pointer"
                    title="Create Event Type"
                  >
                    <Link href="/dashboard/event-types/new">
                      <Plus className="h-5 w-5 stroke-[2.5]" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-center gap-2 h-10 rounded-full border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 shadow-2xs font-semibold text-sm hover:border-neutral-400 transition-all cursor-pointer"
                >
                  <Link href="/dashboard/event-types/new">
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span className="whitespace-nowrap">Create</span>
                  </Link>
                </Button>
              )}
            </div>

            {/* Main Navigation List */}
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                if (isCollapsed) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-center transition-all ${
                        item.active
                          ? "bg-blue-50 text-blue-600 font-semibold shadow-2xs"
                          : "text-neutral-600 hover:bg-[var(--bg-subtle)] hover:text-neutral-900"
                      }`}
                      title={item.label}
                    >
                      <Icon className={`h-5 w-5 mb-1 shrink-0 ${item.active ? "text-blue-600" : "text-neutral-600"}`} />
                      <span className="text-[10px] leading-tight line-clamp-1 font-medium">{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-[background-color,color] duration-150 ${
                      item.active
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-neutral-600 hover:bg-[var(--bg-subtle)] hover:text-neutral-900"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        item.active ? "text-blue-600" : "text-neutral-500"
                      }`}
                    />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Spacer */}
            <div className="my-3 border-t border-[var(--border-subtle)]" />

            {/* Secondary Navigation */}
            <nav className="space-y-1">
              {/* Upgrade Plan Action (Calendly Style) */}
              {!isCollapsed ? (
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 rounded-full border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors mb-2"
                >
                  <CreditCard className="h-4 w-4 text-neutral-500 shrink-0" />
                  <span className="whitespace-nowrap">Upgrade plan</span>
                </Link>
              ) : (
                <Link
                  href="/dashboard/settings"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center text-neutral-600 hover:bg-[var(--bg-subtle)] transition-all mb-1"
                  title="Upgrade plan"
                >
                  <CreditCard className="h-5 w-5 mb-0.5 text-neutral-500" />
                  <span className="text-[9px] font-medium leading-tight">Upgrade</span>
                </Link>
              )}

              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                if (isCollapsed) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all ${
                        item.active
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-neutral-600 hover:bg-[var(--bg-subtle)] hover:text-neutral-900"
                      }`}
                      title={item.label}
                    >
                      <Icon className={`h-5 w-5 mb-0.5 shrink-0 ${item.active ? "text-blue-600" : "text-neutral-600"}`} />
                      <span className="text-[9px] leading-tight line-clamp-1 font-medium">{item.label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
                      item.active
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-neutral-600 hover:bg-[var(--bg-subtle)] hover:text-neutral-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${item.active ? "text-blue-600" : "text-neutral-500"}`} />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-[var(--bg-canvas)]">
          {/* Top Bar with User Profile Dropdown */}
          <header className="hidden md:flex h-14 items-center justify-end border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-8 gap-4">
            {/* Host Local Time & Timezone Pill */}
            {user.timezone && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-subtle)] text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                <Globe className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                <span className="font-mono text-[11px]">{user.timezone}</span>
                {currentTime && (
                  <span className="font-mono font-medium text-[var(--text-primary)] tabular-nums pl-1 border-l border-[var(--border-subtle)]">
                    {currentTime}
                  </span>
                )}
              </div>
            )}

            {/* User Profile Dropdown Menu in Top Navbar */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full p-1 pl-2 hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
                aria-expanded={isDropdownOpen}
                aria-label="User account menu"
              >
                <div className="relative">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold select-none shadow-2xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-150 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown Menu Card */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] mb-1">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{user.name}</p>
                    <p className="text-[11px] font-mono text-neutral-500 truncate">@{user.username}</p>
                    <p className="text-[10px] text-neutral-400 truncate">{user.email}</p>
                  </div>

                  <Link
                    href={`/public/${user.username}`}
                    target="_blank"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-700 hover:bg-[var(--bg-subtle)] hover:text-neutral-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Public Booking Profile</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-neutral-400" />
                  </Link>

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-700 hover:bg-[var(--bg-subtle)] hover:text-neutral-900 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Account Settings</span>
                  </Link>

                  <div className="my-1 border-t border-[var(--border-subtle)]" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      void logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Dynamic Page Body */}
          <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
