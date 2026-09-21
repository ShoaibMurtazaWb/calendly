import type { EventType, User } from "@prisma/client";

export type OwnerEventTypeResponse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumNoticeMinutes: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicEventTypeResponse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumNoticeMinutes: number;
  host: {
    name: string;
    username: string;
    timezone: string;
  };
};

export function toOwnerEventType(row: EventType): OwnerEventTypeResponse {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    durationMinutes: row.durationMinutes,
    beforeBufferMinutes: row.beforeBufferMinutes,
    afterBufferMinutes: row.afterBufferMinutes,
    minimumNoticeMinutes: row.minimumNoticeMinutes,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPublicEventType(row: EventType, host: User): PublicEventTypeResponse {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    durationMinutes: row.durationMinutes,
    beforeBufferMinutes: row.beforeBufferMinutes,
    afterBufferMinutes: row.afterBufferMinutes,
    minimumNoticeMinutes: row.minimumNoticeMinutes,
    host: {
      name: host.name,
      username: host.username,
      timezone: host.timezone,
    },
  };
}
