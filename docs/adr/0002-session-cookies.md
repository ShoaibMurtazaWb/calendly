# ADR 0002: Server-side sessions in HttpOnly cookies

## Status

Accepted (v0.1.0)

## Context

The browser is the only client in Week 1. Sessions must be revocable on logout. Tokens must not be stored as reusable plaintext in the database.

## Decision

- Issue a 32-byte CSPRNG token; put the base64url value in cookie `sched_session`
- Persist `sha256(token)` in PostgreSQL `sessions`
- Cookie: `HttpOnly`, `Path=/`, `SameSite=Lax`, `Secure` in production, 14-day expiry
- Nest owns session lifecycle; Next.js does not store sessions
- Same-origin access via Next rewrite so Lax cookies work locally

## Consequences

- Logout can revoke a row immediately
- Horizontal API scale still works (state is in Postgres)
- CSRF: Lax + same-origin is sufficient for v0.1; revisit if a non-browser client or `SameSite=None` appears

## Alternatives

- JWT in cookie — harder revocation without a denylist
- NextAuth / Auth.js — splits auth away from the Nest policy surface
