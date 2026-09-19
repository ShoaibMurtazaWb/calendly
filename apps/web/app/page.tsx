"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Clock,
  Globe,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
} from "lucide-react";

const DEMO_EVENTS = [
  {
    id: "1",
    title: "30 Min Discovery Call",
    duration: 30,
    slug: "discovery",
    description: "Quick introductory sync to discuss roadmap, architecture, or partnerships.",
    color: "bg-emerald-500",
  },
  {
    id: "2",
    title: "45 Min Technical Deep Dive",
    duration: 45,
    slug: "tech-deep-dive",
    description: "In-depth code review, system design session, and pair programming walkthrough.",
    color: "bg-blue-500",
  },
  {
    id: "3",
    title: "15 Min Coffee Chat",
    duration: 15,
    slug: "coffee-chat",
    description: "Casual catch-up for general networking, advice, and quick Q&A.",
    color: "bg-amber-500",
  },
];

const SAMPLE_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:30 AM",
  "11:00 AM",
  "01:30 PM",
  "02:00 PM",
  "03:30 PM",
  "04:00 PM",
];

const FEATURES = [
  {
    icon: <Zap className="h-5 w-5 text-neutral-900" />,
    title: "Sub-Second Slot Projection",
    description:
      "Deterministic availability generation engine that computes valid time slots instantly with zero calendar overlaps.",
    tag: "High Performance",
  },
  {
    icon: <Globe className="h-5 w-5 text-neutral-900" />,
    title: "Universal IANA Timezones",
    description:
      "Full bi-directional timezone conversion between hosts and invitees with automatic daylight saving drift protection.",
    tag: "Global Ready",
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-neutral-900" />,
    title: "Double-Booking Prevention",
    description:
      "Database-level concurrency locking ensuring two invitees never book the same slot simultaneously under high concurrency.",
    tag: "Zero Conflicts",
  },
  {
    icon: <Calendar className="h-5 w-5 text-neutral-900" />,
    title: "Clean Custom Booking Links",
    description:
      "Memorable, fast personalized URLs like /public/username/slug that give your clients a frictionless booking experience.",
    tag: "Brand First",
  },
  {
    icon: <Clock className="h-5 w-5 text-neutral-900" />,
    title: "Granular Schedule Overrides",
    description:
      "Configure custom weekly recurring hours, minimum booking notices, buffer times, and date-specific blackout dates.",
    tag: "Total Control",
  },
  {
    icon: <Layers className="h-5 w-5 text-neutral-900" />,
    title: "Modern Full-Stack SaaS",
    description:
      "Engineered with Next.js 15, Turborepo, NestJS, and PostgreSQL with sub-50ms latency worldwide.",
    tag: "Enterprise Grade",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Set your Availability",
    description: "Define your working hours, recurring schedules, and buffer times between meetings.",
  },
  {
    step: "02",
    title: "Create Event Types",
    description: "Configure 15, 30, or 60-minute meeting cards with custom descriptions and slug URLs.",
  },
  {
    step: "03",
    title: "Share your Sched Link",
    description: "Send your custom booking link to clients or teammates for instant 1-click booking.",
  },
];

