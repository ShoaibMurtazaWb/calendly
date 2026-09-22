"use client";

import { loginBodySchema } from "@sched/api-contract";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";
import { ApiError, fieldErrors } from "@/lib/api-error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) setEmail(emailParam);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setFields({});

    const parsed = loginBodySchema.safeParse({ email, password });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(flattened)) {
        if (v && v[0]) mapped[k] = v[0];
      }
      setFields(mapped);
      return;
    }

    setPending(true);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      window.location.href = "/dashboard";
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.body.error.code === "INVALID_CREDENTIALS" ||
          err.body.error.code === "UNAUTHENTICATED"
        ) {
          setError(err.body.error.message || "Invalid email or password.");
        } else {
          setError(err.message);
        }
        setFields(fieldErrors(err));
      } else {
        setError("Could not log in. Please check your credentials.");
      }
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 p-4 sm:p-6">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <Logo className="h-9 w-9 shrink-0 shadow-xs" />
          <div>
            <h1 className="font-semibold tracking-tight text-slate-950 text-base leading-tight">Sched</h1>
            <p className="text-[11px] text-slate-500 font-mono">Infrastructure for High-Precision Booking</p>
          </div>
        </div>

        <div className="pb-4 border-b border-slate-100">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-950">
            Welcome back
          </CardTitle>
          <CardDescription className="mt-1 text-xs text-slate-500">
            Sign in to manage your scheduling links and events.
          </CardDescription>
        </div>

        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          {/* Email Field */}
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

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-10 pl-9 rounded-xl text-sm border-slate-200 shadow-2xs focus-visible:ring-slate-900"
              />
            </div>
            {fields.password && <p className="text-xs text-red-600 font-medium">{fields.password}</p>}
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
            className="w-full h-10 rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {pending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Signing in…</span>
              </div>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-slate-900 hover:underline" href="/register">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
