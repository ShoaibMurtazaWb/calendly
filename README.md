# Sched (v0.1.0)

Production-oriented scheduling SaaS foundation: accounts, event types, and public read-only event-type pages. Availability and booking are **not** in this version.

See [docs/product.md](docs/product.md) and [docs/architecture.md](docs/architecture.md).

## Stack

- Web: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- API: NestJS, Prisma, PostgreSQL
- Monorepo: pnpm + Turborepo
- Local DB: Docker Compose

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker

## Local development

```bash
cp .env.example apps/api/.env
docker compose up -d postgres
pnpm install
pnpm --filter @sched/api prisma:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1
- OpenAPI (non-production): http://localhost:3001/api/docs

The web app proxies `/api/v1/*` to the API so session cookies stay same-origin.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | API + web |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm --filter @sched/api test` | API unit + integration tests |
| `pnpm build` | Production builds |

## Security notes

- Passwords are hashed with Argon2id
- Session tokens are stored hashed (SHA-256)
- In-memory login/register throttle (10/min/IP) does **not** span multiple API processes
- Set `COOKIE_SECURE=true` behind HTTPS; set `TRUST_PROXY` only when terminating TLS in front of Nest
