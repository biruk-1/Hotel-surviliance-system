# Hotel Surveillance API — Backend Documentation

This document describes everything implemented in the **Node.js + Express + PostgreSQL** backend: folder layout, what each file does, and how the main features fit together.

---

## Quick start

1. Copy `.env.example` to `.env` and set database credentials, `JWT_SECRET`, and `PORT` (default `5000` if omitted).
2. Run SQL: `sql/schema.sql` on a fresh database, then run any `sql/migrations/*.sql` your database still needs (in order).
3. From the `backend` folder: `npm install` then `npm start`.
4. Base URL: `http://localhost:<PORT>/api` (example: `http://localhost:5001/api`).

---

## High-level architecture

| Layer | Role |
|--------|------|
| **`src/server.js`** | Starts HTTP server, loads config first, graceful shutdown, closes DB pool. |
| **`src/app.js`** | Express app: JSON body parser, mounts `/api` routes, 404, global error handler. |
| **`src/config/`** | Environment variables, DB + JWT settings. Fails fast if required vars are missing. |
| **`src/config/database.js`** | PostgreSQL **connection pool** (`pg`), `query()`, health check, pool close. |
| **`src/modules/*`** | Feature modules: routes → controllers → DB (one area per folder: auth, guests, stays, etc.). |
| **`src/middlewares/`** | Auth (JWT), RBAC, validation, uploads, errors. |
| **`src/services/`** | Reusable logic: blacklist matching, alerts, guest blacklist check after creation. |
| **`src/utils/`** | Helpers: logger, HTTP errors, hotel access checks, audit logging. |
| **`sql/`** | Schema and migrations for PostgreSQL. |
| **`uploads/documents/`** | Local file storage for ID documents (created on first upload; listed in `.gitignore`). |

---

## File-by-file reference (`src/`)

### Entry & app shell

| File | Purpose |
|------|---------|
| **`server.js`** | `require('./config')`, creates `http.Server` from `app`, listens on `config.port`, handles `SIGTERM`/`SIGINT` and closes DB pool. |
| **`app.js`** | `express.json`, mounts `require('./modules')` at `/api`, then not-found middleware, then error middleware. |

### Config & database

| File | Purpose |
|------|---------|
| **`config/index.js`** | Loads `.env` from `backend/.env`, validates `DB_*` and `JWT_SECRET`, exports `port`, `db`, `auth` (JWT secret + expiry). |
| **`config/database.js`** | `Pool` from `pg`, `query()`, `healthCheck()`, `closePool()`, logs idle client errors. |

### Middlewares

| File | Purpose |
|------|---------|
| **`auth.middleware.js`** | Reads `Authorization: Bearer <token>`, verifies JWT, sets `req.user` (`id`, `email`, `role`). |
| **`rbac.middleware.js`** | `authorizeRoles(...roles)` — must be used after `authenticate`. `requireHotelAccess('hotelId')` — police/admin any hotel; `hotel` role only if row exists in `hotel_users`. |
| **`validate.middleware.js`** | Runs `express-validator` `validationResult` and returns **400** with details if invalid. |
| **`upload.middleware.js`** | **Multer** disk storage under `uploads/documents/`, image/PDF only, 5 MB max, exports `uploadDocumentSingle` (`single('file')`). |
| **`error.middleware.js`** | Maps errors to JSON; handles **Multer** size errors (**413**), uses `HttpError.statusCode`, hides stack in production. |
| **`notFound.middleware.js`** | **404** for unknown routes. |

### Utilities

| File | Purpose |
|------|---------|
| **`utils/logger.js`** | Timestamped `info` / `error` logs (skips info noise in `test`). |
| **`utils/httpError.js`** | `HttpError(statusCode, message)` for consistent API errors. |
| **`utils/asyncHandler.js`** | Wraps async route handlers so rejected promises call `next(err)`. |
| **`utils/hotelAccess.js`** | `userCanAccessHotel`, `assertHotelAccess` — shared rules for hotel-scoped actions. |
| **`utils/auditLog.js`** | `writeAuditLog` → `audit_logs` table (never throws); constants for actions/entity types. |

### Services

| File | Purpose |
|------|---------|
| **`services/matching.service.js`** | Scores a guest vs blacklist rows: ID **100%**, name+DOB **90%**, fuzzy name **60%**. |
| **`services/alert.service.js`** | Inserts **critical** alert for blacklist match; writes audit log for alert creation. |
| **`services/guestBlacklistCheck.service.js`** | After guest+stay is created, loads blacklist for hotel, runs matching; if score **> 70**, creates alert. |

### Modules (features)

#### Health

| File | Purpose |
|------|---------|
| **`modules/health/health.routes.js`** | `GET /` → health controller. |
| **`modules/health/health.controller.js`** | `GET /api/health` — DB ping; **503** if DB unreachable. |

#### Auth

| File | Purpose |
|------|---------|
| **`modules/auth/auth.routes.js`** | `POST /register`, `POST /login`. |
| **`modules/auth/auth.controller.js`** | Register (bcrypt hash), login (compare + JWT). **Audit:** successful **login**. |
| **`modules/auth/auth.validation.js`** | Email, password length, `fullName`, `role` (`hotel` \| `police` \| `admin`). |

