"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  X,
  Mail,
  Smartphone,
  Globe,
  MapPin,
  Video,
  PhoneCall,
  Clock,
  RefreshCw,
  Trash2,
  ExternalLink,
  Download,
  Copy,
  MoreVertical,
  User,
  FileText,
  Plus,
  Pencil,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import type { BookingResponse } from "@sched/api-contract";

interface BookingDetailDrawerProps {
  booking: BookingResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (booking: BookingResponse) => void;
  onCancel: (booking: BookingResponse) => void;
  onDelete?: (booking: BookingResponse) => void;
}

export function BookingDetailDrawer({
  booking,
  isOpen,
  onClose,
  onReschedule,
  onCancel,
  onDelete,
}: BookingDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"details" | "notes">("details");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!booking) {
    return null;
  }

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const createdAtDate = new Date(booking.createdAt);
  const isCancelled = booking.status === "CANCELLED";
  const isPast = new Date(booking.endTime) < new Date() && !isCancelled;

  // Formatted date representations matching screenshot
  const formattedDayAndDate = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(startDate);

  const formattedTimeRange = `${new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startDate).replace(":00", "").toLowerCase()} – ${new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(endDate).toLowerCase()}`;

  const bookedDateFormatted = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    day: "numeric",
    month: "long",
  }).format(createdAtDate);

  const bookedTimeFormatted = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(createdAtDate).toLowerCase().replace(" ", "");

  const startsDateFormatted = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    day: "numeric",
    month: "long",
  }).format(startDate);

  const startsTimeFormatted = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(startDate).toLowerCase().replace(":00", "");

  const tzShort = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.host.timezone,
    timeZoneName: "short",
  }).format(startDate).split(" ").pop() || booking.host.timezone;

  const attendeeInitials = booking.attendeeName
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";

  const hostInitial = booking.host.name.charAt(0).toLowerCase() || "h";

  const handleCopyEmail = () => {
    void navigator.clipboard.writeText(booking.attendeeEmail);
    toast.success("Email copied to clipboard", booking.attendeeEmail);
  };

  const handleCopyPhone = () => {
    if (!booking.attendeePhoneNumber) return;
    void navigator.clipboard.writeText(booking.attendeePhoneNumber);
    toast.success("Phone number copied to clipboard", booking.attendeePhoneNumber);
  };

  const handleCopyPublicLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/public/bookings/${booking.id}`;
    void navigator.clipboard.writeText(url);
    toast.success("Meeting link copied to clipboard");
    setIsMenuOpen(false);
  };

  const handleAddNotetaker = () => {
    toast.success("AI Notetaker requested", "A notetaker has been assigned to attend this session.");
  };

  // Determine video/meeting location details
  const isVideoLocation = !booking.location || booking.location.type === "STATIC_VIDEO" || booking.location.type === "CUSTOM_LINK";
  const locationLabel = booking.location
    ? booking.location.type === "IN_PERSON"
      ? "In-Person"
      : booking.location.type === "HOST_CALLS_ATTENDEE" || booking.location.type === "ATTENDEE_CALLS_HOST"
      ? "Phone Call"
      : "Zoom"
    : "Zoom";

  const joinUrl = booking.location?.data?.url ? String(booking.location.data.url) : `/public/bookings/${booking.id}`;

  return (
    <>
      {/* Backdrop overlay on mobile screens */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Slide-in Drawer matching Calendly sidebar */}
      <aside
        className={`w-full md:w-[440px] lg:w-[480px] rounded-2xl border border-neutral-200 bg-white shadow-xl flex flex-col h-full min-h-[620px] max-h-[calc(100vh-7rem)] sticky top-6 z-40 transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full hidden lg:flex"
        }`}
        style={{ display: isOpen ? "flex" : "none" }}
      >
        {/* Drawer Header matching screenshot */}
        <div className="px-6 pt-5 pb-3 border-b border-neutral-200 sticky top-0 bg-white z-10 rounded-t-2xl space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-base font-bold tracking-tight text-neutral-900 truncate">
                {booking.eventType.title}
              </h2>
              <p className="text-xs font-medium text-neutral-600">
                {formattedDayAndDate}
              </p>
              <p className="text-xs text-neutral-500">
                {formattedTimeRange} ({booking.host.timezone})
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-full text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action Buttons: Add Notetaker, Reschedule & Cancel matching screenshot */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!isCancelled && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNotetaker}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Notetaker</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReschedule(booking)}
                  className="rounded-full border border-neutral-800 text-neutral-800 hover:bg-neutral-50 px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reschedule</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(booking)}
                  className="rounded-full border border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </Button>
              </>
            )}

            {isCancelled && (
              <>
                <Badge variant="danger" className="text-xs py-1 px-3">
                  Cancelled
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReschedule(booking)}
                  className="rounded-full border-neutral-300 text-neutral-800 hover:bg-neutral-50 px-3.5 py-1 text-xs font-semibold gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Rebook</span>
                </Button>
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(booking)}
                    className="text-rose-600 hover:bg-rose-50 text-xs px-3 py-1 rounded-full"
                  >
                    Delete record
                  </Button>
                )}
              </>
            )}

            {isPast && (
              <Button asChild variant="outline" size="sm" className="rounded-full border-neutral-300 text-xs">
                <Link href={`/public/${booking.host.username}/${booking.eventType.slug}`} target="_blank">
                  <span>Schedule Follow-up</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Sub-Tabs: Details vs Notes */}
          <div className="flex items-center gap-6 pt-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className="relative pb-2 transition-colors cursor-pointer text-neutral-900"
            >
              <span>Details</span>
              {activeTab === "details" && (
                <div className="absolute bottom-0 inset-x-0 h-[3px] bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className="relative pb-2 transition-colors cursor-pointer text-neutral-600 hover:text-neutral-900"
            >
              <span>Notes</span>
              {activeTab === "notes" && (
                <div className="absolute bottom-0 inset-x-0 h-[3px] bg-blue-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {activeTab === "details" ? (
            <div className="space-y-5">
              {/* 1. Invitees Section matching screenshot */}
              <div className="space-y-3.5 pb-5 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900">Invitees</h3>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="text-neutral-500 hover:text-neutral-800 p-1 rounded-md transition-colors"
                    title="Copy invitee email"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>

                {/* Invitee Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center select-none shadow-2xs">
                    {attendeeInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate">
                      {booking.attendeeName}
                    </p>
                  </div>
                </div>

                {/* Contact Rows */}
                <div className="space-y-2 pt-1 text-xs text-neutral-800">
                  {/* Email row with edit icon */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-neutral-600 shrink-0" />
                    <span className="truncate font-medium">{booking.attendeeEmail}</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-neutral-500 hover:text-blue-600 transition-colors p-0.5"
                      title="Edit / Copy email"
                    >
                      <Pencil className="h-3 w-3 text-neutral-600" />
                    </button>
                  </div>

                  {/* Phone row */}
                  {booking.attendeePhoneNumber && (
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="flex items-center gap-2.5 min-w-0 text-left hover:text-blue-600 transition-colors cursor-pointer"
                      title="Click to copy phone number"
                    >
                      <Smartphone className="h-4 w-4 text-neutral-600 shrink-0" />
                      <span className="font-medium">{booking.attendeePhoneNumber}</span>
                    </button>
                  )}

                  {/* Timezone row */}
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-neutral-600 shrink-0" />
                    <span className="font-medium">{booking.attendeeTimeZone}</span>
                  </div>
                </div>

                {/* Invitee Footer Actions: Email, View Profile, Menu */}
                <div className="flex items-center justify-between pt-2 text-xs font-semibold">
                  <div className="flex items-center gap-4">
                    <a
                      href={`mailto:${booking.attendeeEmail}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Email</span>
                    </a>

                    <Link
                      href={`/public/bookings/${booking.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>View full profile</span>
                    </Link>
                  </div>

                  {/* 3-Dots Dropdown */}
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 mt-1 w-44 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg z-50 text-xs font-normal">
                        <button
                          type="button"
                          onClick={handleCopyPublicLink}
                          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-50 text-left font-medium cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Copy public link</span>
                        </button>
                        <a
                          href={`/api/v1/public/bookings/${booking.id}/ics`}
                          download
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-50 text-left font-medium"
                        >
                          <Download className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Download .ics</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Location Section matching screenshot */}
              <div className="space-y-3 pb-5 border-b border-neutral-200">
                <h3 className="text-sm font-bold text-neutral-900">Location</h3>
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Icon + Label with Chevron */}
                  <div className="flex items-center gap-2.5">
                    {isVideoLocation ? (
                      <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Video className="h-3.5 w-3.5 fill-current" />
                      </div>
                    ) : booking.location?.type === "IN_PERSON" ? (
                      <div className="h-7 w-7 rounded-full bg-neutral-800 text-white flex items-center justify-center shrink-0">
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-neutral-800 text-white flex items-center justify-center shrink-0">
                        <PhoneCall className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs font-semibold text-neutral-900">
                      <span>{locationLabel}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
                    </div>
                  </div>

                  {/* Right: Join meeting button */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full border border-neutral-800 text-neutral-900 hover:bg-neutral-50 px-4 py-1.5 text-xs font-semibold shadow-2xs"
                  >
                    <a href={joinUrl} target="_blank" rel="noopener noreferrer">
                      Join meeting
                    </a>
                  </Button>
                </div>
              </div>

              {/* 3. Hosts Section matching screenshot */}
              <div className="space-y-2.5 pb-5 border-b border-neutral-200">
                <h3 className="text-sm font-bold text-neutral-900">Hosts</h3>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center select-none">
                    {hostInitial}
                  </div>
                  <p className="text-xs font-semibold text-neutral-900">
                    <span className="text-blue-600 font-bold">{booking.host.name}</span>{" "}
                    <span className="text-neutral-500 font-normal">(you)</span>
                  </p>
                </div>
              </div>

              {/* 4. Timeline Section matching screenshot */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-900">Timeline</h3>
                <div className="space-y-0 text-xs">
                  {/* Step 1: Event booked by */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex flex-col items-center">
                      <Calendar className="h-4 w-4 text-neutral-600 shrink-0" />
                      <div className="w-[1.5px] bg-neutral-200 h-6 my-1" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">
                        Event booked by {booking.attendeeName.split(" ")[0]}
                      </p>
                      <p className="text-neutral-500 text-[11px]">
                        {bookedDateFormatted} at {bookedTimeFormatted} ({tzShort})
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Event starts */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <Clock className="h-4 w-4 text-neutral-600 shrink-0" />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900">Event starts</p>
                      <p className="text-neutral-500 text-[11px]">
                        {startsDateFormatted} at {startsTimeFormatted} ({tzShort})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer link note matching screenshot */}
                <p className="pt-3 text-xs text-neutral-600 font-normal">
                  Based on the{" "}
                  <Link
                    href={`/public/${booking.host.username}/${booking.eventType.slug}`}
                    target="_blank"
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>{booking.eventType.title}</span>
                    <ExternalLink className="h-3 w-3 inline ml-0.5" />
                  </Link>{" "}
                  event type.
                </p>
              </div>
            </div>
          ) : (
            /* Notes Tab Content */
            <div className="space-y-5 text-xs">
              {/* Attendee Notes / Agenda */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-neutral-900">Meeting Notes / Agenda</h3>
                {booking.attendeeNotes ? (
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-800 whitespace-pre-wrap leading-relaxed font-normal">
                    {booking.attendeeNotes}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic">No notes provided by attendee.</p>
                )}
              </div>

              {/* Custom Form Answers */}
              {booking.customResponses && booking.customResponses.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-neutral-200">
                  <h3 className="text-sm font-bold text-neutral-900">Custom Form Answers</h3>
                  <div className="space-y-2">
                    {booking.customResponses.map((r) => (
                      <div
                        key={r.questionId}
                        className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-1"
                      >
                        <p className="font-medium text-neutral-500">{r.label}</p>
                        <p className="font-semibold text-neutral-900 text-xs">
                          {r.type === "CHECKBOX"
                            ? r.value
                              ? "✓ Yes"
                              : "No"
                            : r.type === "SELECT"
                            ? r.selectedOptionLabel || String(r.value)
                            : String(r.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

