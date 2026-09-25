# Sched Operations & Deployment Guide

## 1. Environment Variables

Configure the following environment variables in production:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | API Server listening port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string with pooling parameters | `postgresql://user:pass@host:5432/sched?pgbouncer=true&connection_limit=20` |
| `SESSION_SECRET` | Cryptographic secret for signing session tokens and OAuth state | `32+ character random hex` |
| `CALENDAR_ENCRYPTION_KEY` | AES-256-GCM master key (hex) for encrypting stored OAuth tokens | `64 character hex string` |
| `COOKIE_SECURE` | Force HTTPS-only cookies in production (`true`/`false`) | `true` |
| `WEB_ORIGIN` | Allowed CORS origin for Next.js frontend | `https://sched.yourdomain.com` |
| `APP_URL` | Canonical public application URL for notification links | `https://sched.yourdomain.com` |
| `SMTP_HOST` | SMTP server host | `smtp.resend.com` / `smtp.sendgrid.net` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASS` | SMTP secret key / password | `re_xxx` |
| `SMTP_FROM` | Sender address for transactional emails | `Sched <notifications@yourdomain.com>` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Client Secret | `GOCSPX-xxx` |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL | `https://api.yourdomain.com/api/v1/integrations/google/callback` |

---

## 2. Deployment Steps

### Containerized / Cloud Deployment:
1. **Build Docker images or run monorepo build**:
   ```bash
   pnpm install --frozen-lockfile
   pnpm turbo build
   ```
2. **Apply database migrations**:
   ```bash
   pnpm --filter @sched/api exec prisma migrate deploy
   ```
3. **Start API and Web services**:
   - API: `node apps/api/dist/main.js`
   - Web: `pnpm --filter @sched/web start`

---

## 3. Database Migration Process

1. Development schema changes are recorded using Prisma:
   ```bash
   pnpm --filter @sched/api exec prisma migrate dev --name <migration_name>
   ```
2. In production CI/CD pipelines, execute:
   ```bash
   pnpm --filter @sched/api exec prisma migrate deploy
   ```
3. To safely inspect database indexes and active connections:
   ```sql
   SELECT pid, usename, client_addr, state, query_start, query 
   FROM pg_stat_activity 
   WHERE datname = 'sched';
   ```

---

## 4. Rate Limiting & Abuse Protection

The API uses `@nestjs/throttler` with IP-based and session-based buckets:
- **Public booking & availability**: 100 requests / minute / IP
- **Authentication endpoints (`/auth/login`, `/auth/register`)**: 30 requests / minute / IP
- **Authenticated dashboard endpoints**: 120 requests / minute / user session
