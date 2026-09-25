"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  X,
  MapPin,
  Video,
  PhoneCall,
  Link2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { api, type CurrentUser, type EventType } from "@/lib/api";
import { ApiError, fieldErrors } from "@/lib/api-error";
import type { LocationType, CustomQuestion } from "@sched/api-contract";

const DURATION_PRESETS = [15, 30, 45, 60];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface EventTypeDrawerProps {
  isOpen: boolean;
  eventTypeId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EventTypeDrawer({
  isOpen,
  eventTypeId,
  onClose,
  onSaved,
}: EventTypeDrawerProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Accordion Section States
  const [openSections, setOpenSections] = useState({
    details: true,
    duration: true,
    location: true,
    availability: true,
    questions: false,
  });

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isSlugTouched, setIsSlugTouched] = useState(false);

  // Location Fields
  const [locationType, setLocationType] = useState<LocationType>("STATIC_VIDEO");
  const [inPersonAddress, setInPersonAddress] = useState("");
  const [displayPublicAddress, setDisplayPublicAddress] = useState(false);
  const [inPersonNotes, setInPersonNotes] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoNotes, setVideoNotes] = useState("");
  const [customLinkUrl, setCustomLinkUrl] = useState("");
  const [customLinkNotes, setCustomLinkNotes] = useState("");
  const [hostCallsAttendeeNotes, setHostCallsAttendeeNotes] = useState("");
  const [attendeeCallsHostPhone, setAttendeeCallsHostPhone] = useState("");
  const [attendeeCallsHostNotes, setAttendeeCallsHostNotes] = useState("");

  // Custom Questions
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Load user
  useEffect(() => {
    api<CurrentUser>("/auth/me").then(setUser).catch(() => {});
  }, []);

  // Reset or load event data when drawer opens or eventTypeId changes
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setErrors({});

    if (!eventTypeId) {
      // New Event Type Defaults
      setTitle("New Meeting");
      setSlug("new-meeting");
      setDuration(30);
      setCustomDuration("");
      setDescription("");
      setIsSlugTouched(false);
      setLocationType("STATIC_VIDEO");
      setInPersonAddress("");
      setDisplayPublicAddress(false);
      setInPersonNotes("");
      setVideoUrl("");
      setVideoNotes("");
      setCustomLinkUrl("");
      setCustomLinkNotes("");
      setHostCallsAttendeeNotes("");
      setAttendeeCallsHostPhone("");
      setAttendeeCallsHostNotes("");
      setCustomQuestions([]);
      setIsLoading(false);
      return;
    }

    // Load Existing Event Type
    setIsLoading(true);
    api<EventType>(`/event-types/${eventTypeId}`)
      .then((data) => {
        setTitle(data.title);
        setSlug(data.slug);
        setDuration(data.durationMinutes);
        if (!DURATION_PRESETS.includes(data.durationMinutes)) {
          setCustomDuration(String(data.durationMinutes));
        } else {
          setCustomDuration("");
        }
        setDescription(data.description || "");
        setIsSlugTouched(true);

        if (data.customQuestions && Array.isArray(data.customQuestions)) {
          setCustomQuestions(data.customQuestions);
        } else {
          setCustomQuestions([]);
        }

        if (data.location) {
          setLocationType(data.location.type as LocationType);
          const locData = (data.location.data || {}) as Record<string, unknown>;
          if (data.location.type === "IN_PERSON") {
            setInPersonAddress(String(locData.address || ""));
            setDisplayPublicAddress(Boolean(locData.displayPublicAddress));
            setInPersonNotes(String(locData.extraNotes || ""));
          } else if (data.location.type === "STATIC_VIDEO") {
            setVideoUrl(String(locData.url || ""));
            setVideoNotes(String(locData.extraNotes || ""));
          } else if (data.location.type === "CUSTOM_LINK") {
            setCustomLinkUrl(String(locData.url || ""));
            setCustomLinkNotes(String(locData.extraNotes || ""));
          } else if (data.location.type === "HOST_CALLS_ATTENDEE") {
            setHostCallsAttendeeNotes(String(locData.extraNotes || ""));
          } else if (data.location.type === "ATTENDEE_CALLS_HOST") {
            setAttendeeCallsHostPhone(String(locData.hostPhoneNumber || ""));
            setAttendeeCallsHostNotes(String(locData.extraNotes || ""));
          }
        }
      })
      .catch(() => {
        setError("Could not load event type details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, eventTypeId]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!isSlugTouched && !eventTypeId) {
      setSlug(generateSlug(val));
    }
  }

  function handleAddQuestion(type: "TEXT" | "TEXTAREA" | "SELECT" | "CHECKBOX") {
    const id = crypto.randomUUID();
    if (type === "SELECT") {
      setCustomQuestions((prev) => [
        ...prev,
        {
          id,
          type: "SELECT",
          label: "",
          required: false,
          options: [
            { id: crypto.randomUUID(), label: "Option 1" },
            { id: crypto.randomUUID(), label: "Option 2" },
          ],
        },
      ]);
    } else if (type === "CHECKBOX") {
      setCustomQuestions((prev) => [
        ...prev,
        {
          id,
          type: "CHECKBOX",
          label: "I agree to the requirements",
          required: false,
        },
      ]);
    } else {
      setCustomQuestions((prev) => [
        ...prev,
        {
          id,
          type,
          label: "",
          required: false,
          placeholder: "",
        },
      ]);
    }
  }

  function handleRemoveQuestion(index: number) {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateQuestion(index: number, updates: Partial<CustomQuestion>) {
    setCustomQuestions((prev) =>
      prev.map((q, i) => (i === index ? ({ ...q, ...updates } as CustomQuestion) : q))
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setErrors({});

    // Construct Location Payload
    let locationData: Record<string, unknown> = {};
    if (locationType === "IN_PERSON") {
      locationData = {
        address: inPersonAddress,
        displayPublicAddress,
        extraNotes: inPersonNotes,
      };
    } else if (locationType === "STATIC_VIDEO") {
      locationData = {
        url: videoUrl,
        extraNotes: videoNotes,
      };
    } else if (locationType === "CUSTOM_LINK") {
      locationData = {
        url: customLinkUrl,
        extraNotes: customLinkNotes,
      };
    } else if (locationType === "HOST_CALLS_ATTENDEE") {
      locationData = {
        extraNotes: hostCallsAttendeeNotes,
      };
    } else if (locationType === "ATTENDEE_CALLS_HOST") {
      locationData = {
        hostPhoneNumber: attendeeCallsHostPhone,
        extraNotes: attendeeCallsHostNotes,
      };
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      durationMinutes: Number(duration),
      description: description.trim(),
      location: {
        type: locationType,
        data: locationData,
      },
      customQuestions,
    };

    try {
      if (eventTypeId) {
        await api(`/event-types/${eventTypeId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Event type updated", "Changes saved successfully.");
      } else {
        await api("/event-types", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Event type created", "Your new booking link is live.");
      }
      onSaved();
      onClose();
    } catch (caught: unknown) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setErrors(fieldErrors(caught));
      } else {
        setError("Failed to save event type. Please check all fields.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  const publicPreviewUrl =
    user && slug ? `/public/${user.username}/${slug}` : null;

  return (
    <aside className="w-full md:w-[420px] lg:w-[460px] shrink-0 border-l border-neutral-200 bg-white shadow-xl flex flex-col h-full min-h-screen z-40 transition-all duration-300 animate-in slide-in-from-right-8">
      {/* Drawer Top Header (Calendly Style) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Event type
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-full text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Title Identity Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="h-3.5 w-3.5 rounded-full bg-purple-600 shrink-0" />
            <h2 className="text-xl font-bold tracking-tight text-black truncate">
              {title || "New Meeting"}
            </h2>
          </div>
          <p className="text-xs text-neutral-500 font-medium pl-6">One-on-One</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4 py-8 text-center text-xs text-neutral-500">
            <Spinner size="default" />
            <p>Loading event details…</p>
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-neutral-200">
            {/* 1. Event Details Section */}
            <div className="pt-3 first:pt-0">
              <button
                type="button"
                onClick={() => toggleSection("details")}
                className="flex w-full items-center justify-between py-2 text-sm font-bold text-black hover:text-blue-600 transition-colors cursor-pointer"
              >
                <span>Event details</span>
                {openSections.details ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </button>

              {openSections.details && (
                <div className="mt-3 space-y-4 pb-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="drawer-title" className="text-xs font-semibold text-neutral-800">
                      Event name *
                    </Label>
                    <Input
                      id="drawer-title"
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. 30 Minute Meeting"
                      className="h-10 text-xs rounded-xl border-neutral-300 focus:border-blue-600"
                    />
                    {errors.title && <p className="text-[11px] text-rose-600">{errors.title}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="drawer-slug" className="text-xs font-semibold text-neutral-800">
                      Event URL slug *
                    </Label>
                    <div className="flex items-center rounded-xl border border-neutral-300 bg-neutral-50 px-3 focus-within:border-blue-600 focus-within:bg-white transition-colors">
                      <span className="text-[11px] font-mono text-neutral-500 select-none truncate">
                        /public/{user?.username || "user"}/
                      </span>
                      <input
                        id="drawer-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          setIsSlugTouched(true);
                          setSlug(e.target.value);
                        }}
                        placeholder="slug"
                        className="h-9 w-full bg-transparent text-xs font-mono text-black outline-none"
                      />
                    </div>
                    {errors.slug && <p className="text-[11px] text-rose-600">{errors.slug}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="drawer-desc" className="text-xs font-semibold text-neutral-800">
                      Description / Instructions
                    </Label>
                    <Textarea
                      id="drawer-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write a summary and details for invitees…"
                      rows={3}
                      className="text-xs rounded-xl border-neutral-300 focus:border-blue-600 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Duration Section */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleSection("duration")}
                className="flex w-full items-center justify-between py-2 text-sm font-bold text-black hover:text-blue-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Duration</span>
                  <span className="text-xs font-normal text-neutral-500">({duration} min)</span>
                </div>
                {openSections.duration ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </button>

              {openSections.duration && (
                <div className="mt-3 space-y-3 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setDuration(mins);
                          setCustomDuration("");
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          duration === mins && !customDuration
                            ? "bg-neutral-900 text-white shadow-2xs"
                            : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-neutral-600">Custom:</span>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      value={customDuration}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomDuration(val);
                        if (val && !isNaN(Number(val))) {
                          setDuration(Number(val));
                        }
                      }}
                      placeholder="e.g. 90"
                      className="h-8 w-24 text-xs rounded-lg border-neutral-300"
                    />
                    <span className="text-xs text-neutral-500">minutes</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Location Section */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleSection("location")}
                className="flex w-full items-center justify-between py-2 text-sm font-bold text-black hover:text-blue-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Location</span>
                  <span className="text-xs font-normal text-neutral-500">
                    {locationType === "STATIC_VIDEO"
                      ? "Video call"
                      : locationType === "HOST_CALLS_ATTENDEE" || locationType === "ATTENDEE_CALLS_HOST"
                      ? "Phone call"
                      : locationType === "IN_PERSON"
                      ? "In-person"
                      : "Custom link"}
                  </span>
                </div>
                {openSections.location ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </button>

              {openSections.location && (
                <div className="mt-3 space-y-3 pb-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLocationType("STATIC_VIDEO")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        locationType === "STATIC_VIDEO"
                          ? "border-blue-600 bg-blue-50/50 text-blue-700"
                          : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      <Video className="h-4 w-4 shrink-0 text-blue-600" />
                      <span>Video call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocationType("HOST_CALLS_ATTENDEE")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        locationType === "HOST_CALLS_ATTENDEE" || locationType === "ATTENDEE_CALLS_HOST"
                          ? "border-blue-600 bg-blue-50/50 text-blue-700"
                          : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      <PhoneCall className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>Phone call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocationType("IN_PERSON")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        locationType === "IN_PERSON"
                          ? "border-blue-600 bg-blue-50/50 text-blue-700"
                          : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>In-person</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocationType("CUSTOM_LINK")}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        locationType === "CUSTOM_LINK"
                          ? "border-blue-600 bg-blue-50/50 text-blue-700"
                          : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                      }`}
                    >
                      <Link2 className="h-4 w-4 shrink-0 text-purple-600" />
                      <span>Custom link</span>
                    </button>
                  </div>

                  {/* Contextual Location Inputs */}
                  {locationType === "STATIC_VIDEO" && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="drawer-video-url" className="text-xs font-semibold text-neutral-800">
                        Meeting link (Google Meet / Zoom URL)
                      </Label>
                      <Input
                        id="drawer-video-url"
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="h-9 text-xs rounded-xl border-neutral-300"
                      />
                    </div>
                  )}

                  {locationType === "IN_PERSON" && (
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="drawer-address" className="text-xs font-semibold text-neutral-800">
                        Physical address
                      </Label>
                      <Input
                        id="drawer-address"
                        type="text"
                        value={inPersonAddress}
                        onChange={(e) => setInPersonAddress(e.target.value)}
                        placeholder="e.g. 123 Main St, Suite 400"
                        className="h-9 text-xs rounded-xl border-neutral-300"
                      />
                    </div>
                  )}

                  {locationType === "CUSTOM_LINK" && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="drawer-custom-url" className="text-xs font-semibold text-neutral-800">
                        Custom URL
                      </Label>
                      <Input
                        id="drawer-custom-url"
                        type="url"
                        value={customLinkUrl}
                        onChange={(e) => setCustomLinkUrl(e.target.value)}
                        placeholder="https://example.com/join"
                        className="h-9 text-xs rounded-xl border-neutral-300"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Availability & Schedule Section (Calendly Style Preview) */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleSection("availability")}
                className="flex w-full items-center justify-between py-2 text-sm font-bold text-black hover:text-blue-600 transition-colors cursor-pointer"
              >
                <span>Availability & Schedule</span>
                {openSections.availability ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </button>

              {openSections.availability && (
                <div className="mt-3 space-y-3 pb-2 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-black">Date-range</p>
                    <p className="text-neutral-600">
                      Invitees can schedule <span className="font-bold text-black">60 days</span> into the future with at least <span className="font-bold text-black">4 hours</span> notice.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-black">Schedule: Working hours (Default)</p>
                      <Link
                        href="/dashboard/availability"
                        className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Edit schedule</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Weekly Schedule Preview Card (Matching Screenshot) */}
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
                      <p className="text-[11px] text-neutral-600 leading-relaxed">
                        This event type uses the weekly and custom hours saved on your schedule.
                      </p>

                      <div className="border-t border-neutral-200 pt-3 space-y-2 font-medium">
                        <div className="flex items-center justify-between text-neutral-700">
                          <span className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white text-[10px] font-bold">
                              M
                            </span>
                            <span>Monday – Friday</span>
                          </span>
                          <span className="font-mono text-[11px] text-black font-semibold">
                            9:00am – 5:00pm
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-neutral-500">
                          <span className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-bold">
                              S
                            </span>
                            <span>Saturday – Sunday</span>
                          </span>
                          <span className="text-[11px] text-neutral-400">Unavailable</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Custom Booking Questions Section */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => toggleSection("questions")}
                className="flex w-full items-center justify-between py-2 text-sm font-bold text-black hover:text-blue-600 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span>Booking questions</span>
                  <span className="text-xs font-normal text-neutral-500">
                    ({customQuestions.length})
                  </span>
                </div>
                {openSections.questions ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </button>

              {openSections.questions && (
                <div className="mt-3 space-y-3 pb-2">
                  <p className="text-xs text-neutral-500">
                    Ask invitees additional questions when they book a meeting.
                  </p>

                  {customQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-neutral-600">
                          Question {idx + 1} ({q.type})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="text-neutral-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Input
                        type="text"
                        value={q.label}
                        onChange={(e) => handleUpdateQuestion(idx, { label: e.target.value })}
                        placeholder="Enter your question…"
                        className="h-8 text-xs rounded-lg border-neutral-300 bg-white"
                      />

                      <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) =>
                            handleUpdateQuestion(idx, { required: e.target.checked })
                          }
                          className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Required question</span>
                      </label>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddQuestion("TEXT")}
                      className="rounded-full border-neutral-300 text-xs gap-1 h-7"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Text</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddQuestion("TEXTAREA")}
                      className="rounded-full border-neutral-300 text-xs gap-1 h-7"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Paragraph</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddQuestion("CHECKBOX")}
                      className="rounded-full border-neutral-300 text-xs gap-1 h-7"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Checkbox</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Sticky Bottom Action Bar (Matching Screenshot) */}
      <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
        <div>
          {publicPreviewUrl ? (
            <Link
              href={publicPreviewUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-black transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-500" />
              <span>Preview</span>
            </Link>
          ) : (
            <span className="text-xs text-neutral-400">Preview</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-full border-neutral-300 text-xs font-semibold px-4"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={isSaving || !title.trim() || !slug.trim()}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 shadow-2xs gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                <span>Saving…</span>
              </>
            ) : (
              <span>{eventTypeId ? "Save changes" : "Create event"}</span>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
