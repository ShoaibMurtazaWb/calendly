import { z } from "zod";
import {
  DESCRIPTION_MAX_LENGTH,
  DURATION_MINUTES_MAX,
  DURATION_MINUTES_MIN,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESERVED_USERNAMES,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_PATTERN,
  TITLE_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "./constants";

const reserved = new Set<string>(RESERVED_USERNAMES);

function ianaTimeZones(): Set<string> {
  return new Set(Intl.supportedValuesOf("timeZone"));
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email")
  .max(254)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(1024);

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(NAME_MAX_LENGTH);

export const usernameSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(USERNAME_MIN_LENGTH)
      .max(USERNAME_MAX_LENGTH)
      .regex(USERNAME_PATTERN, "Use lowercase letters, numbers, and hyphens")
      .refine((value) => !reserved.has(value), "This username is reserved"),
  );

export const slugSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(SLUG_MIN_LENGTH)
      .max(SLUG_MAX_LENGTH)
      .regex(SLUG_PATTERN, "Use lowercase letters, numbers, and hyphens"),
  );

export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required")
  .refine((value) => ianaTimeZones().has(value), "Enter a valid IANA timezone");

export const durationMinutesSchema = z.coerce
  .number()
  .int("Duration must be a whole number of minutes")
  .min(DURATION_MINUTES_MIN)
  .max(DURATION_MINUTES_MAX);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  username: usernameSchema,
  timezone: timezoneSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(1024),
});

export const createEventTypeBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(TITLE_MAX_LENGTH),
  slug: slugSchema,
  description: z.string().trim().max(DESCRIPTION_MAX_LENGTH).default(""),
  durationMinutes: durationMinutesSchema,
});

export const updateEventTypeBodySchema = z
  .object({
    title: z.string().trim().min(1).max(TITLE_MAX_LENGTH).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().max(DESCRIPTION_MAX_LENGTH).optional(),
    durationMinutes: durationMinutesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const eventTypeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listEventTypesQuerySchema = z.object({
  status: z.enum(["active", "archived"]).default("active"),
});

export const publicEventTypeParamsSchema = z.object({
  username: usernameSchema,
  eventSlug: slugSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type CreateEventTypeBody = z.infer<typeof createEventTypeBodySchema>;
export type UpdateEventTypeBody = z.infer<typeof updateEventTypeBodySchema>;
export type ListEventTypesQuery = z.infer<typeof listEventTypesQuerySchema>;
export type PublicEventTypeParams = z.infer<typeof publicEventTypeParamsSchema>;
