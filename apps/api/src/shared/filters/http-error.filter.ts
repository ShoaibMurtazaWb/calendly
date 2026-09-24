import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

function requestIdOf(request: Request): string {
  const header = request.header("x-request-id");
  return header && header.length > 0 ? header : "unknown";
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = requestIdOf(request);

    if (exception instanceof AppError) {
      const details = exception.details || {};
      response.status(exception.httpStatus).json({
        error: {
          code: exception.code,
          message: exception.message,
          details,
          ...(details.booking ? { booking: details.booking } : {}),
        },
        code: exception.code,
        message: exception.message,
        details,
        ...(details.booking ? { booking: details.booking } : {}),
      });
      return;
    }

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: { fields: flattenZod(exception) },
        },
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === "P2002") {
      const conflict = mapUniqueConstraint(exception);
      response.status(HttpStatus.CONFLICT).json({
        error: conflict,
      });
      return;
    }

    if (
      exception &&
      typeof exception === "object" &&
      ("code" in exception && (exception as { code: string }).code === "23P01" ||
       "message" in exception && (
         String((exception as { message: string }).message).includes("23P01") ||
         String((exception as { message: string }).message).includes("no_overlapping_confirmed_bookings") ||
         String((exception as { message: string }).message).includes("exclusion constraint")
       ))
    ) {
      response.status(HttpStatus.CONFLICT).json({
        error: {
          code: "SLOT_ALREADY_BOOKED",
          message: "This time slot has already been booked by someone else.",
          details: {},
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === "string"
          ? payload
          : payload && typeof payload === "object" && "message" in payload
            ? String((payload as { message: unknown }).message)
            : exception.message;
      response.status(status).json({
        error: {
          code: status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR",
          message,
          details: {},
        },
      });
      return;
    }

    this.logger.error(
      `Unhandled error requestId=${requestId} ${exception instanceof Error ? exception.stack : String(exception)}`,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: {},
      },
    });
  }
}

export function flattenZod(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "request";
    if (!fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

function mapUniqueConstraint(error: Prisma.PrismaClientKnownRequestError): {
  code: string;
  message: string;
  details: { fields: Record<string, string> };
} {
  const targets = Array.isArray(error.meta?.target)
    ? (error.meta.target as string[])
    : [];
  if (targets.includes("email")) {
    return {
      code: "EMAIL_CONFLICT",
      message: "An account with this email already exists.",
      details: { fields: { email: "taken" } },
    };
  }
  if (targets.includes("username")) {
    return {
      code: "USERNAME_CONFLICT",
      message: "This username is already taken.",
      details: { fields: { username: "taken" } },
    };
  }
  if (targets.includes("user_id") || targets.includes("slug") || targets.some((t) => t.includes("slug"))) {
    return {
      code: "EVENT_TYPE_SLUG_CONFLICT",
      message: "You already have an event type with this slug.",
      details: { fields: { slug: "taken" } },
    };
  }
  return {
    code: "CONFLICT",
    message: "A unique constraint was violated.",
    details: { fields: {} },
  };
}
