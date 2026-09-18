import type { User } from "@prisma/client";

export type CurrentUserResponse = {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  createdAt: string;
};

export function toCurrentUser(user: User): CurrentUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}
