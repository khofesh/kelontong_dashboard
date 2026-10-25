# Architecture Notes — Kelontong Dashboard

Monorepo pnpm with 2 applications:

```
apps/
  backend/   NestJS 11 + Prisma 7 + PostgreSQL 16
  frontend/  Nuxt 3 (mode SPA) + Pinia + Zod, CSS
docker-compose.yml   PostgreSQL for development
```

---

## 1. Mengapa PostgreSQL (bukan MongoDB)

- the data is relational. postgresql enforces unique SKU and email, and the product -> category foreign key blocks deleting a category that's in use.
- Harga is stored as `Int` (rupiah and without desimal) to avoid floating point problem
- `pg_trgm`, partial index, read replica, already available without changing a database

---

## 2. Struktur backend (NestJS)

one module per domain

```
src/
  main.ts, app.setup.ts      bootstrap: helmet, cookie-parser, CORS, prefix /api/v1, ValidationPipe
  app.module.ts              wiring global: config, logger, throttler, guard, filter, interceptor
  config/env.validation.ts   env divalidasi dengan Zod saat start (gagal cepat kalau salah konfigurasi)
  prisma/                    PrismaService (global)
  auth/                      controller, service, JwtStrategy, DTO login/register
  users/                     UsersService + mapper (tidak pernah mengekspos passwordHash)
  categories/                list kategori
  products/                  controller -> service -> Prisma, DTO, mapper ke response
  health/                    /health (cek koneksi DB)
  common/
    guards/                  JwtAuthGuard (global), RolesGuard (global)
    decorators/              @Public(), @Roles(), @CurrentUser()
    filters/                 AllExceptionsFilter -> format error seragam
    interceptors/            ResponseEnvelopeInterceptor -> { data } / { data, meta }
    pipes/                   flatten error class-validator -> details[]
    dto/                     PaginationQueryDto + buildPaginationMeta
```

- thin controller. controller hanya membaca param/body/user dan memanggil service. business rules are in service.
- validation via DTO `class-validator`
- explicit mapper. `toProductResponse()` shapes the response json, so it won't leak `deletedAt`, `createdById`
- basic observability. `nestjs-pino` withn request ID (`X-Request-Id`) and cookie/authorization redacted from the log

---

## 3. Struktur frontend (Nuxt 3)

```
app.vue, layouts/default.vue  shell: header (user, role, logout) + flash message
middleware/auth.global.ts      melindungi semua halaman kecuali /login dan /register
pages/
  login.vue, register.vue
  products/index.vue           list: search, filter, sort, paginasi
  products/new.vue
  products/[id]/index.vue      detail + aktif/nonaktif + arsip/pulihkan
  products/[id]/edit.vue
components/                    ProductTable, ProductCardList (mobile), ProductForm, ProductImage,
                               ProductStatusBadge, ListPagination, EmptyState, ErrorState
services/                      productService, authService, categoryService (satu fungsi per endpoint)
stores/                        Pinia: auth (user/session), productList (query, hasil, loading, error)
composables/                   useApi, useCategories, useProduct, useFlash
utils/                         api-client (HTTP + refresh token), product-query (URL ↔ query),
                               form-errors, formatters
types/                         tipe API + schema Zod (dipakai untuk validasi form)
assets/css/main.css            satu stylesheet, tanpa UI framework
```

Alur data: **page -> store/composable -> service -> api-client -> `/api/v1`**. Komponen tidak pernah
memanggil HTTP langsung.

## 4. API contract

Base path `/api/v1` (versi di URL supaya perubahan breaking bisa hidup berdampingan).

