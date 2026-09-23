# Product Specification — Sched

Sched is an operational, high-precision calendar scheduling SaaS platform engineered to eliminate meeting friction for hosts and attendees across timezones.

## Core Capabilities

- **Identity & Authentication**: Sign up with username handle, email, password, and IANA timezone. Secure session-based authentication with `SameSite=Lax` cookies.
- **Event Types Management**: Create, edit, configure durations (15m, 30m, 45m, 60m), notice limits, buffer times, and archive/unarchive event types.
- **Availability & Multi-Interval Split Shifts**: Configurable weekly schedule with split shifts per day (e.g. 09:00–12:00 and 13:00–17:00), day toggles, and date overrides.
- **Timezone-Aware Booking Engine**: Real-time slot calculation against host schedule and existing bookings, projected seamlessly into the attendee's local timezone.
- **Zero Double-Booking Guarantee**: PostgreSQL GiST exclusion constraint (`no_overlapping_confirmed_bookings`) guarantees mathematical conflict prevention under high concurrency.
- **Self-Service Booking & Cancellation**: Public booking confirmation, RFC 5545 `.ics` calendar generation, and mutual cancellation flows (host & attendee) with slot release.
- **Transactional Email Notifications**: Asynchronous email delivery via PostgreSQL transactional outbox (`SKIP LOCKED` worker), with automated confirmation and cancellation emails.

## Invariants (Product & Business Rules)

- **Usernames**: Lowercase alphanumeric slug, globally unique, immutable after registration.
- **Emails**: Unique login identifier (case-insensitive via `citext`).
- **Event Slugs**: Unique per host, not globally.
- **Event Archiving**: Soft-removal path; archived event types are hidden from public discovery and default dashboard views.
- **Privacy**: Host email is never exposed on public booking pages.
- **HTML Sanitization**: Untrusted attendee notes and reasons are escaped before rendering in email HTML templates.
- **Time Representation**: All persistent storage is in UTC (`timestamptz`); client-side presentation handles IANA timezones and DST transitions.

## User-Visible URLs (Web App)

| Path | Audience | Purpose |
|---|---|---|
| `/` | Public / Dynamic | Landing page with personalized dashboard CTAs for logged-in hosts |
| `/login`, `/register` | Anonymous | Authentication forms with automatic redirection for active sessions |
| `/dashboard` | Authenticated Host | Event types overview and management |
| `/dashboard/event-types/new` | Authenticated Host | Create new event type |
| `/dashboard/event-types/:id/edit` | Authenticated Host | Edit / archive event type |
| `/dashboard/availability` | Authenticated Host | Weekly hours, split shifts, and date overrides editor |
| `/dashboard/bookings` | Authenticated Host | Host bookings manager (Upcoming, Past, Cancelled) |
| `/public/:username` | Public | Host public directory of active event types |
| `/public/:username/:eventSlug` | Public | Interactive calendar date & time slot booking page |
| `/public/bookings/:id` | Public | Booking confirmation & attendee cancellation portal |
