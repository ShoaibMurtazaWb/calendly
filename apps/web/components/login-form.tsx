"use client";

import { loginBodySchema } from "@sched/api-contract";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-error";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    const parsed = loginBodySchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setPending(true);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify(parsed.data) });
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not log in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto mt-16 w-full max-w-md">
      <CardTitle>Log in</CardTitle>
      <CardDescription className="mt-1">Use the email and password from registration.</CardDescription>
      <form className="mt-6 grid gap-4" action={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-neutral-600">
        Need an account? <Link className="underline" href="/register">Register</Link>
      </p>
    </Card>
  );
}
