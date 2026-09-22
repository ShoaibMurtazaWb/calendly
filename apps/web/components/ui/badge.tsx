import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap transition-[background-color,border-color,color] duration-150 ease-out",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]",
        secondary:
          "bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-transparent",
        success:
          "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-border)]",
        danger:
          "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]",
        warning:
          "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]",
        info:
          "bg-[var(--status-info-bg)] text-[var(--status-info-text)] border border-[var(--status-info-border)]",
        outline:
          "border border-[var(--border-subtle)] text-[var(--text-secondary)] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
