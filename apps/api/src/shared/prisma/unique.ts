import { Prisma } from "@prisma/client";
import { ConflictError } from "../errors/app-error";

export function rethrowUnique(error: unknown, fallback: () => never): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const targets = Array.isArray(error.meta?.target)
      ? (error.meta.target as string[])
      : [];
    if (targets.includes("email")) {
      throw new ConflictError("EMAIL_CONFLICT", "An account with this email already exists.", {
        fields: { email: "taken" },
      });
    }
    if (targets.includes("username")) {
      throw new ConflictError("USERNAME_CONFLICT", "This username is already taken.", {
        fields: { username: "taken" },
      });
    }
    if (targets.includes("user_id_slug") || targets.some((t) => t.includes("slug"))) {
      throw new ConflictError(
        "EVENT_TYPE_SLUG_CONFLICT",
        "You already have an event type with this slug.",
        { fields: { slug: "taken" } },
      );
    }
  }
  fallback();
  throw new Error("unreachable");
}
