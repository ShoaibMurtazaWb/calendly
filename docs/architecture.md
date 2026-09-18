# Architecture — v0.1.0

Modular monolith: two processes, one PostgreSQL database, one domain.

```text
Browser → Next.js (apps/web :3000)
            └── rewrite /api/v1/* → NestJS (apps/api :3001)
                                      └── Prisma → PostgreSQL
```

## Why this shape

- Nest owns authentication, authorization, validation, and persistence so OpenAPI and the UI cannot diverge on policy.
- Next.js is the browser origin. Rewriting `/api/v1` to Nest keeps session cookies host-only and `SameSite=Lax` (cross-port `fetch` would not send Lax cookies).
- Prisma lives in `apps/api` because only the API talks to the database.

## Nest modules

| Module | Owns | Must not own |
|---|---|---|
| Identity | User records, uniqueness of email/username | Cookies |
| Auth | Password verify, sessions, cookie, guards, auth throttle | Event-type rules |
| Event types | CRUD, archive, public projection | Slot calculation |
| Shared | Prisma, config, filters, Zod pipe, request ids | Feature rules |

Controllers parse HTTP and map DTOs. Application services enforce rules and persistence.

## Shared contract

`packages/api-contract` holds Zod schemas and inferred TypeScript types. Nest validates at the HTTP boundary with those schemas. The web app may reuse them for forms. The server remains authoritative.

## Persistence

PostgreSQL 16. Migrations via Prisma. Important invariants are enforced in the database (unique indexes, duration CHECK, username/slug format CHECK). Timestamps are `timestamptz` (UTC). User timezones are IANA identifiers, validated in application code.

## AuthN / AuthZ

- Opaque session token in `HttpOnly` cookie `sched_session`
- SHA-256 of the token stored in `sessions.token_hash`
- Owner queries always include `user_id` from the session
- Cross-user access returns **404** (no existence leak)

## Errors

JSON envelope:

```json
{ "error": { "code": "…", "message": "…", "details": { } } }
```

Request correlation: `X-Request-Id` (accepted or generated).

## OpenAPI

Swagger UI at `/api/docs` when `NODE_ENV !== production`.

## Production follow-ups (not in v0.1)

Dedicated least-privilege DB role, edge rate limits (in-memory throttle does not span processes), `TRUST_PROXY` behind TLS termination, optional RFC 7807 problem+json.