#### Guests

| File | Purpose |
|------|---------|
| **`modules/guests/guests.routes.js`** | `POST /`, `GET /`, `GET /:id` — all require auth + roles `hotel`, `police`, `admin`. |
| **`modules/guests/guests.controller.js`** | **POST:** transaction — insert **guest** + **stay**, then **audit** (`guest_created`), then **blacklist check** (may create alert). **GET list:** police/admin see all or filter `?hotelId=`; hotel users only guests linked via stays to their hotels. **GET :id** — guest + stays (filtered for hotel role). |
| **`modules/guests/guests.validation.js`** | Guest create fields including optional `dateOfBirth` for matching. |

#### Stays

| File | Purpose |
|------|---------|
| **`modules/stays/stays.routes.js`** | `POST /` — create stay for existing guest. |
| **`modules/stays/stays.controller.js`** | Inserts stay with `created_by_user_id`; enforces `assertHotelAccess` for `hotelId`. |
| **`modules/stays/stays.validation.js`** | `guestId`, `hotelId`, `checkIn`, optional `checkOut`, `roomNumber`, `status`. |

#### Alerts

| File | Purpose |
|------|---------|
| **`modules/alerts/alerts.routes.js`** | `GET /`, `PATCH /:id`. |
| **`modules/alerts/alerts.controller.js`** | **GET:** police/admin all; hotel users only alerts for their hotels (via `hotel_users`). **PATCH:** sets `acknowledged_at` (mark reviewed) if user may access that alert’s hotel. |
| **`modules/alerts/alerts.validation.js`** | `id` UUID param for PATCH. |

#### Blacklist (two route groups)

| File | Purpose |
|------|---------|
| **`modules/blacklist/blacklist.top.routes.js`** | `GET /api/blacklist`, `POST /api/blacklist` — police (POST); police+admin (GET). |
| **`modules/blacklist/blacklist.hotel.routes.js`** | Nested under `/api/hotels/:hotelId/blacklist` — list, create, delete by id. |
| **`modules/blacklist/blacklist.controller.js`** | CRUD-style list/create/delete; **audit** on create. |
| **`modules/blacklist/blacklist.validation.js`** | Create body: `name`, `idNumber`, `dateOfBirth`, `reason`, optional top-level `hotelId`. |

#### Hotels (nested)

| File | Purpose |
|------|---------|
| **`modules/hotels/hotels.routes.js`** | `GET /:hotelId/alerts`, mounts blacklist sub-router at `/:hotelId/blacklist`. |

#### Documents

| File | Purpose |
|------|---------|
| **`modules/documents/documents.routes.js`** | `POST /` — multipart upload. |
| **`modules/documents/documents.controller.js`** | Verifies stay exists, `assertHotelAccess` for stay’s hotel, inserts `documents` row, stores relative path `uploads/documents/...`. Deletes file on failure. |
| **`modules/documents/documents.validation.js`** | `stayId` UUID, optional `title`. |

#### Router index

| File | Purpose |
|------|---------|
| **`modules/index.js`** | Mounts: `/health`, `/auth`, `/guests`, `/stays`, `/alerts`, `/blacklist`, `/hotels`, `/documents`. |

---

## Cross-cutting behaviour

### Security & RBAC

- Passwords are **never** stored plain (bcrypt).
- **JWT** required for protected routes (`Authorization: Bearer …`).
- **Hotel** staff are tied to hotels via **`hotel_users`**; many operations check membership.
- **Police** often has broader read/create on blacklist and global lists; **admin** similar for reads where implemented.

### Blacklist matching (on new guest + stay)

1. After commit, service loads **all blacklist** rows (global check; legacy rows may still have `hotel_id` set).
2. **Matching** computes best score per row; if **> 70**, an **alert** is inserted and **audit** logs `alert_created`.

### Audit logging

Successful **login**, **guest_created**, **blacklist_created**, **alert_created** → rows in **`audit_logs`** (`actor_user_id`, `action`, `entity_type`, `entity_id`, optional `hotel_id`, `metadata`, `ip_address`).

### Database schema (summary)

Key tables: `users`, `hotels`, `hotel_users`, `guests` (incl. optional `date_of_birth`), `stays` (incl. `created_by_user_id`), `documents`, `blacklist` (global entries use `hotel_id` NULL; unique `id_number`), `alerts`, `audit_logs`. See `sql/schema.sql` and migrations (`005_blacklist_global.sql` upgrades older DBs) for exact columns and triggers.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Run `node src/server.js`. |
| `npm run dev` | `node --watch src/server.js` (Node 18+). |

---

## Related docs

- **`API.md`** — endpoint reference, bodies, query params, roles, and HTTP codes for Postman testing.
- **`apis.json`** — Postman Collection v2.1: **Import → File** in Postman. Set variables `baseUrl` and `accessToken` (and replace UUID placeholders with real ids from your DB).
- **`scripts/generate-postman-collection.js`** — Regenerates `apis.json` if you change routes and want to update the collection (`node scripts/generate-postman-collection.js` from `backend/`).
