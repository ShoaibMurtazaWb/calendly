import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const selectVariants = cva(
  "w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs transition-[border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] focus-visible:border-[var(--border-focus)] aria-invalid:border-[var(--status-danger-border)] aria-invalid:focus-visible:ring-[var(--status-danger-text)] disabled:cursor-not-allowed disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      size: {
        default: "h-9 pl-3 pr-8 text-sm",
        sm: "h-8 pl-2.5 pr-7 text-xs",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export function Select({
  className,
  size,
  children,
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & VariantProps<typeof selectVariants>) {
  return (
    <div className="relative inline-flex w-full items-center">
      <select
        className={cn(selectVariants({ size, className }))}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-2.5 text-[var(--text-muted)]",
          size === "sm" ? "h-3.5 w-3.5 right-2" : "h-4 w-4",
        )}
        aria-hidden="true"
      />
    </div>
  );
}
