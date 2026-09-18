export const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RESERVED_USERNAMES = [
  "www",
  "api",
  "admin",
  "public",
  "settings",
  "login",
  "register",
  "dashboard",
  "app",
  "static",
  "support",
  "help",
  "status",
] as const;

export const DURATION_MINUTES_MIN = 5;
export const DURATION_MINUTES_MAX = 480;
export const PASSWORD_MIN_LENGTH = 10;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const SLUG_MIN_LENGTH = 1;
export const SLUG_MAX_LENGTH = 64;
export const NAME_MAX_LENGTH = 100;
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;
