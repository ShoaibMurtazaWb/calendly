# Sched Architecture & System Overview

## 1. High-Level System Architecture

Sched is a high-performance, production-grade scheduling and calendar integration platform built on a modern TypeScript monorepo with Next.js (App Router), NestJS (Modular API), PostgreSQL with Prisma ORM, and background workers.

```
                  ┌────────────────────────────────────────────────┐
                  │                 Next.js Frontend                │
                  │         (App Router, Dashboard, Public)        │
                  └───────────────────────┬────────────────────────┘
                                          │
                        HTTPS + Request Correlation ID
                        (x-request-id: req_8x92hd)
                                          │
                                          ▼
                  ┌────────────────────────────────────────────────┐
                  │                 NestJS API Core                │
                  │   ├── RequestContextMiddleware (AsyncLocal)    │
                  │   ├── Helmet, Cookies (HttpOnly/Secure/Lax)    │
                  │   ├── ThrottlerGuard (Rate Limiting)           │
                  │   ├── StructuredLogger (JSON Logs)             │
                  │   └── Global HttpErrorFilter                   │
                  └───────┬────────────────────────┬───────────────┘
                          │                        │
         Transactional Persistence            Outbox Pattern
                          │                        │
                          ▼                        ▼
                  ┌───────────────┐        ┌───────────────┐
                  │  PostgreSQL   │        │ Outbox Tables │
                  │  (b-tree/gist)│        │- Notification │
                  └───────────────┘        │- CalendarSync │
                                           └───────┬───────┘
                                                   │
                                          SKIP LOCKED Sweep
                                                   │
                                                   ▼
                                           ┌───────────────┐
                                           │ Worker Queue  │
                                           │ ├── Resilient │
                                           │ └── DLQ State │
                                           └───────────────┘
```

---

## 2. Request Correlation & Observability

Every incoming HTTP request is assigned a unique Correlation ID (`req_<hex>` or forwarded `x-request-id`). 

1. **Propagation**: Handled through Node.js `AsyncLocalStorage` in `RequestContext`.
2. **Context Enrichment**: All service invocations, database operations, structured log statements, and outbox job payloads automatically capture the active `requestId` and `userId`.
3. **Structured Logs**:
   ```json
   {
     "timestamp": "2026-09-24T22:30:00.000Z",
     "level": "info",
     "event": "BOOKING_CREATED",
     "bookingId": "c56a4180-65aa-42ec-a945-5fd21dec0538",
     "userId": "93b2a249-1db7-4c7a-8f1d-bca7fa1dbb4e",
     "durationMs": 118,
     "duration": "118ms",
     "requestId": "req_8x92hd",
     "context": "Event"
   }
   ```

---

## 3. Database Design & Relational Model

The PostgreSQL database enforces relational integrity, optimistic locking, and mathematical concurrency constraints.

### Core Tables & Indexes:
- `users`: Core identity, password hash (Argon2id), notification preferences, scheduling defaults, and avatar URL.
- `event_types`: Meeting definitions (duration, buffer before/after, minimum notice, location type, custom questions).
  - Indexes: `[userId, slug]` (unique), `[userId, archivedAt]`.
- `schedules`: Weekly recurring availability and date overrides.
- `bookings`: Active and past reservations.
  - Multi-column index: `[hostId, startTime, status]`, `[eventTypeId, startTime, status]`.
  - Date & status indexes: `[hostId, status, createdAt]`, `[startTime]`, `[status]`, `[createdAt]`.
  - GiST exclusion constraint: `no_overlapping_confirmed_bookings` preventing physical double-booking at the database engine level.
- `audit_logs`: Enterprise-grade audit trail with indexed querying `[userId, createdAt]` and `[entityType, entityId]`.
- `notification_jobs`: Transactional outbox table for email notifications with retry counts, next run time, and `DEAD_LETTER` state.
- `calendar_sync_jobs`: Outbox table for two-way Google Calendar synchronization with retry counts and `DEAD_LETTER` state.

---

## 4. Worker Architecture & Dead-Letter Handling

Background processors run independently of the synchronous HTTP request path using the Transactional Outbox pattern:

1. **Transactional Enqueue**: During booking creation/cancellation/rescheduling, notification and sync jobs are created inside the same atomic database transaction as the booking.
2. **Deterministic Claiming**: Workers use PostgreSQL `FOR UPDATE SKIP LOCKED` inside a Common Table Expression (CTE) to safely claim pending jobs across multiple worker replicas without lock contention.
3. **Exponential Backoff**: Failed jobs are retried with exponential backoff ($2^n \times 2\text{s}$ up to 60s).
4. **Dead Letter Queue (DLQ)**: Once `attempts >= maxAttempts`, jobs transition to `DEAD_LETTER` status rather than silently dropping, with full error logging and structured alerting.
