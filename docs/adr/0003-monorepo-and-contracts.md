# ADR 0003: pnpm workspace, Turborepo, shared API contract

## Status

Accepted (v0.1.0)

## Context

Web and API share request/response shapes. We want one install, one CI graph, and no duplicated validation language.

## Decision

- pnpm workspaces + Turborepo
- Apps: `apps/web`, `apps/api`
- Packages: TypeScript config, ESLint config, `api-contract` (Zod + types)
- Prisma schema and migrations live in `apps/api`

## Consequences

- `web` and `api` may depend on `api-contract`; `api` must not depend on `web`
- Contract package is built before dependents in Turbo

## Alternatives

- Separate repositories — slower for a two-person-or-one-engineer product
- `class-validator` only on Nest — duplicates rules on the client
