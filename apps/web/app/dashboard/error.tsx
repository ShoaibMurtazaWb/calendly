"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client/render error in dev environment
    console.error("Dashboard error caught by boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center shadow-2xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] mb-4">
          <AlertCircle className="h-6 w-6 text-rose-500" />
        </div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h2>
        <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
          We couldn&apos;t load this page. Please try again.
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            size="sm"
            onClick={() => reset()}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
