import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-semibold tracking-tight text-slate-950">Sched</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">Share a page. Book effortlessly.</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Create custom event types and personal booking links with high-precision scheduling infrastructure.
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
