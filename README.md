# kelontong dashboard

## dev on local

run db

```shell
docker compose up -d --wait db
docker compose ps
docker compose logs --tail 20 db
```

migrate db

```shell
pnpm --filter backend db:migrate:dev --name init
```

run dev (backend and frontend)

```shell
pnpm run dev
```

adding a package to backend

```shell
pnpm --filter backend add express@^5.2.1
```

smoke test all endpoints

```shell
pnpm --filter backend test:endpoints
```

## Production Gaps

### Security concerns

- **Seeded credentials.** `prisma/seed.ts` creates `admin@kelontong.test` / `Admin12345`. The seeder must never run against production
- **Open registration.** Anyone can call `POST /auth/register` and get a STAFF account with read/write access to products. Production needs invite-only sign-up, admin approval, or email verification.
- **One session per user.** The user row holds a single `refreshTokenHash`, so logging in on a second device signs the first one out. There is no session list, no "log out everywhere", and no detection of refresh-token reuse (a stolen token used after rotation is not flagged).
- **Stateless access tokens.** The access JWT (15 minutes) stays valid after logout, password change, or role change.
- **Cookie and CSRF settings.** `COOKIE_SECURE` defaults to `false` and must be `true` behind HTTPS. Cookie auth relies only on `SameSite=Lax`; there is no CSRF token, which matters if the frontend and API are ever served from different sites.
- **Helmet CSP disabled.** `contentSecurityPolicy: false` in `app.setup.ts`. The frontend should be served with a strict CSP.
- **Brute-force protection is per instance.** `@nestjs/throttler` keeps counters in memory, so limits reset on restart and are multiplied by the number of replicas. Use a shared store (Redis) and add account lockout / per-email limits, not only per-IP.
- **No password reset or MFA**, and no password breach check.
- **Untrusted image URLs.** `imageUrl` accepts any `http(s)` URL and the browser loads it directly. This leaks viewer IPs to third parties and allows mixed content or tracking pixels. Uploads to our own object storage (or an image proxy) are the safer option.
- **Secrets management.** JWT secrets and the database password come from `.env`. Production should use a secret manager, rotate secrets, and use a least-privilege DB user (the app user should not own the schema or run migrations).
- **Dependency and image scanning** (`pnpm audit`, Dependabot/Renovate, container scanning) is not set up.

### Performance concerns

- **Search uses `ILIKE '%q%'`**, which cannot use a B-tree index and scans the whole table. Add `pg_trgm` with GIN indexes on `name` and `sku`.
- **Offset pagination plus `COUNT(*)` on every list request.** Deep pages and large tables get slower linearly. Move to keyset (cursor) pagination, or cache/approximate the total.
- **Single-column indexes only.** The common query shape (`deletedAt IS NULL` + `categoryId` + sort by `createdAt`/`price` + `id`) needs composite / partial indexes.
- **No connection pooling strategy.** Each instance opens its own `pg` pool with default size. With several replicas, put PgBouncer (or a managed pooler) in front of PostgreSQL and tune the pool size.
- **argon2 is CPU-heavy.** Login, register and every refresh run argon2 (refresh tokens are hashed with argon2 too). Under load this saturates the libuv thread pool; consider a cheaper SHA-256 hash for refresh tokens and tune `UV_THREADPOOL_SIZE`.
- **No caching.** Categories rarely change but are fetched from the DB on every request. No HTTP cache headers, no Redis.
- **No response compression** in the API, and frontend static assets need a CDN with long-lived cache headers.
- **No load testing** has been done, so there are no baseline numbers for latency or throughput.

### Logging / observability

- **Logs only.** `nestjs-pino` writes structured JSON logs with a request ID and redacts cookies/authorization, but logs go to stdout with no shipping, retention, or search (Loki, ELK, CloudWatch, etc.).
- **No metrics.** No Prometheus/OpenTelemetry metrics for request rate, latency, error rate, DB pool usage, or event-loop lag, and no dashboards or alerts.
- **No distributed tracing.** The request ID is not propagated as a trace context, and Prisma queries are not traced, so slow-query analysis is hard.
- **No error tracking** (Sentry or similar) on either the backend or the Nuxt frontend. Frontend errors are invisible to us.
- **No audit trail.** Products store `createdById` / `updatedById`, but there is no history of _what_ changed, who archived/restored a product, or who logged in. An append-only audit log table is needed for a stock-related system.
- **Health check is a single endpoint.** `/health` mixes liveness and readiness (it checks the DB). If the DB has a blip, an orchestrator would restart healthy pods. Split into `/health/live` and `/health/ready`.

