# Sched

High-precision scheduling SaaS platform with timezone-aware slot calculation, split shifts, concurrency-safe booking commitments, and transactional notification workflows.

See [docs/product.md](docs/product.md), [docs/architecture.md](docs/architecture.md), and [docs/design.md](docs/design.md).

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI, Lucide Icons
- **Backend**: NestJS, Prisma ORM (v6), PostgreSQL 16 (`citext`, `btree_gist`)
- **Background Worker**: Transactional Outbox processor (`SKIP LOCKED`)
- **Monorepo**: pnpm workspaces + Turborepo
- **Local Database**: Docker Compose PostgreSQL

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker

## Local Development Setup

```bash
# 1. Environment configuration
cp .env.example apps/api/.env

# 2. Start PostgreSQL container
docker compose up -d postgres

# 3. Install dependencies
pnpm install

# 4. Run database migrations
pnpm --filter @sched/api prisma:migrate:deploy

# 5. Start dev servers (Next.js :3000, NestJS :3001)
pnpm dev
```

- Web App: `http://localhost:3000`
- API Base: `http://localhost:3001/api/v1`
- OpenAPI Swagger: `http://localhost:3001/api/docs`

The web application proxies `/api/v1/*` to the API to maintain `SameSite=Lax` session cookie security.

## Quality Gates & Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Run API + Web development servers |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm typecheck` | Strict TypeScript type checking across monorepo |
| `pnpm test` | Run Jest unit, HTTP integration, outbox & concurrency test suites |
| `pnpm build` | Build production bundles for API, Web, and contracts |
| `pnpm turbo lint typecheck build test` | Execute full CI verification pipeline |

## Key Invariants & Concurrency Safety

- **Zero Double-Bookings**: PostgreSQL GiST exclusion constraint (`no_overlapping_confirmed_bookings`) enforces booking non-overlap at the database engine level.
- **Transactional Outbox**: Notifications are committed in the same database transaction as booking mutations and claimed atomically using `FOR UPDATE SKIP LOCKED`.
- **Timezone Precision**: Stored strictly in UTC (`timestamptz`); client-side presentation handles IANA timezones and DST transitions.
- **HTML Sanitization**: User-supplied values are escaped at template rendering boundaries without mutating stored domain values.
- **Rate Limiting**: Public endpoints are rate-limited via `@nestjs/throttler` (in-memory per instance). Set `TRUST_PROXY=true` when running behind a reverse proxy.
