import { ApiError, isApiErrorBody } from "./api-error";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  createdAt: string;
};

export type EventType = {
  id: string;
  title: string;
  slug: string;
  description: string;
  durationMinutes: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicEventType = {
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

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text) as unknown;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const body = await parseBody(response);
  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(response.status, body);
    }
    throw new Error(`Request failed (${response.status})`);
  }
  return body as T;
}
