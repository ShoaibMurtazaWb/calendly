# Architecture — Sched Platform

Modular monolith: Next.js frontend, NestJS backend API with background notification worker, one PostgreSQL database, unified domain contracts.

```text
Browser → Next.js (apps/web :3000)
            └── rewrite /api/v1/* → NestJS (apps/api :3001)
                                      ├── Prisma ORM → PostgreSQL 16 (GiST exclusion constraints)
                                      └── Background Processor (Transactional Outbox SKIP LOCKED)
```

## Why this shape

- **NestJS** owns identity, authentication, authorization, validation, scheduling logic, and persistence.
- **Next.js** acts as the browser origin. Rewriting `/api/v1` to NestJS keeps session cookies host-only and `SameSite=Lax`.
- **Prisma + PostgreSQL** live in `apps/api` with engine-level GiST exclusion constraints preventing double bookings.
- **Background Worker** claims notification jobs asynchronously using PostgreSQL `FOR UPDATE SKIP LOCKED` inside atomic CTEs.

## Nest Modules

| Module | Owns | Must not own |
|---|---|---|
| **Identity** | User records, uniqueness of email/username | Cookies, session state |
| **Auth** | Password verification (Argon2id/bcrypt), sessions, cookies, guards, auth throttling | Event-type or scheduling rules |
| **Event Types** | CRUD, slugs, durations, notice/buffer rules, public event projections | Slot calculation, booking state |
| **Schedules** | Weekly recurring hours, split shifts, date overrides, timezone-aware slot engine | Booking persistence |
| **Bookings** | Booking lifecycle (`CONFIRMED`, `CANCELLED`), concurrency locks, cancellation metadata | Email delivery mechanics |
| **Notifications** | Transactional outbox, `SKIP LOCKED` worker, email providers (`Dev`/`SMTP`), ICS generation | Booking business logic |
| **Shared** | Prisma, config, filters, Zod pipe, request ids, HTML escaping, security | Feature rules |

Controllers parse HTTP and map DTOs. Application services enforce domain rules and persistence transactions.

## Shared Contract

`packages/api-contract` holds Zod schemas and inferred TypeScript types. Nest validates at the HTTP boundary with those schemas. The web app reuses them for forms and API client calls. The server remains authoritative.

## Persistence & Concurrency Invariants

PostgreSQL 16 with native extensions:
- **`citext`**: Case-insensitive email uniqueness.
- **`btree_gist`**: GiST exclusion constraint on `bookings` table:
  ```sql
  ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_confirmed_bookings
  EXCLUDE USING gist (
    host_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status = 'CONFIRMED');
  ```
  This mathematically prevents overlapping confirmed appointments for the same host regardless of transaction isolation levels.
- **Timestamps**: Strictly `timestamptz(6)` in UTC.
- **Timezones**: Validated IANA identifiers.

## Transactional Outbox Pattern

All state-changing booking operations (`createBooking`, `cancelBooking`) write business records and `NotificationJob` rows in the exact same database transaction.

```sql
WITH claimed AS (
  SELECT id FROM notification_jobs
  WHERE status = 'PENDING'::"NotificationStatus" AND next_run_at <= NOW()
  ORDER BY next_run_at ASC
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
UPDATE notification_jobs
SET status = 'PROCESSING'::"NotificationStatus", locked_at = NOW()
WHERE id IN (SELECT id FROM claimed)
RETURNING *;
```

- **Stale Lock Sweeper**: Automatically resets abandoned `PROCESSING` jobs (`lockedAt < NOW() - 5m`) back to `PENDING`.
- **Idempotency**: Deterministic keys (`booking:${id}:confirmed:attendee`) prevent duplicate emails.
- **HTML Sanitization**: Untrusted user inputs (`attendeeName`, `attendeeNotes`, `cancellationReason`) are escaped at the template rendering boundary without mutating stored domain values.

## Rate Limiting & Proxy Semantics

- Protected via `@nestjs/throttler` with `ThrottlerGuard`.
- In-memory fixed-window counter per IP (e.g. 10 booking requests/min, 60 slot requests/min).
- `TRUST_PROXY=true` configures Express `trust proxy: 1` to inspect `X-Forwarded-For` from reverse proxies.
- *Note for Multi-Instance Deployments*: The current in-memory store is instance-local. When horizontally scaling the API across multiple nodes, a shared Redis store or edge proxy rate limiter (e.g., Cloudflare) must be configured.

## AuthN / AuthZ

- Opaque 32-byte session token in `HttpOnly`, `SameSite=Lax` cookie (`sched_session`).
- SHA-256 hash stored in `sessions.token_hash`.
- User-scoped queries prevent cross-user existence leaks (returns 404).

## Errors

Standard JSON error envelope:
```json
{
  "error": {
    "code": "SLOT_ALREADY_BOOKED",
    "message": "This time slot has already been booked by someone else.",
    "details": {}
  }
}
```
Exclusion constraint failures (`23P01`) normalize deterministically to `409 Conflict` (`SLOT_ALREADY_BOOKED`).
