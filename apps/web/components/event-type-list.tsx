"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Copy,
  Check,
  Edit2,
  Archive,
  Search,
  Plus,
  ArrowRight,
  Link2,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type CurrentUser, type EventType } from "@/lib/api";

function getCategoryBadge(duration: number, title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("intro") || lower.includes("sync") || duration <= 15) return "INSTANT SYNC";
  if (lower.includes("strategy") || lower.includes("review") || duration === 30) return "STRATEGIC CALL";
  if (lower.includes("engineer") || lower.includes("arch") || duration === 45) return "TECHNICAL PLANNING";
  if (lower.includes("advisory") || lower.includes("exec") || duration >= 60) return "LEADERSHIP";
  return "MEETING";
}

export function EventTypeList() {
  const [activeItems, setActiveItems] = useState<EventType[]>([]);
  const [archivedItems, setArchivedItems] = useState<EventType[]>([]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadData() {
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
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleArchive(id: string) {
    try {
      await api(`/event-types/${id}/archive`, { method: "POST" });
      await loadData();
    } catch {
      setError("Could not archive the event type.");
    }
  }

  function handleCopy(slug: string, id: string) {
    if (!user) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const fullUrl = `${origin}/public/${user.username}/${slug}`;
    void navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
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
    <DashboardShell>
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Event Types</h1>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-mono text-slate-600">
              v0.1.0
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage your personal and team booking links.
          </p>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Active / Archived Tab Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                tab === "active"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Active</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  tab === "active" ? "bg-slate-100 text-slate-900 font-semibold" : "bg-slate-200/80 text-slate-500"
                }`}
              >
                {activeItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("archived")}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                tab === "archived"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Archived</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  tab === "archived" ? "bg-slate-100 text-slate-900 font-semibold" : "bg-slate-200/80 text-slate-500"
                }`}
              >
                {archivedItems.length}
              </span>
            </button>
          </div>

          {/* Search Filter Input */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter event types..."
              className="h-9 pl-9 pr-8 text-xs rounded-xl bg-white border-slate-200/90 shadow-2xs placeholder:text-slate-400"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-mono text-slate-400">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 2-Column Event Type Cards Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredItems.map((item) => {
          const category = getCategoryBadge(item.durationMinutes, item.title);
          const isCopied = copiedId === item.id;
          const displayUrl = user ? `sched.com/public/@${user.username}/${item.slug}` : `/public/.../${item.slug}`;

          return (
            <Card
              key={item.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-md transition-all duration-200"
            >
              {/* Card Top Category & Duration Row */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
                      {category}
                    </span>
                  </div>

                  {/* Duration Pill */}
                  <div className="flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>{item.durationMinutes}m</span>
                  </div>
                </div>

                {/* Event Title */}
                <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-950 group-hover:text-blue-900 transition-colors">
                  {item.title}
                </h2>

                {/* Event Description */}
                <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                  {item.description || "No description provided."}
                </p>

                {/* Public URL Container Box */}
                <div
                  onClick={() => handleCopy(item.slug, item.id)}
                  title="Click to copy public link"
                  className="mt-4 flex items-center justify-between rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 px-3.5 py-2.5 text-xs text-slate-600 font-mono transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{displayUrl}</span>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                    aria-label="Copy link"
                  >
                    {isCopied ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-sans font-medium text-[11px]">
                        <Check className="h-3.5 w-3.5" /> Copied
                      </span>
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Toolbar Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(item.slug, item.id)}
                    className="h-8 rounded-lg text-xs font-medium gap-1.5 border-slate-200 hover:bg-slate-50"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>

                  {tab === "active" && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-medium gap-1.5 border-slate-200 hover:bg-slate-50"
                    >
                      <Link href={`/dashboard/event-types/${item.id}/edit`}>
                        <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                        <span>Edit</span>
                      </Link>
                    </Button>
                  )}

                  {user && tab === "active" && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-medium gap-1 text-slate-500 hover:text-slate-900"
                    >
                      <Link href={`/public/${user.username}/${item.slug}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </Link>
                    </Button>
                  )}
                </div>

                {tab === "active" && (
                  <button
                    type="button"
                    onClick={() => void handleArchive(item.id)}
                    className="rounded-lg p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Archive event type"
                    aria-label="Archive event type"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty State when no items match */}
      {filteredItems.length === 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {searchQuery ? "No matching event types" : tab === "active" ? "No active event types" : "No archived event types"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different keyword.`
              : tab === "active"
              ? "Create your first event type to share your public booking link."
              : "Archived event types will appear here."}
          </p>
          {tab === "active" && !searchQuery && (
            <Button asChild className="mt-5 rounded-xl bg-slate-950 text-white hover:bg-slate-800" size="sm">
              <Link href="/dashboard/event-types/new">
                <Plus className="mr-1.5 h-4 w-4" /> Create Event Type
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Archived Notice Banner (Shown in Active tab when archived items exist) */}
      {tab === "active" && archivedItems.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Looking for archived links?</p>
              <p className="text-xs text-slate-500">
                {archivedItems.length} archived event type{archivedItems.length > 1 ? "s are" : " is"} currently inactive and hidden from your public booker.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTab("archived")}
            className="rounded-xl border-slate-200 text-xs font-medium hover:bg-slate-50 self-start sm:self-center shrink-0"
          >
            View Archived
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Bottom Custom Event Type CTA Card */}
      {tab === "active" && (
        <Link
          href="/dashboard/event-types/new"
          className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200/80 bg-blue-50/30 hover:bg-blue-50/60 hover:border-blue-300 p-8 text-center transition-all cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-blue-200 text-blue-700 shadow-2xs group-hover:scale-110 transition-transform mb-2">
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-900">
            Create custom event type
          </span>
          <span className="text-xs text-slate-500">
            Round robin, collective team links, or variable duration availability
          </span>
        </Link>
      )}
    </DashboardShell>
  );
}
