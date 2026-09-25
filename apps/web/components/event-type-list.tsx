"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  Calendar,
  ChevronDown,
  Info,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
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
    <div className="w-full space-y-6">
      {/* Calendly Secondary Header Row (Directly under Top Navbar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-black">Scheduling</h1>
          <Tooltip content="Manage your event types, booking links, and scheduling options.">
            <Info className="h-4 w-4 text-neutral-400 cursor-pointer hover:text-neutral-700 transition-colors" />
          </Tooltip>
        </div>

        {/* Right Header Actions: Manage Availability & Create Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            asChild
            variant="outline"
            className="rounded-full border-neutral-300 bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-800 shadow-2xs gap-2 transition-all cursor-pointer"
          >
            <Link href="/dashboard/availability">
              <Calendar className="h-3.5 w-3.5 text-neutral-600" />
              <span>Manage availability</span>
            </Link>
          </Button>

          <Button
            asChild
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-2xs gap-1.5 transition-all cursor-pointer"
          >
            <Link href="/dashboard/event-types/new">
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Create</span>
              <ChevronDown className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Subtabs Bar (Calendly Style) */}
      <div className="flex items-center gap-8 border-b border-neutral-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            tab === "active"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-neutral-600 hover:text-black"
          }`}
        >
          Event types ({activeItems.length})
        </button>

        <button
          type="button"
          onClick={() => setTab("archived")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            tab === "archived"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-neutral-600 hover:text-black"
          }`}
        >
          Archived ({archivedItems.length})
        </button>

        <button
          type="button"
          disabled
          className="pb-3 border-b-2 border-transparent text-neutral-400 cursor-not-allowed hidden sm:inline-flex items-center gap-1.5"
        >
          <span>Single-use links</span>
          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-100 text-neutral-400">Soon</span>
        </button>

        <button
          type="button"
          disabled
          className="pb-3 border-b-2 border-transparent text-neutral-400 cursor-not-allowed hidden sm:inline-flex items-center gap-1.5"
        >
          <span>Meeting polls</span>
          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-100 text-neutral-400">Soon</span>
        </button>
      </div>

      {/* Search Bar Input */}
      <div className="max-w-md relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search event types"
          className="h-10 pl-10 pr-9 rounded-xl border-neutral-200 bg-white text-xs shadow-2xs focus:border-neutral-400"
        />
        <button
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 text-[10px] font-mono text-neutral-500 hover:text-black transition-colors cursor-pointer"
          title="Focus search (⌘K or Ctrl+K)"
        >
          ⌘K
        </button>
      </div>

      {/* Host User Identity Strip (Calendly Style) */}
      {user && (
        <div className="flex items-center justify-between py-1 px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold select-none">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-black">{user.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/public/${user.username}`}
              target="_blank"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View landing page</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              type="button"
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
              title="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4 pt-2">
          <Skeleton className="h-28 w-full rounded-xl border border-neutral-200" />
          <Skeleton className="h-28 w-full rounded-xl border border-neutral-200" />
        </div>
      )}

      {/* Full-Width Event Cards List (Calendly Style) */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <Card
                key={item.id}
                className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all border-l-[5px] border-l-purple-600 w-full"
              >
                {/* Left: Checkbox + Event Meta */}
                <div className="flex items-start gap-4 min-w-0">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    aria-label={`Select ${item.title}`}
                  />

                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/event-types/${item.id}/edit`}
                      className="text-base font-bold text-black hover:text-blue-600 transition-colors inline-block"
                    >
                      {item.title}
                    </Link>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 font-medium">
                      <span>{item.durationMinutes} min</span>
                      <span>•</span>
                      <span>{item.location?.type ? item.location.type.replace(/_/g, " ") : "Video Call"}</span>
                      <span>•</span>
                      <span>One-on-One</span>
                    </div>

                    <p className="mt-0.5 text-xs text-neutral-500 font-normal">
                      Weekdays, hours vary
                    </p>
                  </div>
                </div>

                {/* Right: Actions (Copy Link, Preview, Edit, Archive, Delete) */}
                <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                  {tab === "active" ? (
                    <>
                      {/* Copy Link Pill Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(item.slug, item.id)}
                        className="rounded-full border-neutral-300 bg-white hover:bg-neutral-50 px-3.5 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs gap-1.5 transition-all cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3.5 w-3.5 text-neutral-500" />
                            <span>Copy link</span>
                          </>
                        )}
                      </Button>

                      {/* Direct Preview Link in New Tab */}
                      {user && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-neutral-500 hover:text-black hover:bg-neutral-100"
                          title="Preview public page"
                        >
                          <Link href={`/public/${user.username}/${item.slug}`} target="_blank">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}

                      {/* Edit Button */}
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-neutral-500 hover:text-black hover:bg-neutral-100"
                        title="Edit event type"
                      >
                        <Link href={`/dashboard/event-types/${item.id}/edit`}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                      </Button>

                      {/* Archive Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleArchive(item.id)}
                        className="h-8 w-8 rounded-full text-neutral-500 hover:text-amber-600 hover:bg-amber-50"
                        title="Archive event type"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    /* Restore Button for Archived items */
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleUnarchive(item.id)}
                      className="rounded-full border-neutral-300 gap-1.5 text-xs font-semibold"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </Button>
                  )}

                  {/* Delete Button */}
                  <Tooltip
                    content="Cannot delete this event type because it has existing bookings."
                    disabled={(item.bookingCount ?? 0) === 0}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={(item.bookingCount ?? 0) > 0}
                      onClick={() => void handleDelete(item.id)}
                      className="h-8 w-8 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Delete event type"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State when no active event types exist */}
      {!isLoading && filteredItems.length === 0 && tab === "active" && !searchQuery && (
        <div className="mt-8">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 shadow-2xs mb-4">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-black">
              Welcome to Sched
            </h3>
            <p className="mt-1.5 text-xs text-neutral-600 max-w-sm leading-relaxed">
              Create your first event type and start sharing your booking page with clients and teammates.
            </p>
            <div className="mt-6">
              <Button asChild size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2">
                <Link href="/dashboard/event-types/new">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Event Type</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Search Filter or Archived Tab */}
      {!isLoading && filteredItems.length === 0 && (searchQuery || tab === "archived") && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-2xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 mb-3">
            <Inbox className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-black">
            {searchQuery ? "No matching event types" : "No archived event types"}
          </h3>
          <p className="mt-1 text-xs text-neutral-600 max-w-sm mx-auto">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different search keyword.`
              : "Archived event types will appear here."}
          </p>
        </div>
      )}

      {/* Archived Notice Banner */}
      {!isLoading && tab === "active" && archivedItems.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 shrink-0">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-black">Looking for archived links?</p>
              <p className="text-xs text-neutral-600">
                {archivedItems.length} archived event type{archivedItems.length > 1 ? "s are" : " is"} currently inactive.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTab("archived")}
            className="rounded-full border-neutral-300 self-start sm:self-center shrink-0 font-semibold text-xs"
          >
            View Archived
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
