# Product — v0.1.0

Scheduling SaaS for hosts who publish event types and, later, accept bookings. Week 1 ships identity, event-type management, and a public read-only event-type page. It does **not** compute availability or create meetings.

## Who it is for

A single host who wants a public profile (`/public/:username/:eventSlug`) and a private dashboard to manage event types.

## v0.1 capabilities

- Register with name, unique username, email, password, and IANA timezone
- Log in, log out, and load the current user
- Create, list, view, update, and archive event types
- Public, unauthenticated read of an **active** event type

## v0.1 non-goals

Availability, booking, calendars, email, payments, teams, webhooks, username changes, password reset, email verification, and account deletion.

## Invariants (product)

- Username is a public handle: lowercase slug, unique, immutable after signup
- Email is the login identifier (case-insensitive unique)
- Event-type slugs are unique per host, not globally
- Archive is the only removal path; archived types are hidden from the public page and the default dashboard list
- The public page never exposes the host email

## User-visible URLs (web)

| Path | Audience |
|---|---|
| `/register`, `/login` | Anonymous |
| `/dashboard` | Authenticated host |
| `/dashboard/event-types/new` | Authenticated host |
| `/dashboard/event-types/:id/edit` | Authenticated host |
| `/public/:username/:eventSlug` | Anyone |

API contracts live under `/api/v1` (see [architecture.md](./architecture.md)).
