import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin text-current", {
  variants: {
    size: {
      sm: "h-3.5 w-3.5",
      default: "h-4 w-4",
      lg: "h-5 w-5",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export function Spinner({ className, size, label = "Loading...", ...props }: SpinnerProps) {
  return (
    <span className="inline-flex items-center justify-center">
      <Loader2
        className={cn(spinnerVariants({ size, className }))}
        role="status"
        aria-label={label}
        {...props}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
