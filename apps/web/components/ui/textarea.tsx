import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-2xs placeholder:text-[var(--text-muted)] transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--border-focus)] aria-invalid:border-[var(--status-danger-border)] aria-invalid:focus-visible:ring-[var(--status-danger-text)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
