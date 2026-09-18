"use client";

import { registerBodySchema } from "@sched/api-contract";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { ApiError, fieldErrors } from "@/lib/api-error";

export function RegisterForm() {
  const router = useRouter();
  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setFields({});
    const parsed = registerBodySchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      name: formData.get("name"),
      username: formData.get("username"),
      timezone: formData.get("timezone"),
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
      await api("/auth/register", { method: "POST", body: JSON.stringify(parsed.data) });
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(fieldErrors(caught));
      } else {
        setError("Could not create the account.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto mt-16 w-full max-w-md">
      <CardTitle>Create your account</CardTitle>
      <CardDescription className="mt-1">Usernames cannot be changed later.</CardDescription>
      <form className="mt-6 grid gap-4" action={onSubmit}>
        <Field label="Name" name="name" error={fields.name} />
        <Field label="Username" name="username" error={fields.username} />
        <Field label="Email" name="email" type="email" error={fields.email} />
        <Field label="Password" name="password" type="password" error={fields.password} />
        <div className="grid gap-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            name="timezone"
            defaultValue="Asia/Karachi"
            className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm"
          >
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          {fields.timezone ? <p className="text-sm text-red-600">{fields.timezone}</p> : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-neutral-600">
        Already have an account? <Link className="underline" href="/login">Log in</Link>
      </p>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