| Method | Path                    | Auth           | Keterangan                               |
| ------ | ----------------------- | -------------- | ---------------------------------------- |
| POST   | `/auth/register`        | public         | buat akun STAFF + set cookie sesi        |
| POST   | `/auth/login`           | public         | set cookie session                       |
| POST   | `/auth/refresh`         | cookie refresh | rotate access + refresh token            |
| POST   | `/auth/logout`          | public         | remove refresh token, delete cookie      |
| GET    | `/auth/me`              | login          | current user                             |
| GET    | `/categories`           | login          | all categories without pagination        |
| GET    | `/products`             | login          | list dengan query di bawah               |
| GET    | `/products/:id`         | login          | detail                                   |
| POST   | `/products`             | login          | create                                   |
| PATCH  | `/products/:id`         | login          | partial update                           |
| DELETE | `/products/:id`         | ADMIN          | soft delete (archive), `204`, idempotent |
| POST   | `/products/:id/restore` | ADMIN          | unarchive                                |
| GET    | `/health`               | public         | status app + DB                          |

**Query list:** `page`, `pageSize` (maks 100), `q` (nama atau SKU, case-insensitive),
`categoryId`, `isActive`, `archived=exclude|only|include`, `sortBy=name|price|stock|createdAt|updatedAt`,
`sortOrder=asc|desc`. Sort selalu ditambah `id` sebagai tie-breaker supaya urutan antarhalaman stabil.

**Bentuk response** selalu sama:

```jsonc
// sukses
{ "data": { ... } }
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "totalItems": 95, "totalPages": 5 } }

// error
{ "error": { "code": "VALIDATION_FAILED", "message": "...",
             "details": [{ "field": "sku", "message": "..." }], "requestId": "..." } }
```

---

## 5. Trade-off karena batas waktu

- **Offset pagination** (`skip/take` + `COUNT`)
- **Search memakai `ILIKE '%q%'`** (`contains` Prisma).
- **Role hanya dua (`ADMIN`, `STAFF`) dan di-hardcode di enum.**
- **no tests**
- **Frontend SPA.**

---

## 6. from 100 to 100.000 products

100.000 products is still small for PostgreSQL. we need to change the query, not the database

1. **Search yang ter-index.** activate `pg_trgm` and create GIN trigram index on `name` and `sku`,
2. **Index yang sesuai pola query.** composite index for frequent combination,
   for example `(categoryId, createdAt DESC, id) WHERE deletedAt IS NULL`
3. **Pagination.**
4. **Infrastruktur.** Connection pooling (PgBouncer), read replica for query list,
   cache HTTP/Redis for data that rarely changes like "kategori", and stateless

Let's say we want to scale to millions of products and users

---

## 7. Menambahkan role-based access control

- Enum `Role { ADMIN, STAFF }` is already in table `User`, and role is included in JWT.
- `RolesGuard` global + decorator `@Roles(Role.ADMIN)` in controller.
  menjadi otoritas.

---

## 8. Menambahkan audit logging

- structured logging using pino is already there
- other logging such as splunk could be added later.

---

## 9. Yang sengaja tidak di-build, dan alasannya

| Tidak di-build                            | Alasan                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Upload gambar / object storage            | Butuh storage, validasi file, dan resize. we could use minio or localstack to emulate S3 storage.   |
| CRUD kategori                             | out of scope and rarely changes                                                                     |
| Manajemen user / ubah role dari UI        | not requested. Role cukup dari seeder (admin) + register (staff).                                   |
| Lupa password, verifikasi email           | Butuh infrastruktur email.                                                                          |
| Stok sebagai ledger (mutasi masuk/keluar) | Stok disimpan sebagai angka biasa. Ledger relevan jika ada transaksi penjualan, yang di luar scope. |
| Hard delete                               | Sengaja soft delete (`deletedAt`) supaya data bisa dipulihkan dan referensi historis tetap utuh.    |
| SSR di frontend                           | SPA is enough. could be set to SSR later when needed                                                |
| Optimistic locking / detect conflicts     | not needed for now. for production yes. Kalau dibutuhkan, tambahkan `version` + `If-Match`.         |
| Search engine terpisah, caching, queue    | Prematur untuk 100 produk.                                                                          |
| i18n                                      | next iteration. out scope for now                                                                   |
