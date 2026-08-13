# Milestone B0 — Platform API Foundation

**Status:** IMPLEMENTED  
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
- **HTTP Framework**: Hono (`hono/quick`).
- **ORM & Driver**: `drizzle-orm` + `pg` (`node-postgres` driver as recommended by Cloudflare for Hyperdrive integration).
- **Hyperdrive Binding**:
  - Binding Name: `HYPERDRIVE`.
  - Caching Strategy: Query caching **DISABLED** on primary binding to ensure read-after-write consistency for upcoming transactional/auth operations.
  - Connection Pool: Hyperdrive manages native PostgreSQL pooling.
- **Neon PostgreSQL Origin**:
  - Origin Connection: Direct / Unpooled Neon connection string (Neon serverless pooling MUST be disabled for Hyperdrive origins).
  - Credentials: Stored in Hyperdrive configuration origin, never hardcoded in source.
- **Request-Scoped Connections**:
  - Database client connections use request-scoped `withDb` helper (`Client.connect()` and `Client.end()` per request execution) to avoid stale I/O context errors.

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
- **Security Guardrail**: Failure responses NEVER expose raw PostgreSQL errors, hostnames, connection strings, or stack traces. Errors are sanitized and logged server-side only.
- **Headers**: `Cache-Control: no-store`

---

## 4. Commands & Scripts

- **Local Dev**: `pnpm dev:api` (`wrangler dev`)
- **Typecheck**: `pnpm typecheck`
- **Lint**: `pnpm lint`
- **Unit Tests**: `pnpm test`
- **Build / Dry-Run Bundle Verification**: `pnpm build:api` (`wrangler deploy --dry-run --outdir dist`)
- **Deploy**: `pnpm deploy:api:cf` (`wrangler deploy`)

---

## 5. Explicit B0 Scope Exclusions

Milestone B0 explicitly does **NOT** contain:
- Better Auth tables (`user`, `session`, `account`, `verification`) $\rightarrow$ Deferred to B2.
- Shared Core domain schemas (`organization`, `organization_member`, `contact`, `entitlements`) $\rightarrow$ Deferred to B1.
- PromotorClass / PromotorFlow domain tables (`program`, `enrollment`, `next_action`, `booking`, `referral`) $\rightarrow$ Deferred to B3-B5.
- R2 Storage Buckets / Queues $\rightarrow$ Deferred to B4.
- Wildcard CORS headers $\rightarrow$ Deferred to frontend API integration.
