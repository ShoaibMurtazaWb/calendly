"use client";

import { registerBodySchema } from "@sched/api-contract";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Globe, Lock, Mail, User, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { ApiError, fieldErrors } from "@/lib/api-error";

const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Dublin",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Rome",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

export function RegisterForm() {
  const [timezones, setTimezones] = useState<string[]>(FALLBACK_TIMEZONES);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  // Auto-detect user's local timezone on mount
  useEffect(() => {
    try {
      if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
        const supported = Intl.supportedValuesOf("timeZone");
        if (supported.length > 0) {
          setTimezones(supported);
        }
      }
      const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userZone) {
        setTimezone(userZone);
      }
    } catch {
      // fallback
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setFields({});

    const parsed = registerBodySchema.safeParse({
      name,
      username,
      email,
      password,
      timezone,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFields(next);
      return;
    }

    setPending(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      window.location.href = "/dashboard";
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(fieldErrors(caught));
      } else {
        setError("Could not create the account. Please check your details.");
      }
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 p-4 sm:p-6 py-12">
      <Card className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white font-bold text-base shadow-xs">
            <span className="font-mono">S</span>
          </div>
          <div>
            <h1 className="font-semibold tracking-tight text-slate-950 text-base leading-tight">Sched</h1>
            <p className="text-[11px] text-slate-500 font-mono">Infrastructure for High-Precision Booking</p>
          </div>
        </div>

        <div className="pb-4 border-b border-slate-100">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-950">
            Create your host account
          </CardTitle>
          <CardDescription className="mt-1 text-xs text-slate-500">
            Get started with your custom booking profile and scheduling infrastructure.
          </CardDescription>
        </div>

        <form className="mt-6 space-y-4" method="post" action="#" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
              Full name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Shoaib Murtaza"
                required
                className="h-10 pl-9 rounded-xl text-sm border-slate-200 shadow-2xs focus-visible:ring-slate-900"
              />
            </div>
            {fields.name && <p className="text-xs text-red-600 font-medium">{fields.name}</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
              Username & Profile handle
            </Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="shoaib"
                required
                className="h-10 pl-9 rounded-xl text-sm font-mono border-slate-200 shadow-2xs focus-visible:ring-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Your public link: <span className="font-mono text-slate-600">sched.com/public/@{username || "username"}</span>
            </p>
            {fields.username && <p className="text-xs text-red-600 font-medium">{fields.username}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-10 pl-9 rounded-xl text-sm border-slate-200 shadow-2xs focus-visible:ring-slate-900"
              />
            </div>
            {fields.email && <p className="text-xs text-red-600 font-medium">{fields.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className="h-10 pl-9 rounded-xl text-sm border-slate-200 shadow-2xs focus-visible:ring-slate-900"
              />
            </div>
            {fields.password && <p className="text-xs text-red-600 font-medium">{fields.password}</p>}
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="text-xs font-semibold text-slate-700">
              Host Primary Timezone
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                id="timezone"
                name="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-10 w-full pl-9 pr-4 rounded-xl text-xs border border-slate-200 bg-white shadow-2xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                {timezones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
            {fields.timezone && <p className="text-xs text-red-600 font-medium">{fields.timezone}</p>}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={pending}
            className="w-full h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {pending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Creating account…</span>
              </div>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link className="font-semibold text-slate-900 hover:underline" href="/login">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
