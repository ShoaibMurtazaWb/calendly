"use client";

import { loginBodySchema } from "@sched/api-contract";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-4 sm:p-6">
      <Card className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <Logo className="h-8 w-8 shrink-0 shadow-2xs" />
          <div>
            <span className="font-semibold tracking-tight text-[var(--text-primary)] text-base leading-tight">Sched</span>
            <p className="text-[11px] text-[var(--text-muted)] font-mono">Infrastructure for High-Precision Booking</p>
          </div>
        </div>

        <div className="pb-4 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Welcome back
          </CardTitle>
          <CardDescription className="mt-1 text-xs text-[var(--text-muted)]">
            Sign in to manage your scheduling links and events.
          </CardDescription>
        </div>

        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="pl-9"
                aria-invalid={Boolean(fields.email)}
              />
            </div>
            {fields.email && <p className="text-xs text-[var(--status-danger-text)] font-medium">{fields.email}</p>}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-9"
                aria-invalid={Boolean(fields.password)}
              />
            </div>
            {fields.password && <p className="text-xs text-[var(--status-danger-text)] font-medium">{fields.password}</p>}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] p-3 text-xs text-[var(--status-danger-text)] font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={pending}
            className="w-full mt-2 gap-2"
          >
            {pending ? (
              <>
                <Spinner size="sm" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-[var(--text-primary)] hover:underline" href="/register">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
