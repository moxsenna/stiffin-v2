# Promotor Platform — Cloudflare Frontend Deployment Baseline (D0)

**Date:** 2026-08-12  
**Status:** Deployed & Verified  
**Milestone:** D0 — Cloudflare Frontend Deployment Baseline  
**Target Platform:** Cloudflare Workers  
**Adapter:** `@opennextjs/cloudflare`  

---

## 1. Deployment Topology & Account Identity

- **Active Cloudflare Account:** `Moxsenna@gmail.com's Account` (`06738739e65bc88a495de618cabfa5ca`)
- **Architecture:** Two independent Cloudflare Workers running OpenNext/Next.js serverless functions.
- **No Backend Infrastructure:** D0 contains **no** Neon, Hyperdrive, D1, R2 cache, Queues, or Better Auth secrets.

```text
               PROMOTOR PLATFORM DEPLOYMENT
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    stiffin-promotor-class          stiffin-promotor-flow
   (Cloudflare Worker)             (Cloudflare Worker)
```

---

## 2. Worker Deployment Details

### PromotorClass Web App (`apps/promotor-class-web`)
- **Worker Name:** `stiffin-promotor-class`
- **Live Worker URL:** `https://stiffin-promotor-class.moxsenna.workers.dev`
- **Total Upload Size:** `3551.05 KiB`
- **Gzip / Compressed Size:** `726.22 KiB` (~0.71 MiB)
- **Workers Free Limit Check (<= 3 MiB):** **PASS** ✅

### PromotorFlow Web App (`apps/promotor-flow-web`)
- **Worker Name:** `stiffin-promotor-flow`
- **Live Worker URL:** `https://stiffin-promotor-flow.moxsenna.workers.dev`
- **Total Upload Size:** `3327.71 KiB`
- **Gzip / Compressed Size:** `699.57 KiB` (~0.68 MiB)
- **Workers Free Limit Check (<= 3 MiB):** **PASS** ✅

---

## 3. Package & CLI Commands

### Root Workspace Commands
```bash
# Preview Cloudflare Workers locally
pnpm preview:class:cf
pnpm preview:flow:cf

# Deploy Cloudflare Workers remotely
pnpm deploy:class:cf
pnpm deploy:flow:cf
```

### Application Package Scripts
Each app (`apps/promotor-class-web` and `apps/promotor-flow-web`) provides:
```json
"preview:cf": "opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion && opennextjs-cloudflare preview",
"deploy:cf": "opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion && opennextjs-cloudflare deploy",
"upload:cf": "opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion && opennextjs-cloudflare deploy",
"cf:typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
```

---

## 4. Configuration & Environment Variables

### Worker Environment Variables
- `NEXT_PRIVATE_MINIMAL_MODE=1` in `wrangler.jsonc` (enables OpenNext Workers compatibility mode).

### Wrangler Configuration Schema
Each application uses its own `wrangler.jsonc` with explicit pinned compatibility settings:
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "stiffin-promotor-class",
  "compatibility_date": "2026-08-12",
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "stiffin-promotor-class"
    }
  ],
  "vars": {
    "NEXT_PRIVATE_MINIMAL_MODE": "1"
  }
}
```

### Static Asset Caching (`public/_headers`)
```text
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable
```

---

## 5. Verified Canonical QA Routes

### PromotorClass Live Worker QA (`https://stiffin-promotor-class.moxsenna.workers.dev`)
- `GET /p/rina/7-hari-mengenal-cara-belajar-anak` → `HTTP 200 OK` (Public Landing)
- `GET /learn` → `HTTP 200 OK` (Learner Home)
- `GET /learn/programs/enr_ayu_7hari` → `HTTP 200 OK` (Learner Program)
- `GET /app` → `HTTP 200 OK` (Promotor OS)
- `GET /app/programs/prog_7_hari_belajar` → `HTTP 200 OK` (Promotor Program Detail)

### PromotorFlow Live Worker QA (`https://stiffin-promotor-flow.moxsenna.workers.dev`)
- `GET /` → `HTTP 307 Redirect` to `/app`
- `GET /app` → `HTTP 200 OK` (Today View)
- `GET /app/contacts` → `HTTP 200 OK` (Contacts List)
- `GET /app/contacts/contact_ayu` → `HTTP 200 OK` (Contact Detail)
- `GET /app/calendar` → `HTTP 200 OK` (Calendar View)

---

## 6. Known Mock & Persistence Limitations

- **Browser localStorage Persistence Boundary**: Newly generated enrollment IDs during public registration are saved in local `localStorage`. Direct refresh works in the same browser session. Opening the exact enrollment URL in a new isolated browser context without backend sync will fallback to seed/mock state until Milestone B0 (Backend Foundation).

---

## 7. Status of Legacy Cloudflare Pages Deployment

- **URL:** `promotor-class.pages.dev`
- **Status:** `LEGACY DEMO — SUPERSEDED BY WORKER`
- **Action:** Retained temporarily for historical reference. Production traffic directed exclusively to `stiffin-promotor-class.moxsenna.workers.dev`.

---

## 8. Rollback & Custom Domain Procedures

### Rollback Procedure
```bash
# List deployment history
npx wrangler deployments list

# Rollback to a specific deployment version ID
npx wrangler rollback <VERSION_ID>
```

### Future Custom Domain Setup
When custom domains are configured:
```json
"routes": [
  { "pattern": "class.stiffin.com/*", "custom_domain": true },
  { "pattern": "flow.stiffin.com/*", "custom_domain": true }
]
```

---

## 9. Next Milestone Checkpoint
- PromotorClass Worker: ✅ Deployed & Verified
- PromotorFlow Worker: ✅ Deployed & Verified
- Free-tier Bundle Check: ✅ Both < 1 MiB compressed (< 3 MiB limit)
- Documentation: ✅ Published (`docs/deployment/CLOUDFLARE_FRONTEND.md`)
- Next Step: `Milestone B0 — Backend Foundation`
