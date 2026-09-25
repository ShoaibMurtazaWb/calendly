import { Injectable } from "@nestjs/common";
import { type Prisma } from "@prisma/client";
import { PrismaService } from "../shared/prisma/prisma.service";
import { RequestContext } from "../shared/context/request-context";
import { StructuredLoggerService } from "../shared/services/structured-logger.service";

export interface LogAuditOptions {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async log(options: LogAuditOptions): Promise<void> {
    const ctx = RequestContext.get();
    const effectiveUserId = options.userId ?? ctx?.userId ?? null;
    const effectiveRequestId = options.requestId ?? ctx?.requestId ?? "req_system";
    const effectiveIp = options.ipAddress ?? ctx?.ipAddress ?? null;
    const effectiveUserAgent = options.userAgent ?? ctx?.userAgent ?? null;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId ?? null,
          metadata: (options.metadata as unknown as Prisma.InputJsonValue) ?? undefined,
          requestId: effectiveRequestId,
          ipAddress: effectiveIp,
          userAgent: effectiveUserAgent,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to persist audit log: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
        "AuditService",
      );
    }

    // Emit structured log event for SIEM / external log ingestion
    this.logger.logEvent(options.action, {
      userId: effectiveUserId ?? undefined,
      entityType: options.entityType,
      entityId: options.entityId ?? undefined,
      requestId: effectiveRequestId,
      metadata: options.metadata,
    });
  }

  async getLogsForUser(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
