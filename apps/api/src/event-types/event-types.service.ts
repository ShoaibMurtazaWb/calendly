import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { CreateEventTypeBody, ListEventTypesQuery, UpdateEventTypeBody } from "@sched/api-contract";
import { BadRequestError, ConflictError, NotFoundError } from "../shared/errors/app-error";
import { PrismaService } from "../shared/prisma/prisma.service";
import { rethrowUnique } from "../shared/prisma/unique";
import { reconcileCustomQuestions } from "../shared/utils/custom-questions-parser";
import { parseEventTypeLocation } from "../shared/utils/location-parser";
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
    const location = parseEventTypeLocation(input.location.type, input.location.data);
    if (!location) {
      throw new BadRequestError("INVALID_LOCATION", "Invalid location configuration.");
    }

    const customQuestions = reconcileCustomQuestions(input.customQuestions);

    try {
      const row = await this.prisma.eventType.create({
        data: {
          userId,
          title: input.title,
          slug: input.slug,
          description: input.description,
          durationMinutes: input.durationMinutes,
          beforeBufferMinutes: input.beforeBufferMinutes,
          afterBufferMinutes: input.afterBufferMinutes,
          minimumNoticeMinutes: input.minimumNoticeMinutes,
          locationType: location.type,
          locationData: location.data as Prisma.InputJsonValue,
          customQuestions: customQuestions as unknown as Prisma.InputJsonValue,
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

    // Server-side enforcement: if existing has no location configured (legacy), updating requires valid location
    if (existing.locationType === null && input.location === undefined) {
      throw new BadRequestError(
        "LOCATION_REQUIRED",
        "Legacy event types must be configured with a valid location when updated."
      );
    }

    let locationUpdate: { locationType?: import("@prisma/client").LocationType; locationData?: Prisma.InputJsonValue } = {};
    if (input.location !== undefined) {
      const parsedLocation = parseEventTypeLocation(input.location.type, input.location.data);
      if (!parsedLocation) {
        throw new BadRequestError("INVALID_LOCATION", "Invalid location configuration.");
      }
      locationUpdate = {
        locationType: parsedLocation.type as import("@prisma/client").LocationType,
        locationData: parsedLocation.data as Prisma.InputJsonValue,
      };
    }

    let questionsUpdate: { customQuestions?: Prisma.InputJsonValue } = {};
    if (input.customQuestions !== undefined) {
      const customQuestions = reconcileCustomQuestions(input.customQuestions);
      questionsUpdate = {
        customQuestions: customQuestions as unknown as Prisma.InputJsonValue,
      };
    }

    try {
      const row = await this.prisma.eventType.update({
        where: { id: existing.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
          ...(input.beforeBufferMinutes !== undefined ? { beforeBufferMinutes: input.beforeBufferMinutes } : {}),
          ...(input.afterBufferMinutes !== undefined ? { afterBufferMinutes: input.afterBufferMinutes } : {}),
          ...(input.minimumNoticeMinutes !== undefined ? { minimumNoticeMinutes: input.minimumNoticeMinutes } : {}),
          ...locationUpdate,
          ...questionsUpdate,
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

  async unarchive(userId: string, id: string): Promise<OwnerEventTypeResponse> {
    const existing = await this.findOwnedOrThrow(userId, id);
    if (!existing.archivedAt) {
      return toOwnerEventType(existing);
    }
    const row = await this.prisma.eventType.update({
      where: { id: existing.id },
      data: { archivedAt: null },
    });
    return toOwnerEventType(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.findOwnedOrThrow(userId, id);
    const bookingCount = await this.prisma.booking.count({
      where: { eventTypeId: existing.id },
    });
    if (bookingCount > 0) {
      throw new BadRequestError(
        "CANNOT_DELETE_WITH_BOOKINGS",
        "This event type cannot be deleted because it has existing bookings. You can archive it instead to preserve past records and analytics."
      );
    }
    await this.prisma.eventType.delete({
      where: { id: existing.id },
    });
  }

  async getPublicHostProfile(username: string): Promise<import("@sched/api-contract").PublicHostProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        eventTypes: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundError();
    }

    return {
      user: {
        name: user.name,
        username: user.username,
        timezone: user.timezone,
      },
      eventTypes: user.eventTypes.map((et) => ({
        id: et.id,
        title: et.title,
        slug: et.slug,
        description: et.description,
        durationMinutes: et.durationMinutes,
        beforeBufferMinutes: et.beforeBufferMinutes,
        afterBufferMinutes: et.afterBufferMinutes,
      })),
    };
  }

  async getPublicRaw(username: string, eventSlug: string) {
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
    return row;
  }

  async getPublic(username: string, eventSlug: string): Promise<PublicEventTypeResponse> {
    const row = await this.getPublicRaw(username, eventSlug);
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
