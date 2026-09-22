import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] shadow-2xs placeholder:text-[var(--text-muted)] transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--border-focus)] aria-invalid:border-[var(--status-danger-border)] aria-invalid:focus-visible:ring-[var(--status-danger-text)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
