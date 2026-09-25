import { Injectable, LoggerService } from "@nestjs/common";
import { RequestContext } from "../context/request-context";

export interface StructuredLogPayload {
  event?: string;
  level?: "info" | "warn" | "error" | "debug";
  message?: string;
  requestId?: string;
  userId?: string;
  bookingId?: string;
  eventTypeId?: string;
  duration?: string;
  durationMs?: number;
  timestamp?: string;
  context?: string;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string | number;
  };
  [key: string]: unknown;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private formatLog(
    level: "info" | "warn" | "error" | "debug",
    messageOrEvent: string,
    context?: string,
    extra?: Record<string, unknown>,
  ): string {
    const ctx = RequestContext.get();
    const requestId = ctx?.requestId ?? "req_system";
    const userId = ctx?.userId;

    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      requestId,
      ...(userId ? { userId } : {}),
      context: context || "App",
      ...extra,
    };

    if (extra?.event) {
      payload.event = String(extra.event);
    } else {
      payload.message = messageOrEvent;
    }

    if (ctx?.startTime && !payload.duration && !payload.durationMs) {
      const elapsed = Date.now() - ctx.startTime;
      payload.durationMs = elapsed;
      payload.duration = `${elapsed}ms`;
    }

    return JSON.stringify(payload);
  }

  logEvent(event: string, data: Record<string, unknown> = {}): void {
    const output = this.formatLog("info", event, "Event", { event, ...data });
    process.stdout.write(output + "\n");
  }

  log(message: string, context?: string, extra?: Record<string, unknown>): void {
    const output = this.formatLog("info", message, context, extra);
    process.stdout.write(output + "\n");
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    extra?: Record<string, unknown>,
  ): void {
    const errorDetails =
      trace || message
        ? {
            message,
            stack: trace,
          }
        : undefined;

    const output = this.formatLog("error", message, context, {
      ...extra,
      ...(errorDetails ? { error: errorDetails } : {}),
    });
    process.stderr.write(output + "\n");
  }

  warn(message: string, context?: string, extra?: Record<string, unknown>): void {
    const output = this.formatLog("warn", message, context, extra);
    process.stdout.write(output + "\n");
  }

  debug(message: string, context?: string, extra?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
      const output = this.formatLog("debug", message, context, extra);
      process.stdout.write(output + "\n");
    }
  }

  verbose?(message: string, context?: string): void {
    this.debug(message, context);
  }
}
