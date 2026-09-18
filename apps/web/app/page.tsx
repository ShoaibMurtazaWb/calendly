import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium text-neutral-500">Sched v0.1.0</p>
        <h1 className="mt-1 text-3xl font-semibold">Share a page. Book later.</h1>
        <p className="mt-3 text-neutral-600">
          Create event types and a public profile. Availability and bookings ship in a later version.
        </p>
      </div>
      <div className="flex gap-3">
        <Link className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white" href="/register">
          Create account
        </Link>
        <Link className="rounded-md border border-neutral-300 px-4 py-2 text-sm" href="/login">
          Log in
        </Link>
      </div>
    </main>
  );
}
