import { Injectable } from "@nestjs/common";
import type { CreateEventTypeBody, ListEventTypesQuery, UpdateEventTypeBody } from "@sched/api-contract";
import { ConflictError, NotFoundError } from "../shared/errors/app-error";
import { PrismaService } from "../shared/prisma/prisma.service";
import { rethrowUnique } from "../shared/prisma/unique";
import { toOwnerEventType, toPublicEventType, type OwnerEventTypeResponse, type PublicEventTypeResponse } from "./event-type.types";

@Injectable()
export class EventTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListEventTypesQuery): Promise<OwnerEventTypeResponse[]> {
    const rows = await this.prisma.eventType.findMany({
      where: {
        userId,
        archivedAt: query.status === "archived" ? { not: null } : null,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toOwnerEventType);
  }

  async create(userId: string, input: CreateEventTypeBody): Promise<OwnerEventTypeResponse> {
    try {
      const row = await this.prisma.eventType.create({
        data: {
          userId,
          title: input.title,
          slug: input.slug,
          description: input.description,
          durationMinutes: input.durationMinutes,
        },
      });
      return toOwnerEventType(row);
    } catch (error) {
      rethrowUnique(error, () => {
        throw error;
      });
    }
  }

  async getOwned(userId: string, id: string): Promise<OwnerEventTypeResponse> {
    const row = await this.findOwnedOrThrow(userId, id);
    return toOwnerEventType(row);
  }

  async update(userId: string, id: string, input: UpdateEventTypeBody): Promise<OwnerEventTypeResponse> {
    const existing = await this.findOwnedOrThrow(userId, id);
    if (existing.archivedAt) {
      throw new ConflictError("EVENT_TYPE_ARCHIVED", "Archived event types cannot be edited.");
    }
    try {
      const row = await this.prisma.eventType.update({
        where: { id: existing.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
        },
      });
      return toOwnerEventType(row);
    } catch (error) {
      rethrowUnique(error, () => {
        throw error;
      });
    }
  }

  async archive(userId: string, id: string): Promise<OwnerEventTypeResponse> {
    const existing = await this.findOwnedOrThrow(userId, id);
    if (existing.archivedAt) {
      return toOwnerEventType(existing);
    }
    const row = await this.prisma.eventType.update({
      where: { id: existing.id },
      data: { archivedAt: new Date() },
    });
    return toOwnerEventType(row);
  }

  async getPublic(username: string, eventSlug: string): Promise<PublicEventTypeResponse> {
    const row = await this.prisma.eventType.findFirst({
      where: {
        slug: eventSlug,
        archivedAt: null,
        user: { username },
      },
      include: { user: true },
    });
    if (!row) {
      throw new NotFoundError();
    }
    return toPublicEventType(row, row.user);
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const row = await this.prisma.eventType.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundError();
    }
    return row;
  }
}
