# Milestone B0 — Platform API Foundation

**Status:** IMPLEMENTED & SECURITY-CLOSED (B0.1)  
**Date:** 2026-08-13  
**Worker App:** `apps/platform-api` (`@promotor/platform-api`)  
**Worker Name:** `stiffin-promotor-api`  
**Architecture:** Cloudflare Workers $\rightarrow$ Hono $\rightarrow$ Drizzle ORM (`drizzle-orm/node-postgres`) $\rightarrow$ Cloudflare Hyperdrive $\rightarrow$ Neon PostgreSQL  

---

## 1. Overview

Milestone B0 establishes the canonical backend application foundation for the Promotor Platform. It proves end-to-end runtime, connection pooling, and database roundtrip capability without introducing application domain state or auth tables prematurely.

---

## 2. Infrastructure & Drivers

- **Runtime**: Cloudflare Workers (`stiffin-promotor-api`).
- **HTTP Framework**: Hono.
- **ORM & Driver**: `drizzle-orm` + `pg` (`node-postgres` driver as recommended by Cloudflare for Hyperdrive integration).
- **Hyperdrive Binding**:
  - Binding Name: `HYPERDRIVE`.
  - Config ID: `1cb577ffc7524f4591a89206bb19d535`.
  - Caching Strategy: Query caching **DISABLED** on primary binding to ensure read-after-write consistency for upcoming transactional/auth operations.
  - Connection Pool: Hyperdrive manages native PostgreSQL connection pooling.
- **Neon PostgreSQL Role Architecture (Security Closure B0.1)**:
  - **Migration / Owner Role (`neondb_owner`)**: Reserved exclusively for Drizzle Kit schema migrations and DDL. Never stored in Hyperdrive runtime configuration.
  - **Application Runtime Role (`promotor_runtime`)**: Restricted SQL-created PostgreSQL role with least-privilege access. Used exclusively by Hyperdrive origin connection string. Zero database ownership or DDL privileges.
  - **Credential Rotation**: Any previously exposed owner credentials are rotated and invalidated in Neon. Passwords are never committed to source, docs, or git history.
- **Request-Scoped Connections**:
  - Database client connections use request-scoped `withDb` helper (`Client.connect()` and `Client.end()` per request execution) to prevent stale I/O context errors across Worker invocations.

---

## 3. Health Contracts

### `GET /health`
- **Purpose**: Fast Worker runtime health check.
- **DB Execution**: Zero database queries.
- **HTTP Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "service": "stiffin-promotor-api",
    "timestamp": "2026-08-13T08:00:00.000Z"
  }
  ```
- **Headers**: `Cache-Control: no-store`

### `GET /health/db`
- **Purpose**: Full database roundtrip verification.
- **DB Execution**: Uncached `SELECT NOW() as now` query executed via Drizzle ORM & Hyperdrive.
- **HTTP Response (Success)**: `200 OK`
  ```json
  {
    "status": "ok",
    "db": "connected",
    "service": "stiffin-promotor-api",
    "timestamp": "2026-08-13T08:00:00.000Z",
    "serverTime": "2026-08-13T08:00:00.123Z"
  }
  ```
- **HTTP Response (Failure)**: `503 Service Unavailable`
  ```json
  {
    "status": "error",
    "db": "disconnected",
    "service": "stiffin-promotor-api",
    "timestamp": "2026-08-13T08:00:00.000Z"
  }
  ```
- **Sanitized Server Logging (B0.1)**: Server logs use structured metadata `{ code: 'DB_HEALTH_PROBE_FAILED' }` and NEVER print `err.message`, hostnames, usernames, connection strings, or stack traces.
- **Headers**: `Cache-Control: no-store`

---

## 4. Commands & Scripts

- **Local Dev**: `pnpm dev:api` (`wrangler dev`)
- **Typecheck / Static Gate**: `pnpm typecheck` (`tsc --noEmit`)
- **Lint**: `pnpm lint`
- **Unit Tests**: `pnpm test`
- **Build / Dry-Run Bundle Verification**: `pnpm build:api` (`wrangler deploy --dry-run --outdir dist`)
- **Deploy**: `pnpm deploy:api:cf` (`wrangler deploy`)

---

## 5. Deployment Parity Policy (B0.1)

Production Worker deployments must strictly originate from a clean canonical `master` commit SHA:
- `git status --porcelain` must be EMPTY prior to deployment.
- Deployed SHA must match `git rev-parse HEAD` on `master`.

---

## 6. Explicit B0 Scope Exclusions

Milestone B0 explicitly does **NOT** contain:
- Better Auth tables (`user`, `session`, `account`, `verification`) $\rightarrow$ Deferred to B2.
- Shared Core domain schemas (`organization`, `organization_member`, `contact`, `entitlements`) $\rightarrow$ Deferred to B1.
- PromotorClass / PromotorFlow domain tables (`program`, `enrollment`, `next_action`, `booking`, `referral`) $\rightarrow$ Deferred to B3-B5.
- R2 Storage Buckets / Queues $\rightarrow$ Deferred to B4.
- Wildcard CORS headers $\rightarrow$ Deferred to frontend API integration.