export default function HomePage() {
  const [selectedEvent, setSelectedEvent] = useState<(typeof DEMO_EVENTS)[number]>(DEMO_EVENTS[0]!);
  const [selectedSlot, setSelectedSlot] = useState<string | null>("10:30 AM");
  const [bookedState, setBookedState] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBookSlot = (slot: string) => {
    setSelectedSlot(slot);
    setBookedState(true);
    setTimeout(() => {
      setBookedState(false);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="border-b border-neutral-200/80 bg-white px-4 py-2 text-center text-xs font-medium text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-neutral-900" />
          High-precision scheduling infrastructure for modern teams & hosts
        </span>
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white font-semibold text-sm shadow-sm">
              S
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-neutral-900">Sched</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex text-sm font-medium text-neutral-600">
            <a href="#features" className="transition hover:text-neutral-900">
              Features
            </a>
            <a href="#interactive-demo" className="transition hover:text-neutral-900">
              Live Preview
            </a>
            <a href="#how-it-works" className="transition hover:text-neutral-900">
              How it Works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md border border-neutral-300 bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98]"
            >
              <span>Get started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Autonomous Scheduling · Frictionless Booking</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl sm:leading-[1.15]">
            Share your page. <br className="hidden sm:inline" />
            <span className="text-neutral-900">Book effortlessly.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base text-neutral-600 sm:text-lg leading-relaxed">
            Create custom event types and personal booking links with high-precision scheduling infrastructure.
            Synchronize real-time availability across multiple timezones and eliminate back-and-forth emails.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98]"
            >
              <span>Create account free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#interactive-demo"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50 active:scale-[0.98]"
            >
              View live demo
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Instant slot projection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Automatic IANA timezone sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Live Demo Preview */}
      <section id="interactive-demo" className="py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Interactive Preview</p>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Test the booking experience
              </h2>
            </div>
            <p className="text-xs text-neutral-500">Select an event type and try picking an available slot.</p>
          </div>

          {/* Browser Window Frame */}
          <div className="rounded-xl border border-neutral-200/80 bg-white shadow-sm overflow-hidden">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-neutral-200/80 bg-neutral-50/80 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                </div>
                <span className="ml-2 font-mono text-neutral-500 text-[11px]">
                  https://sched.com/public/shoaib/{selectedEvent.slug}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                <span>Host local: {currentTime || "10:00 AM"}</span>
              </div>
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-200/80">
              {/* Left Column: Host Details */}
              <div className="p-6 md:col-span-5 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
                      SM
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-neutral-900 text-sm">Shoaib Murtaza</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <p className="text-xs text-neutral-500">@shoaib · Product & Engineering</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Available Event Types</p>
                    <div className="mt-2.5 space-y-2">
                      {DEMO_EVENTS.map((event) => {
                        const isSelected = selectedEvent.id === event.id;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className={`w-full text-left rounded-lg p-3 transition border ${
                              isSelected
                                ? "border-neutral-900 bg-neutral-50 text-neutral-900 shadow-xs"
                                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-neutral-900">{event.title}</span>
                              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                                {event.duration} min
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-neutral-500 line-clamp-1">{event.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                  <div className="flex items-center gap-2 font-medium text-neutral-800">
                    <Globe className="h-4 w-4 text-neutral-500" />
                    <span>Google Meet / Zoom</span>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Meeting URL and invite will be shared upon slot confirmation.
                  </p>
                </div>
              </div>

              {/* Right Column: Time Slot Selection */}
              <div className="p-6 md:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">Select a Time Slot</h3>
                      <p className="text-xs text-neutral-500">Today · Asia/Karachi (GMT+5)</p>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">
                      {SAMPLE_SLOTS.length} slots available
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {SAMPLE_SLOTS.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => handleBookSlot(slot)}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs font-medium transition ${
                            isSelected
                              ? "border-neutral-900 bg-neutral-900 text-white shadow-xs"
                              : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                          }`}
                        >
                          <span>{slot}</span>
                          <span className={isSelected ? "text-neutral-200" : "text-neutral-400"}>
                            {isSelected ? "Selected ✓" : "Book →"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Instant Feedback Notice */}
                {bookedState ? (
                  <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-center text-xs font-medium text-emerald-800">
                    ✓ Simulated Booking Confirmed for <span className="font-semibold">{selectedEvent.title}</span> at{" "}
                    <span className="font-semibold">{selectedSlot}</span>
                  </div>
                ) : (
                  <div className="mt-6 flex items-center justify-between text-xs text-neutral-500">
                    <span>Instant calendar synchronization</span>
                    <Link href="/register" className="font-medium text-neutral-900 hover:underline">
                      Create your own link →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-16 border-t border-neutral-200/80 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">High Reliability</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Engineered for seamless calendar operations
            </h2>
            <p className="mt-2 text-sm text-neutral-600 max-w-xl mx-auto">
              Everything required to manage host availability, prevent scheduling collisions, and project real-time slots.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-5 transition hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white shadow-xs">
                    {feature.icon}
                  </div>
                  <span className="rounded bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                    {feature.tag}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">{feature.title}</h3>
                <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 border-t border-neutral-200/80 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Fast Setup</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Get started in three simple steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s, idx) => (
              <div key={idx} className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs">
                <span className="font-mono text-2xl font-bold text-neutral-300">{s.step}</span>
                <h3 className="mt-3 text-base font-semibold text-neutral-900">{s.title}</h3>
                <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-14 border-t border-neutral-200/80 bg-white">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-900 p-8 sm:p-10 text-center text-white shadow-sm">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to streamline your scheduling?</h2>
            <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm text-neutral-400">
              Create your custom booking page, manage availability, and let attendees book slots directly.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-100 active:scale-[0.98]"
              >
                Create your page free
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-800 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 active:scale-[0.98]"
              >
                Sign in to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 bg-neutral-50 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 sm:flex-row text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-900 text-white font-bold text-[10px]">
              S
            </div>
            <span className="font-semibold text-neutral-800">Sched</span>
            <span>— Autonomous Scheduling Platform</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All systems operational
            </span>
            <span>Next.js 15 & NestJS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
