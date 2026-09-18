# ADR 0001: Modular monolith

## Status

Accepted (v0.1.0)

## Context

We are building a scheduling product that will eventually include availability, bookings, calendar sync, and teams. Distributed systems add operational cost.

## Decision

Ship a modular monolith: NestJS API + Next.js web + one PostgreSQL database. Extract services only when an operational or domain requirement justifies it.

## Consequences

- Simple local development (Compose Postgres only)
- Clear Nest module boundaries without network hops
- Later extraction is possible if a module’s data and traffic truly isolate

## Alternatives

- Microservices from day one — rejected (YAGNI)
- Next.js with all domain logic in Route Handlers — rejected; we need a documented REST API with OpenAPI as the system of record
