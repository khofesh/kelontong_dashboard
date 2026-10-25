# Kelontong Dashboard

A product management dashboard for a small grocery store (_toko kelontong_). Staff can browse, search, filter, create and edit products; admins can also archive and restore them.

- **Backend:** NestJS 11 + Prisma 7 + PostgreSQL 16 (`apps/backend`, port `3001`)
- **Frontend:** Nuxt 3 in SPA mode + Pinia + Zod (`apps/frontend`, port `3000`)
- **Monorepo:** pnpm workspaces

## Setup

### Prerequisites

- Node.js 24
- pnpm 12 (`corepack enable` picks up the version from `packageManager` in `package.json`)
- Docker + Docker Compose (for PostgreSQL)

### Steps

```shell
# 1. install dependencies for every workspace
pnpm install

# 2. create the env file and fill in the JWT secrets
cp .env.example .env

# 3. start PostgreSQL and wait until it is healthy
docker compose up -d --wait db

# 4. apply the database schema
pnpm --filter backend db:migrate:dev

# 5. seed users, categories and 100 products
pnpm db:seed

# 6. run backend and frontend together
pnpm run dev
```

Open http://localhost:3000 and log in with one of the [test accounts](#test-accounts). The frontend proxies `/api/**` to the backend, so the API is also reachable at http://localhost:3001/api/v1 (e.g. `GET /api/v1/health`).

swagger UI: http://localhost:3001/api/docs

Useful database commands:

```shell
docker compose ps
docker compose logs --tail 20 db
```

Adding a package to one workspace:

```shell
pnpm --filter backend add express@^5.2.1
```

## Environment variables

All variables live in a single `.env` at the repository root (`.env.example` is the template). The backend validates them with Zod at startup (`apps/backend/src/config/env.validation.ts`) and refuses to start if something is missing or invalid.

| Variable                | Used by          | Default / example                                                         | Description                                                                      |
| ----------------------- | ---------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POSTGRES_USER`         | docker compose   | `kelontong`                                                               | Database user created by the Postgres container                                  |
| `POSTGRES_PASSWORD`     | docker compose   | `kelontong`                                                               | Database password                                                                |
| `POSTGRES_DB`           | docker compose   | `kelontong`                                                               | Database name                                                                    |
| `POSTGRES_PORT`         | docker compose   | `5432`                                                                    | Host port mapped to Postgres                                                     |
| `DATABASE_URL`          | backend, Prisma  | `postgresql://kelontong:kelontong@localhost:5432/kelontong?schema=public` | **Required.** Connection string for the app, migrations and seeder               |
| `PORT`                  | backend          | `3001`                                                                    | HTTP port of the API                                                             |
| `NODE_ENV`              | backend          | `development`                                                             | `development` \| `test` \| `production`. `development` enables pretty logs       |
| `JWT_ACCESS_SECRET`     | backend          | —                                                                         | **Required**, min. 16 characters. Signs access tokens                            |
| `JWT_ACCESS_TTL`        | backend          | `15m`                                                                     | Access token lifetime (`ms`, `s`, `m`, `h`, `d`)                                 |
| `JWT_REFRESH_SECRET`    | backend          | —                                                                         | **Required**, min. 16 characters, different from the access secret               |
| `JWT_REFRESH_TTL`       | backend          | `7d`                                                                      | Refresh token lifetime                                                           |
| `COOKIE_SECURE`         | backend          | `false`                                                                   | Set to `true` when served over HTTPS                                             |
| `FRONTEND_ORIGIN`       | backend          | `http://localhost:3000`                                                   | Allowed CORS origin(s), comma-separated                                          |
| `NUXT_PUBLIC_API_BASE`  | frontend         | `/api/v1`                                                                 | Base path the browser uses to call the API                                       |
| `NUXT_API_PROXY_TARGET` | frontend         | `http://localhost:3001`                                                   | Where Nuxt proxies `/api/**` to                                                  |
| `API_URL`               | `test:endpoints` | `http://localhost:3001/api/v1`                                            | Optional. Target of the smoke test script (also `ADMIN_EMAIL`, `ADMIN_PASSWORD`) |

Generate secrets with, for example:

```shell
openssl rand -base64 48
```

## Database migration / schema setup

The schema is defined in `apps/backend/prisma/schema.prisma`, and migrations are in `apps/backend/prisma/migrations`.

```shell
# development: apply pending migrations, and create a new one if the schema changed
pnpm --filter backend db:migrate:dev
pnpm --filter backend db:migrate:dev --name add_something   # name a new migration

# CI / production: apply existing migrations only, never generates new ones
pnpm db:migrate

# regenerate the Prisma client after editing schema.prisma
pnpm --filter backend prisma:generate
```

On first start, the Postgres container also creates an empty `kelontong_test` database (`docker/postgres/init.sh`) for running tests in isolation.

## Seeder

```shell
pnpm db:seed
```

The seeder (`apps/backend/prisma/seed.ts`) creates:

