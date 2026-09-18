# ADR 0004: Zod at the HTTP boundary

## Status

Accepted (v0.1.0)

## Context

We need fail-fast validation, TypeScript inference, and a single language for web forms and the API.

## Decision

Validate params, query, and JSON bodies with Zod schemas from `@sched/api-contract`. Nest uses a Zod pipe. Database constraints remain the last line of defense. Unique violations (`P2002`) map to HTTP 409.

IANA timezones are validated in application code (`Intl.supportedValuesOf('timeZone')`), not in PostgreSQL.

Error bodies use an internal `{ error: { code, message, details } }` envelope. RFC 7807 is a later option.

## Consequences

- OpenAPI models are declared explicitly (Swagger decorators / DTOs) rather than generated solely from `class-validator`
- Invalid timezone/slug/duration never reach business rules

## Alternatives

- `class-validator` + Nest Swagger plugin — more Nest-native OpenAPI, duplicated client rules
- RFC 7807 only — extra ceremony for a private browser API
