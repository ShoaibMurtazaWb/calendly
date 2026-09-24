"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Copy,
  Check,
  Edit2,
  Archive,
  ArchiveRestore,
  Search,
  Plus,
  ArrowRight,
  Link2,
  Inbox,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { api, type CurrentUser, type EventType } from "@/lib/api";
import { ApiError } from "@/lib/api-error";

export function EventTypeList() {
  const [activeItems, setActiveItems] = useState<EventType[]>([]);
  const [archivedItems, setArchivedItems] = useState<EventType[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [me, activeList, archivedList] = await Promise.all([
        api<CurrentUser>("/auth/me"),
        api<EventType[]>("/event-types?status=active"),
        api<EventType[]>("/event-types?status=archived"),
      ]);
      setUser(me);
      setActiveItems(activeList);
      setArchivedItems(archivedList);
    } catch {
      setError("Could not load event types.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleArchive(id: string) {
    try {
      await api(`/event-types/${id}/archive`, { method: "POST" });
      toast.info("Event type archived", "This link is now inactive and hidden from public booking.");
      await loadData();
    } catch {
      setError("Could not archive the event type.");
      toast.error("Could not archive the event type");
    }
  }

  async function handleUnarchive(id: string) {
    try {
      await api(`/event-types/${id}/unarchive`, { method: "POST" });
      toast.success("Event type restored to active", "This booking link is live again.");
      await loadData();
    } catch {
      setError("Could not restore the event type.");
      toast.error("Could not restore the event type");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to permanently delete this event type? This action cannot be undone.")) {
      return;
    }
    try {
      await api(`/event-types/${id}`, { method: "DELETE" });
      toast.success("Event type permanently deleted");
      await loadData();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        toast.error("Cannot delete event type", caught.message);
      } else {
        setError("Could not delete the event type.");
        toast.error("Could not delete the event type");
      }
    }
  }

  function handleCopy(slug: string, id: string) {
    if (!user) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const fullUrl = `${origin}/public/${user.username}/${slug}`;
    void navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success("Link copied to clipboard", fullUrl);
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  const currentList = tab === "active" ? activeItems : archivedItems;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const query = searchQuery.toLowerCase();
    return currentList.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  }, [currentList, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Event Types</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create and manage your personal booking links.
          </p>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Active / Archived Tab Toggle */}
          <div className="flex items-center rounded-lg bg-[var(--bg-subtle)] p-1 border border-[var(--border-subtle)] shadow-2xs">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ease-out cursor-pointer ${
                tab === "active"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>Active</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-sans ${
                  tab === "active"
                    ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                    : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                }`}
              >
                {activeItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("archived")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ease-out cursor-pointer ${
                tab === "archived"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span>Archived</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-sans ${
                  tab === "archived"
                    ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                    : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                }`}
              >
                {archivedItems.length}
              </span>
            </button>
          </div>

          {/* Search Filter Input */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter event types..."
              className="h-9 pl-9 pr-9 text-xs"
            />
            <button
              type="button"
              onClick={() => searchInputRef.current?.focus()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1 py-0.5 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
              title="Focus search (⌘K or Ctrl+K)"
            >
              ⌘K
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] p-3.5 text-xs text-[var(--status-danger-text)] font-medium">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-56 rounded-xl border border-[var(--border-subtle)]" />
          <Skeleton className="h-56 rounded-xl border border-[var(--border-subtle)]" />
        </div>
      )}

      {/* 2-Column Event Type Cards Grid */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredItems.map((item) => {
            const isCopied = copiedId === item.id;
            const displayUrl = user
              ? `sched.com/public/@${user.username}/${item.slug}`
              : `/public/.../${item.slug}`;

            return (
              <Card
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs hover:border-[var(--border-strong)] transition-[border-color,box-shadow] duration-150 ease-out"
              >
                <div>
                  {/* Top Row: Active status indicator & Duration pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          tab === "active" ? "bg-emerald-500" : "bg-neutral-400"
                        }`}
                      />
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {tab === "active" ? "Active" : "Archived"}
                      </span>
                    </div>

                    {/* Duration Pill */}
                    <div className="flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                      <Clock className="h-3 w-3 text-[var(--text-muted)]" />
                      <span className="tabular-nums font-sans">{item.durationMinutes} min</span>
                    </div>
                  </div>

                  {/* Event Title */}
                  <h2 className="mt-3 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    {item.title}
                  </h2>

                  {/* Event Description */}
                  <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed min-h-[2.5rem]">
                    {item.description || "No description provided."}
                  </p>

                  {/* Public URL Container Box */}
                  <div
                    onClick={() => handleCopy(item.slug, item.id)}
                    title="Click to copy public link"
                    className="mt-4 flex items-center justify-between rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)]/50 border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] font-mono transition-colors duration-150 cursor-pointer select-all"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Link2 className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                      <span className="truncate">{displayUrl}</span>
                    </div>
                    <span className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      {isCopied ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-sans font-medium text-[11px]">
                          <Check className="h-3.5 w-3.5" /> Copied
                        </span>
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Action Toolbar Footer */}
                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {tab === "archived" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleUnarchive(item.id)}
                        className="gap-1.5"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        <span>Restore</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(item.slug, item.id)}
                          className="gap-1.5"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </Button>

                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                        >
                          <Link href={`/dashboard/event-types/${item.id}/edit`}>
                            <Edit2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            <span>Edit</span>
                          </Link>
                        </Button>

                        {user && (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <Link href={`/public/${user.username}/${item.slug}`} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Preview</span>
                            </Link>
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {tab === "active" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleArchive(item.id)}
                        className="gap-1.5 border border-orange-500 bg-orange-500 text-white hover:bg-white hover:text-orange-600 hover:border-orange-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-auto disabled:hover:bg-orange-500 disabled:hover:text-white disabled:hover:border-orange-500 shadow-2xs transition-[background-color,border-color,color] duration-150 ease-out"
                        title="Archive event type"
                        aria-label="Archive event type"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archive</span>
                      </Button>
                    )}

                    {/* Delete Action (Always visible on both Active and Archived) */}
                    <Button
                      type="button"
                      size="sm"
                      disabled={(item.bookingCount ?? 0) > 0}
                      onClick={() => void handleDelete(item.id)}
                      className="gap-1.5 border border-rose-600 bg-rose-600 text-white hover:bg-white hover:text-rose-600 hover:border-rose-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-auto disabled:hover:bg-rose-600 disabled:hover:text-white disabled:hover:border-rose-600 shadow-2xs transition-[background-color,border-color,color] duration-150 ease-out"
                      title={
                        (item.bookingCount ?? 0) > 0
                          ? "Cannot delete this event type because it has active bookings."
                          : "Permanently delete event type"
                      }
                      aria-label={
                        (item.bookingCount ?? 0) > 0
                          ? "Cannot delete this event type because it has active bookings."
                          : "Permanently delete event type"
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State when no active event types exist */}
      {!isLoading && filteredItems.length === 0 && tab === "active" && !searchQuery && (
        <div className="mt-8">
          <Link
            href="/dashboard/event-types/new"
            className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-focus)] p-12 text-center transition-[background-color,border-color] duration-150 cursor-pointer shadow-2xs"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shadow-2xs group-hover:scale-105 group-hover:bg-neutral-900 group-hover:text-white transition-all duration-150 mb-3">
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              No active event types yet
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Create your first event type to share your booking link.
            </p>
          </Link>
        </div>
      )}

      {/* Empty State for Search Filter or Archived Tab */}
      {!isLoading && filteredItems.length === 0 && (searchQuery || tab === "archived") && (
        <div className="mt-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center shadow-2xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-3">
            <Inbox className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {searchQuery ? "No matching event types" : "No archived event types"}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different keyword.`
              : "Archived event types will appear here."}
          </p>
        </div>
      )}

      {/* Archived Notice Banner */}
      {!isLoading && tab === "active" && archivedItems.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] shrink-0">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Looking for archived links?</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {archivedItems.length} archived event type{archivedItems.length > 1 ? "s are" : " is"} currently inactive and hidden from your public booker.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTab("archived")}
            className="self-start sm:self-center shrink-0"
          >
            View Archived
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
