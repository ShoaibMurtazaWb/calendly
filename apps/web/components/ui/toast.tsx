"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "destructive" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  isDismissing?: boolean;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

export function dismissToast(id: string) {
  const target = toasts.find((t) => t.id === id);
  if (!target || target.isDismissing) return;

  toasts = toasts.map((t) => (t.id === id ? { ...t, isDismissing: true } : t));
  notify();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 300);
}

export function showToast({
  title,
  description,
  variant = "default",
  duration = 4000,
}: Omit<ToastItem, "id" | "isDismissing">) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastItem = { id, title, description, variant, duration, isDismissing: false };

  toasts = [...toasts.slice(-3), newToast];
  notify();

  return id;
}

export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    showToast({ title, description, variant: "success", duration }),
  error: (title: string, description?: string, duration?: number) =>
    showToast({ title, description, variant: "destructive", duration }),
  warning: (title: string, description?: string, duration?: number) =>
    showToast({ title, description, variant: "warning", duration }),
  info: (title: string, description?: string, duration?: number) =>
    showToast({ title, description, variant: "info", duration }),
  dismiss: dismissToast,
};

export function useToasts() {
  const [currentToasts, setCurrentToasts] = React.useState<ToastItem[]>(toasts);

  React.useEffect(() => {
    listeners.add(setCurrentToasts);
    return () => {
      listeners.delete(setCurrentToasts);
    };
  }, []);

  return currentToasts;
}

function ToastCard({ toast: t }: { toast: ToastItem }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const remainingTimeRef = React.useRef(t.duration ?? 4000);
  const startTimeRef = React.useRef<number>(Date.now());
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Trigger slide-in transition immediately after mount
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Handle auto-dismiss with pause on hover
  React.useEffect(() => {
    if (t.isDismissing || !t.duration || t.duration <= 0) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        dismissToast(t.id);
      }, remainingTimeRef.current);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const elapsed = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, t.duration, t.isDismissing, isPaused]);

  const isLeaving = t.isDismissing || !isVisible;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        "pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 shadow-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isLeaving
          ? "translate-x-[110%] opacity-0 scale-95 pointer-events-none"
          : "translate-x-0 opacity-100 scale-100",
      )}
    >
      {/* Status Icon */}
      <div className="shrink-0 mt-0.5">
        {t.variant === "success" && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        )}
        {t.variant === "destructive" && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-2xs">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
        )}
        {t.variant === "warning" && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        )}
        {t.variant === "info" && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-2xs">
            <Info className="h-3.5 w-3.5" />
          </div>
        )}
        {t.variant === "default" && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] shadow-2xs">
            <Info className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {/* Toast Message */}
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
          {t.title}
        </p>
        {t.description && (
          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {t.description}
          </p>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => dismissToast(t.id)}
        className="shrink-0 rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-[background-color,color] duration-150 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Smooth Hairline Progress Indicator */}
      {t.duration && t.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border-subtle)]/40 overflow-hidden">
          <div
            className={cn(
              "h-full w-full origin-left",
              t.variant === "success" && "bg-emerald-500",
              t.variant === "destructive" && "bg-rose-500",
              t.variant === "warning" && "bg-amber-500",
              t.variant === "info" && "bg-blue-500",
              t.variant === "default" && "bg-neutral-800",
            )}
            style={{
              animation: `toast-progress ${t.duration}ms linear forwards`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function Toaster() {
  const activeToasts = useToasts();

  if (activeToasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[150] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4 sm:p-0 overflow-hidden"
    >
      {activeToasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