- 2 users (one ADMIN, one STAFF), see [test accounts](#test-accounts)
- 8 categories (Snacks, Minuman, Sembako, Bumbu Dapur, ...)
- 100 products with a mix of states: about 10% inactive, 5% archived, and some without an image

It uses a fixed Faker seed and `upsert`, so it is deterministic and safe to run more than once. Running it again resets the two test users' passwords and does not duplicate products.

## Running tests

```shell
# smoke test every API endpoint against a running server (needs `pnpm run dev` + seeded DB)
pnpm --filter backend test:endpoints

# static checks: oxlint for TS/JS and <script> blocks, ESLint (eslint-plugin-vue) for Vue templates
pnpm lint
pnpm lint:fix
pnpm typecheck

# unit tests (Jest in backend)
pnpm test
```

The `test:endpoints` script logs in as the seeded admin, registers fresh users, and runs through auth, categories, product CRUD, archive/restore, and role checks. Register and login are limited to 5 requests per minute per IP, so wait a minute between runs.

> Automated unit and e2e test suites have not been written yet. Jest and Vitest are installed, but there are no spec files, so `pnpm test` currently exits with "No tests found", and `test:e2e` has no config. For now, `test:endpoints` is the way to verify the API. See [Testing gaps](#testing-gaps).

## Test accounts

Created by the seeder:

| Role  | Email                  | Password     | Can do                                                              |
| ----- | ---------------------- | ------------ | ------------------------------------------------------------------- |
| ADMIN | `admin@kelontong.test` | `Admin12345` | Everything, including archive/restore and viewing archived products |
| STAFF | `staff@kelontong.test` | `Staff12345` | List, view, create and edit active products                         |

New accounts made through the register page are always STAFF.

## Project structure

```
.
├── apps/
│   ├── backend/                 NestJS API
│   │   ├── prisma/              schema.prisma, migrations/, seed.ts
│   │   ├── scripts/             test-endpoints.ts (API smoke test)
│   │   ├── src/
│   │   │   ├── main.ts          bootstrap
│   │   │   ├── app.setup.ts     helmet, cookies, CORS, /api/v1 prefix, ValidationPipe
│   │   │   ├── app.module.ts    config, logger, throttler, global guards/filter/interceptor
│   │   │   ├── config/          env validation (Zod)
│   │   │   ├── prisma/          PrismaService
│   │   │   ├── auth/            login, register, refresh, logout, JWT strategy
│   │   │   ├── users/           UsersService + mapper (never exposes passwordHash)
│   │   │   ├── categories/      list categories
│   │   │   ├── products/        controller -> service -> Prisma, DTOs, response mapper
│   │   │   ├── health/          /health (app + DB check)
│   │   │   └── common/          guards, decorators, exception filter, response envelope, pagination
│   │   └── Dockerfile
│   └── frontend/                Nuxt 3 SPA
│       ├── pages/               login, register, products (list, new, [id] detail, [id]/edit)
│       ├── components/          ProductTable, ProductCardList, ProductForm, EmptyState, ErrorState, ...
│       ├── layouts/             app shell (header, user menu, flash messages)
│       ├── middleware/          auth.global.ts (protects every page except login/register)
│       ├── stores/              Pinia: auth, productList
│       ├── composables/         useApi, useProduct, useCategories, useFlash
│       ├── services/            one function per API endpoint
│       ├── utils/               api-client (fetch + token refresh), URL <-> query, formatters
│       └── types/               API types and Zod schemas
├── docker/postgres/init.sh      creates the test database
├── docker-compose.yml           PostgreSQL for local development
├── docs/ARCHITECTURE.md         detailed architecture notes
└── .env.example
```

## Key architecture decisions

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

- **PostgreSQL instead of a document store.** The data is relational. The database enforces unique SKU and email, and the product → category foreign key (`onDelete: Restrict`) prevents deleting a category that is still in use. Prices are stored as integer Rupiah to avoid floating point errors.
- **Modular NestJS backend, one module per domain.** Controllers are thin (read input, call the service), business rules live in services, and explicit mappers decide what goes into a response, so internal fields like `passwordHash`, `deletedAt` or `createdById` never leak.
- **Secure by default.** `JwtAuthGuard` and `RolesGuard` are global: every route needs a login unless marked `@Public()`, and admin-only routes use `@Roles(Role.ADMIN)`. Input is validated with `class-validator` DTOs (`whitelist` + `forbidNonWhitelisted`).
- **Cookie-based auth with refresh token rotation.** Access (15 min) and refresh (7 days) JWTs are stored in `httpOnly` cookies, so JavaScript cannot read them. The refresh cookie is scoped to `/api/v1/auth`, and only an argon2 hash of the refresh token is stored. Passwords are hashed with argon2, and login takes the same time whether the email exists or not.
- **Consistent API contract.** Everything is under `/api/v1`. Success responses are `{ data }` or `{ data, meta }` (pagination), and errors are `{ error: { code, message, details, requestId } }` from a single exception filter.
- **Soft delete.** Archiving sets `deletedAt` instead of deleting the row, so products can be restored and history stays intact. Only admins see or restore archived products.
- **Frontend SPA behind a same-origin proxy.** Nuxt runs with `ssr: false`, which is enough for an internal dashboard. Nuxt proxies `/api/**` to the backend, so cookies stay first-party and no CORS setup is needed in the browser. Data flows one way: page → store/composable → service → api-client. Components never call HTTP directly, and list filters are kept in the URL so they survive reloads and can be shared.
- **Basic observability built in.** `nestjs-pino` writes structured logs with an `X-Request-Id` per request and redacts cookies and authorization headers.
- **Deliberate trade-offs for the time box.** Offset pagination, `ILIKE` search, two hard-coded roles, and no image upload. These are fine for ~100 products. How to scale past that is described in `docs/ARCHITECTURE.md` and under [Production Gaps](#production-gaps) below.

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
