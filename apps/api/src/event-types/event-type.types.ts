import type { EventType, User } from "@prisma/client";

export type OwnerEventTypeResponse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicEventTypeResponse = {
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
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
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPublicEventType(row: EventType, host: User): PublicEventTypeResponse {
  return {
    title: row.title,
    slug: row.slug,
    description: row.description,
    durationMinutes: row.durationMinutes,
    host: {
      name: host.name,
      username: host.username,
      timezone: host.timezone,
    },
  };
}
