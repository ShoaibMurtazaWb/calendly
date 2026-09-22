import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] shadow-2xs placeholder:text-[var(--text-muted)] transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--border-focus)] aria-invalid:border-[var(--status-danger-border)] aria-invalid:focus-visible:ring-[var(--status-danger-text)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-9 py-1.5 text-sm",
        sm: "h-8 py-1 text-xs",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export function Input({
  className,
  type,
  size,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  );
}

