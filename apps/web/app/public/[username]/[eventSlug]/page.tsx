import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { PublicEventType } from "@/lib/api";

export default async function PublicEventTypePage({
  params,
}: {
  params: Promise<{ username: string; eventSlug: string }>;
}) {
  const { username, eventSlug } = await params;
  const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";
  const response = await fetch(`${apiOrigin}/api/v1/public/${username}/${eventSlug}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <Card>
          <CardTitle>Event not found</CardTitle>
          <CardDescription className="mt-2">This page is unavailable or has been archived.</CardDescription>
        </Card>
      </main>
    );
  }

  const eventType = (await response.json()) as PublicEventType;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Card>
        <p className="text-sm text-neutral-500">{eventType.host.name}</p>
        <CardTitle className="mt-1">{eventType.title}</CardTitle>
        <CardDescription className="mt-3 whitespace-pre-wrap">{eventType.description || "No description."}</CardDescription>
        <p className="mt-4 text-sm font-medium">{eventType.durationMinutes} minutes</p>
        <p className="mt-6 text-sm text-neutral-500">Booking is not available in v0.1.0.</p>
      </Card>
    </main>
  );
}