### Deployment considerations

- **Backend Dockerfile is not production-lean.** The `prod` stage copies the whole build stage, including dev dependencies and source. Use `pnpm deploy --prod` (or prune) for a smaller image, run as a non-root user, and add a `HEALTHCHECK`.
- **pnpm version mismatch.** The Dockerfile activates `pnpm@11.1.2` while `package.json` declares `packageManager: pnpm@12.15.0`; builds can diverge from local development.
- **No frontend deployment.** There is no Dockerfile or hosting setup for the Nuxt SPA. In dev, `/api` is proxied by Nuxt's `routeRules`; in production a reverse proxy / CDN (Nginx, Caddy, Cloudflare) must serve the static build and route `/api/v1` to the backend so cookies stay same-origin.
- **No graceful shutdown.** `app.enableShutdownHooks()` is not called, so in-flight requests and DB connections are not drained on `SIGTERM` during rolling deploys.
- **Migrations are manual.** `prisma migrate deploy` needs to run as a separate release step (a CI job or init container) before new pods start, never from every replica at boot.
- **No CI/CD pipeline.** Lint, typecheck, tests, image build, and deploy are not automated. There are also no separate staging / production environments.
- **`docker-compose.yml` is for development only** (default credentials, DB port exposed to the host). Production should use a managed PostgreSQL with automated backups, point-in-time recovery, and TLS.
- **Single region, single instance assumptions.** In-memory rate limiting and no shared cache mean horizontal scaling needs Redis first.

### Testing gaps

- **No unit tests.** Jest is configured in `apps/backend`, but there are no `*.spec.ts` files. Business rules in `ProductsService` (role checks for archived products, soft delete/restore, SKU conflicts) and `AuthService` (rotation, invalid tokens) are untested.
- **No e2e tests.** `pnpm test:e2e` points to `test/jest-e2e.json`, which does not exist. The only API check is the `test:endpoints` smoke script, which needs a running server and seeded DB and is not wired into CI.
- **No frontend tests.** `vitest`, `@vue/test-utils` and `happy-dom` are installed, but there are no tests and no `test` script for components, stores, `api-client` refresh logic, or `product-query` URL parsing.
- **No browser E2E tests** (Playwright/Cypress) for the main flows: login, product list filters, create/edit, archive/restore.
- **No coverage thresholds, contract tests** (API vs. frontend types), **load tests, or security tests** (OWASP ZAP, auth bypass cases).

### Data migration concerns

- **Only one `init` migration exists.** Future schema changes on a live table need the expand/contract pattern (add nullable column → backfill → switch code → add constraint → drop old column) to avoid downtime and locks. Large index builds should use `CREATE INDEX CONCURRENTLY` (a hand-edited migration, since Prisma does not generate it).
- **No rollback plan.** Prisma migrations are forward-only. Each risky migration needs a tested down-script or a restore plan, and a backup must be taken before running it.
- **Seed data is fake.** The seeder uses Faker and upserts test users; there is no import path for a store's real catalogue (CSV/Excel import with validation, duplicate SKU handling, and a dry-run mode).
- **Soft delete and unique SKU.** `sku` is globally unique, including archived products, so an archived SKU cannot be reused. Decide whether that is the intended rule, or change it to a partial unique index `WHERE "deletedAt" IS NULL`.
- **Stock is a plain number.** Moving to a stock ledger (in/out movements) later will require a migration that turns the current `stock` value into an opening-balance entry per product.
- **Timestamps have no time zone.** Prisma maps `DateTime` to `timestamp(3)` without time zone. All values are written in UTC, which must stay consistent across services and reporting tools; switching to `timestamptz` later is a migration on every table.
- **Money as integer Rupiah** is fine for now, but supporting other currencies or decimal prices would require a data migration of every price column.
