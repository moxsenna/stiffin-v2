# Milestone B6 — PromotorFlow Domain Plan

**Status:** PLAN ACCEPTED / FROZEN — REVISION R2.3 (final consistency closure: master SHA corrected, all predecessor milestones B0/B1/B2/B3 confirmed FINAL ACCEPTED / FROZEN, migration sequence serialized as 0003, activities append-only least privilege locked at SELECT+INSERT yielding 94 total capabilities, API versioned at `/api/v1/flow/*`, additive Flow transport DTOs in `@promotor/contracts` permitted with baseline re-hash, active tenant contact verification enforced on all getOrCreate/parent seams, aftercare outcome decoupled from WhatsApp send). **Awaiting human review and explicit B6 implementation GO**. B6 is NOT implemented.
**Date:** 2026-08-16
**Base:** canonical master @ `57d26b737636055d6d9a3551e84ba7267ed89e80` (B0 Platform Foundation, B1 Shared Core, B2 Auth & Authorization, and B3 PromotorClass Content are all FINAL ACCEPTED / FROZEN; canonical migrations `0000`, `0001`, `0002` present on master)
**Scope:** Plan + domain design ONLY. No code, no migration, no grants, no routes, nothing deployed.
**Dependencies (semantic):** B0, B1, B2, and B3 milestones are ALL canonical/frozen on master. Migration numbering for B6 is serialized as `0003` (following canonical `0000_fluffy_prowler`, `0001_shocking_black_widow`, `0002_heavy_scarlet_witch`). Privilege arithmetic: B1 (20) + B2 (20) + B3 (24) + B6 (30) = **94** runtime capabilities (with `activities` append-only: `UPDATE`/`DELETE` denied, and `CREATE` denied on schema `public`). B6 implementation remains gated solely on an explicit human `B6 IMPLEMENTATION GO`.

**Revision R2.3 — Final consistency closure (review verdict: HOLD, plan closure only):**

| # | Finding | Resolution |
|---|---|---|
| R2.3-1 | Canonical master SHA typo in report | **Corrected**: Exact canonical master SHA is `57d26b737636055d6d9a3551e84ba7267ed89e80` |
| R2.3-2 | Stale predecessor dependency wording | **Removed**: All mentions of pending B2/B3 dependencies replaced with B0/B1/B2/B3 FINAL ACCEPTED / FROZEN; only remaining gate = explicit human B6 IMPLEMENTATION GO (§0, §1.1, §12, §17) |
| R2.3-3 | Activities append-only vs DB grants mismatch | **Enforced Option A**: `activities` table gets `GRANT SELECT, INSERT` only (true database-level append-only least privilege; `UPDATE`/`DELETE` denied); B6 contributes 7×4 + 1×2 = 30 capabilities; total runtime checks = 20 + 20 + 24 + 30 = **94 / 94** (§14.2 #22, §14.3, §15, §17, §19) |
| R2.3-4 | Migration reproduction test omitted B3 | **Updated**: Full canonical chain tested: blank → `0000` (B1) → `0001` (B2) → `0002` (B3) → `0003` (B6); `0003` also tested over seeded canonical B1+B2+B3 data (§14.2 #23, §16) |
| R2.3-5 | Contracts package ownership contradiction | **Resolved**: B6 MUST NOT mutate/break existing frozen Shared Core/Class contracts; B6 MAY add additive, backward-compatible Flow HTTP transport DTOs/Zod schemas to `@promotor/contracts`; contracts baseline hash guardrail is deliberately re-baselined (§1.1, §14.1, §17, §19) |
| R2.3-6 | Flow API routes unversioned | **Frozen namespace**: All Flow endpoints moved to `/api/v1/flow/*` (e.g. `/api/v1/flow/today`, `/api/v1/flow/contacts`, `/api/v1/flow/next-actions`, `/api/v1/flow/bookings`, etc.) to prevent semantic collisions with Shared Core contacts (§12, §17) |
| R2.3-7 | Cross-tenant parent validation seam implicit | **Locked fail-closed**: `getOrCreate` in `ContactFlowRepository` and `AssessmentRepository` and all parent-linking operations MUST verify active tenant contact ownership (`contacts.id = $id AND contacts.organization_id = $orgId AND contacts.deleted_at IS NULL`) before mutation; invalid/mismatched org fails closed with `NOT_FOUND` (§4, §5.1, §10, §14.2 #42) |
| R2.3-8 | Aftercare outcome vs WhatsApp send ambiguity | **Clarified**: Recording an aftercare outcome NEVER fabricates `WHATSAPP_SENT`; WhatsApp send remains an explicit human-confirmed step (`WHATSAPP_OPENED` → operator confirmation → `WHATSAPP_SENT`); outcome completion records `AFTERCARE_COMPLETED` (§5.5, §8.5, §9, §18 D3) |

**Revision R2.2 — Post-B3 master synchronization:**

| # | Finding | Resolution |
|---|---|---|
| R2.2-1 | Predecessor milestones B2 and B3 merged to master | **Updated**: Dependency state updated to B1, B2, B3 FINAL ACCEPTED / FROZEN on master (§0, §1.1) |
| R2.2-2 | Canonical migration history now owns 0000, 0001, 0002 | **Serialized**: B6 migration entry explicitly serialized as `0003` (§16, §17) |
| R2.2-3 | Grant arithmetic updated for post-B3 master | **Updated**: B1 (20) + B2 (20) + B3 (24) + B6 (32) = **96 / 96** runtime CRUD capabilities (superseded by R2.3-3 append-only 94) |

**Revision R1 — HOLD resolutions (review verdict):**

| # | Finding | Resolution |
|---|---|---|
| P0-1 | Booking amount snapshot removed | **Restored**: `bookings.amount INTEGER NOT NULL CHECK (amount >= 0)` — booking-time price snapshot (§2.2, §7) |
| P0-2 | Aftercare dedicated persistence lost | **Restored**: `aftercare_records` table, `UNIQUE (organization_id, booking_id)` (§2.5) |
| P0-3 | Assessment persistence ambiguous | **Restored**: `contact_assessments` canonical current record, `UNIQUE (organization_id, contact_id)`, deterministic sync precedence (§2.6) |
| P0-4 | Message templates deferred | **In B6**: `message_templates` table (storage ≠ auto-send) (§2.7) |
| P0-5 | Strict lifecycle state machine invented | **Reverted to operator-directed lifecycle** (§6) |
| P0-6 | Skip no longer required a next step | **Preserved**: `skipAction` requires `nextStep`, created atomically (§5.4, §8.2) |
| P0-7 | "One transaction" composition unspecified | **Defined**: tx-scoped repo factories; two-phase contact onboarding (§5.0) |
| P0-8 | Booking completion concurrency weak | **Defined**: `SELECT … FOR UPDATE` protocol + true concurrent test (§7, §14.2 #13) |
| P0-9 | Activity catalog inconsistent with emits | **Rebuilt**: one final taxonomy, every emit accepted + deterministic projection (§2.9, §14.2 #24) |
| P0-10 | Grant/test arithmetic wrong | **Fixed**: 8 B6 tables × 4 = 32; total 20 (B1) + 20 (B2) + 32 (B6) = **72** (§15, §19) |
| P1-1 | Derived classification silent | **Explicit decision item** D1, flagged for approval (§2.8, §18) |
| P1-2 | `interest`, `result_type`, `deposit_amount` without evidence | **Removed** from schema (§2.1, §2.8) |
| P1-3 | HTTP routes pushed to B7 | **B6 owns the Flow API**; route layer serialized behind B2 FINAL ACCEPTED (§0, §12, §17) |
| P1-4 | Availability deferred without canonical milestone | **OPEN PRODUCT DECISION / post-V0.1** (§2.11, §18 D12) |
| P1-5 | Stale worktree/dependency claims | **Semantic wording only**; workstation chronology removed (throughout) |
| P1-6 | Class request without `dueAt` vs `due_at NOT NULL` | **Deterministic fallback rule** defined (§8.6, §11) |
| P1-7 | Trusted actor for `activities.actor_user_id` | **Server-resolved only**; never browser payloads (§4, §10) |

**Revision R2 — targeted patch (second review: HOLD, no redesign):**

| # | Finding | Resolution |
|---|---|---|
| R2-1 | `next_actions` + `activities` column schemas missing (§2) | **Added**: §2.3 `next_actions`, §2.4 `activities` — full column-level freeze, CHECKs, partial unique, indexes, actor FK policy, description/subtitle semantics |
| R2-2 | Plan-only vs implementation contradiction (§0/§17) | **Removed**: B6 is PLAN/DESIGN ONLY until B2 FINAL ACCEPTED/FROZEN **and an explicit B6 GO**; PR 2–8 are ALL gated |
| R2-3 | Stale B2 migration chronology (§1.1/§15/§16/§19) | **Removed**: no B2 migration filenames/numbers anywhere; totals recomputed from canonical master at B6 implementation time (72 stays conditional) |
| R2-4 | Service signatures look pre-bound (§5) | **Fixed**: factory-dependency signatures; all repos/services constructed from `tx` inside `db.transaction`, never from an outer handle |
| R2-5 | Browser-supplied amount trusted (§5.3/§7/§12) | **Fixed**: server-canonical snapshot — `booking.amount = services.price_amount` at creation; `amountOverride` = future explicit permissioned feature |
| R2-6 | `markPaid` leaves PENDING booking without next action (§5.3/§8.2) | **Fixed**: Rule F ensures exactly one `CONFIRM_BOOKING` for still-PENDING bookings (idempotent) |
| R2-7 | Aftercare completable before D+7 (§5.5/§9) | **Fixed**: temporal guard `now >= scheduled_for`; stable error `AFTERCARE_NOT_DUE`; repeats idempotent |
| R2-8 | Classification D1 unresolved (§2.8/§5.2/§18) | **Resolved**: stored/sticky `classification` column (`PROSPECT` default, `CLIENT` on booking completion or operator COMPLETED, never auto-demoted); derived formula removed |
| R2-9 | `services.price_amount` nullable (§2.1) | **Fixed**: `INTEGER NOT NULL DEFAULT 0 CHECK price_amount >= 0` |

**Revision R2.1 — targeted consistency patch (exact source audit of PR #15: HOLD, no redesign):**

| # | Finding | Resolution |
|---|---|---|
| R2.1-1 | Sticky classification lacks a consistent write seam; booking completion bypassed lifecycle authority (§4/§5.2/§5.3/§6/§7) | **Fixed**: `ContactLifecycleService` = ONLY writer of `contact_flow_states.stage`; repository seam `updateLifecycleState(ctx, {stage, lostReason?, promoteToClient?})` (classification never an input, never demoted); `transitionStage(COMPLETED)` atomically sets `stage='COMPLETED'` + `classification='CLIENT'`; booking create/complete reach `BOOKED`/`COMPLETED` via the lifecycle service; direct `UPDATE contact_flow_states` removed from the completion protocol |
| R2.1-2 | Aftercare idempotency contradicts PENDING validation (§5.5/§9) | **Fixed**: frozen order — completed/completed → canonical no-op FIRST (no activity/follow-ons); else AFTERCARE + PENDING + record PENDING + `now >= scheduled_for` → atomic completion |
| R2.1-3 | Booking terminal-state guards undefined; CANCELLED/NO_SHOW could still complete (§5.3/§7) | **Fixed**: frozen mutation matrix (confirm PENDING→CONFIRMED; reschedule PENDING\|CONFIRMED; complete CONFIRMED→COMPLETED; cancel PENDING\|CONFIRMED→CANCELLED; no-show PENDING\|CONFIRMED→NO_SHOW); terminal repeats idempotent; other mutation → `INVALID_BOOKING_STATE`; `PENDING → COMPLETED` explicitly NOT allowed in V0.1 |
| R2.1-4 | `AssessmentService`/`MessagingService` factories cannot emit activities / resolve phone (§5.6/§5.8) | **Fixed**: `createAssessmentService(db, {assessments, bookings, activities})`; `createMessagingService(db, {contacts, activities})` — org-scoped active (`deleted_at IS NULL`) contact lookup for `phone_e164` |
| R2.1-5 | Tenant guarantee overstated — "impossible by construction" vs single-column FKs (§10) | **Fixed**: accurate wording — FKs enforce existence/deletion; tenant equality enforced at repository/service boundary (`organization_id + id`); cross-org poisoning fails closed (`NOT_FOUND`) |
| R2.1-6 | `ActivityRepository.append` has no trusted-actor seam (§4) | **Fixed**: `append(ctx, actor?, input)` — actor from server-resolved B2 `AuthenticatedActor` only, `NULL` for system/internal events, never request JSON |
| R2.1-7 | Today read model lacks count/bounded-upcoming support (§4/§8.4) | **Fixed**: `countPending(ctx)` + bounded overdue/today/upcoming queries; `totalActiveCount` never derived from the limited upcoming result; no N+1 |
| R2.1-8 | Test matrix lacks R2.1 consistency cases (§14.2) | **Added**: integration cases #33–#42 (42 total) covering every R2.1 rule |

---

## 0. Positioning

Official software handles TES. Academy handles ILMU. WhatsApp handles CHAT.
**PromotorFlow handles APA YANG HARUS DILAKUKAN BERIKUTNYA** — Follow-up / Today OS.

The flow owns the business/customer lifecycle: contact lifecycle, services, bookings,
`next_actions`, activities, aftercare, message templates, assessment status. Flow owns the
canonical persistent `NextAction` and the canonical aftercare record. PromotorClass MUST
NOT own a second canonical action table (`INTEGRATION_CONTRACT.md` §23).

**B6 parallelization posture (locked):**
- **B6 owns the Flow API.** The route layer is part of B6's scope and is implemented
  inside B6 once the human gate is released (§12). The endpoint contract is bound in §12 now.
- **B6 is PLAN/DESIGN ONLY until an explicit B6 implementation GO is issued.**
  Predecessor milestone gates (B0, B1, B2, B3) are satisfied and FINAL ACCEPTED / FROZEN
  on master. Before the implementation gate: no schema files, no migration, no
  grants, no repositories, no domain rules, no services, no adapters, no routes, no
  frontend changes. After the gate, implementation proceeds in order: schema →
  migration → grants → repositories → domain rules → services → adapters → routes →
  frontend HTTP migration (PR 2–8, §17).
- B6 depends only on the abstract server-resolved `OrganizationContext`
  (`{ organizationId: string }`, frozen in B1) and the server-resolved
  `AuthenticatedActor` (from B2 Better Auth middleware). B6 invents no temporary auth;
  actor ids never come from browser-controlled payloads.
- **Operator-directed lifecycle** (not a strict funnel): see §6.
- **B7 owns cross-app integration wiring/hardening**; B6 keeps only the prepared seam (§11).

---

## 1. Audit of current Flow mock/frontend + backend state

### 1.1 Backend (apps/platform-api)

| Area | State |
|---|---|
| Worker | Hono app with health endpoints (`/health`, `/health/db`), auth endpoints (`/api/auth/*`), and PromotorClass endpoints (`/api/v1/programs/*`, `/api/v1/public/workspaces/*`). Request-scoped `pg.Client` via `withDb()` ([client.ts](../apps/platform-api/src/db/client.ts)) — frozen B1 discipline |
| Schema | Canonical master tables in `src/db/schema/`: **B1 Shared Core** (5 tables: organizations, users, organization_members, contacts, product_entitlements); **B2 Auth** (5 tables: sessions, accounts, verifications, organization_invitations, auth_rate_limits); **B3 PromotorClass Content** (6 tables: programs, modules, lessons, lesson_attachments, program_presentations, workspace_profiles); uuid PKs, timestamptz mode `'string'`, CHECK constraints, no triggers |
| Contacts | Canonical identity ONLY: `id, organization_id, name, phone_e164 (NOT NULL, UNIQUE org+phone), email, created_at, updated_at, deleted_at`. **No lifecycle fields** — stage/interest/notes/lost_reason do NOT exist anywhere in the backend |
| Migrations | ONE Drizzle history; canonical B1 (`0000_fluffy_prowler.sql`), B2 (`0001_shocking_black_widow.sql`), and B3 (`0002_heavy_scarlet_witch.sql`) exist on master. Next sequential migration for B6 is explicitly `0003` |
| Grants | `docs/sql/grants_b1.sql` (20 CRUD checks) + `docs/sql/grants_b2.sql` (20 CRUD checks) + `docs/sql/grants_b3.sql` (24 CRUD checks); `scripts/ci-setup-db.sh` runs all three. No ALTER DEFAULT PRIVILEGES |
| Core | `OrganizationContext { organizationId }` (frozen/minimal), `DomainError`, safe error envelope |
| Repos/Services | Org-scoped factories: `createContactRepository(db, normalizePhone, normalizeEmail)`, `createContactService(db)`; every query WHERE includes `organization_id` |
| Tests | node:test + tsx; unit (no DB) + integration (real PG via `TEST_DATABASE_URL`/`OWNER_DATABASE_URL`, CI `postgres:16` service); `tooling/b1-live-acceptance.ts` operator-run |
| Utils & Contracts | `@promotor/platform-core`: `normalizePhone`, `normalizeEmail`, `DEFAULT_ORGANIZATION_TIMEZONE`. `@promotor/contracts` owned transport/Zod layer: B6 MUST NOT mutate/break frozen Shared Core or Class contracts, but MAY add additive, backward-compatible Flow HTTP transport DTOs/schemas; contract baseline hash guardrail is deliberately re-baselined when Flow DTOs are added |

**No Flow persistence exists anywhere.**

### 1.2 Frontend (apps/promotor-flow-web + packages/promotor-flow-fixtures)

Next.js PWA, **clean hexagonal architecture** — ideal migration target:

- `src/modules/{contacts,lifecycle,next-actions,bookings,activities,services,messaging,aftercare,settings,promotorclass}/` each with `ports.ts` (repository interfaces), `commands.ts`, `queries.ts`.
- `src/adapters/mock/*` — in-memory repos over `mock-state-store` + `mock-clock` (demo/prototype mode with DevControlsOverlay).
- `src/adapters/http/flow-http-adapter.ts` — **HTTP seam already exists** but every method throws "not implemented in V0.1".
- `src/lib/container.ts` — DI wiring; hard-codes `'org_rina_stifin'` everywhere.
- `packages/promotor-flow-fixtures` — canonical client types + seeds: `FlowContact` (extends `@promotor/contracts.Contact` with `stage, classification, sourceChannel, notes, lostReason, tags`), `FlowService` (`title` not `name`, `priceAmount`), `FlowBooking` (**denormalized `amount` — real transaction nominal, e.g. 2.000.000, 600.000**), `FlowNextAction` (includes integration fields `source/sourceEventId/sourceSignalId/idempotencyKey/contextJson` already), `FlowActivity`, `MessageTemplate` (categories CONTACT_LEAD / CONFIRM_BOOKING / REMIND_PAYMENT / AFTERCARE), `LifecycleStage`, `BookingStatus`, `PaymentStatus`, `NextActionType`, `NextActionStatus` (**includes `SKIPPED`**), `ActionSource`, `ServiceCategory`.

### 1.3 Business rules currently implemented CLIENT-SIDE (must move server-side)

| Flow | Where today | Rule-gap vs PRD |
|---|---|---|
| createBooking | [bookings/commands.ts](../apps/promotor-flow-web/src/modules/bookings/commands.ts) — status CONFIRMED, stage→BOOKED, one action (REMIND_PAYMENT if unpaid else CONFIRM_BOOKING), BOOKING_CREATED activity; **`amount` captured at creation** | No CONFIRM_BOOKING→REMIND_BOOKING transition on confirm (NA-006); due rules (NA-005 min(now+2h, start−1d)) not implemented |
| changePaymentStatus | same file — only activity | **Missing PRD Rule F**: pending REMIND_PAYMENT is never completed/cancelled |
| rescheduleBooking | same file — only activity | **Missing architecture §31**: old REMIND_BOOKING not cancelled/recreated; payment reminder not re-evaluated |
| completeBooking | same file — status COMPLETED, stage→COMPLETED, aftercare D+7 with `idempotencyKey: 'aftercare:booking:${id}:d7'` (good — reuse server-side), BOOKING_COMPLETED activity | Booking reminder/confirm actions not cancelled; completed_at not set; no NO_SHOW/CANCELLED handling; no persistent aftercare record |
| lifecycle changeStage | [lifecycle/commands.ts](../apps/promotor-flow-web/src/modules/lifecycle/commands.ts) — **operator-directed: any LifecycleStage selectable**; LOST requires reason + cancels active actions; activity | Leaving LOST does not clear lost_reason; no INTERESTED auto-follow-up rule (NA-003); no server-side enforcement |
| skipAction | [next-actions/commands.ts](../apps/promotor-flow-web/src/modules/next-actions/commands.ts) — **skip REQUIRES a next step; canonical test creates a new FOLLOW_UP when an action becomes SKIPPED** | Server must preserve this: skip is never a silent drop |
| confirmWhatsAppSent | [messaging/commands.ts](../apps/promotor-flow-web/src/modules/messaging/commands.ts) — completes action only on **explicit confirm** (matches wa.me rule), records WA_SENT, optional follow-up scheduling | Uses non-canonical activity type `WA_SENT` (canonical: `WHATSAPP_SENT`); no WHATSAPP_OPENED record |
| completeAftercare | [aftercare/commands.ts](../apps/promotor-flow-web/src/modules/aftercare/commands.ts) — outcome recorded, aftercare action completed, follow-ons (CONTACT_LATER→D+30 FOLLOW_UP, NEEDS_FOLLOW_ON_SESSION→D+3 FOLLOW_UP), activity | Outcome enum differs from PRD §35 (see §1.5); CONTACT_LATER creates FOLLOW_UP but PRD says **manual** next action; outcome must be recorded at D+7 only; no persistent aftercare record |
| Today queue | [next-actions/queries.ts](../apps/promotor-flow-web/src/modules/next-actions/queries.ts) — client-side grouping overdue/today/upcoming, sorts by dueAt | No effective priority (base + overdue modifiers), no "primary next action" selection, no org timezone handling (uses device local) |

### 1.4 Shared Core constraint discovered (B1 frozen)

`contacts` has **no lifecycle/interest/notes/lost_reason columns** (audit 1.1). The frontend
`FlowContact` shape needs them. Resolution (locked): **Flow owns contact lifecycle in a
new Flow-owned 1:1 table** (`contact_flow_states`) — NOT new columns on the frozen
Shared Core `contacts` table. This keeps ownership matrix clean (Shared Core = identity,
Flow = lifecycle), keeps `grants_b1.sql` and the B1 contract untouched, and preserves
`ONE PERSON = ONE CONTACT = ONE contact_id`.

### 1.5 Fixture-vs-canonical conflicts (each resolved in this plan)

| Conflict | Client fixture | Canonical (this plan) | Resolved by |
|---|---|---|---|
| Aftercare outcome enum | `NO_FURTHER_NEED / HAS_QUESTION / NEEDS_FOLLOW_ON_SESSION / CONTACT_LATER` | `NO_NEED / HAS_QUESTION / INTERESTED_NEXT_SESSION / CONTACT_LATER` (PRD §35) | Adapter maps 1:1 by meaning (§13) |
| NextAction status | `PENDING / COMPLETED / SKIPPED / CANCELLED` | `PENDING / COMPLETED / SKIPPED / CANCELLED` (PRD lists 3; **SKIPPED kept** — fixture + canonical test require "skip with next step") | DB CHECK + documented deviation |
| Activity types | Reduced set (`WA_SENT`, `FOLLOWUP_CREATED`, …) | Full canonical taxonomy (§2.9) — **every service emit has an exact type + deterministic UI projection** | Adapter maps |
| Booking amount | `amount` denormalized on booking | **`bookings.amount` stored — server-canonical snapshot `= services.price_amount` at creation; client never supplies `amount` (P0-1, R2-5)** | Schema §2.2 |
| Booking serviceTitle | `serviceTitle` denormalized | **Joined** from `services.name` (no historical title snapshot needed) | Adapter/server read model |
| Service name | `title` | `name` (PRD §47) | Adapter maps |
| Contact phone | `phoneE164` required in fixture | **Required** (frozen B1 contract `phone_e164 NOT NULL`). PRD §15 says "phone optional" — **frozen contract wins**; Flow capture requires a phone; revisit only via a future product decision | Documented policy |
| Activity `booking_id` | absent | nullable FK (architecture §16) | Schema |
| Contact classification | `classification` field on `FlowContact` | **Stored/sticky** — `contact_flow_states.classification` (`PROSPECT` default; `CLIENT` on booking completion or operator transition → COMPLETED; never auto-demoted) (R2-8) | Review approval — **D1 resolved** (§2.8, §18) |

---

## 2. Canonical domain model

Flow-owned entities (all org-scoped, all `uuid` PKs `DEFAULT gen_random_uuid()`,
timestamptz mode `'string'`, `created_at`/`updated_at` per B1 convention, no triggers).

**B6 owns 8 tables:** `services`, `bookings`, `next_actions`, `activities`,
`contact_flow_states`, `aftercare_records`, `contact_assessments`, `message_templates`.

### 2.1 `services`

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations(id) ON DELETE RESTRICT
name              text NOT NULL CHECK (char_length > 0)
description       text NULL
category          text NOT NULL CHECK IN ('ASSESSMENT','SESSION','PROGRAM','OTHER')
price_amount      integer NOT NULL DEFAULT 0 CHECK (price_amount >= 0)   -- IDR, integer (R2-9)
duration_minutes  integer NOT NULL CHECK (> 0)
is_active         boolean NOT NULL DEFAULT true
created_at, updated_at
INDEX (organization_id, is_active)
```

No `deposit_amount` (no current-source evidence — removed per P1-2). No soft delete
(V0.1 manages active state via `is_active`). Category supports the assessment sync
(§2.6) without storing biometric data.

### 2.2 `bookings` — **amount snapshot restored (P0-1)**

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations RESTRICT
contact_id        uuid NOT NULL FK contacts RESTRICT
service_id        uuid NOT NULL FK services RESTRICT
amount            integer NOT NULL CHECK (amount >= 0)      -- booking-time price snapshot (IDR)
start_at          timestamptz NOT NULL
end_at            timestamptz NULL CHECK (end_at IS NULL OR end_at > start_at)
location_type     text NOT NULL CHECK IN ('HOME_VISIT','ON_SITE','ONLINE')
location_text     text NULL
status            text NOT NULL DEFAULT 'PENDING' CHECK IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')
payment_status    text NOT NULL DEFAULT 'UNPAID' CHECK IN ('UNPAID','PAID','WAIVED')
notes             text NULL
completed_at      timestamptz NULL
idempotency_key   text NULL
created_at, updated_at
UNIQUE partial (organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL
CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL))          -- PRD §70
INDEX (organization_id, start_at)
INDEX (organization_id, status, start_at)
INDEX (contact_id, start_at)
```

**`amount` is server-canonical (R2-5):** the client sends only `serviceId`; the server
loads the active org-scoped service and snapshots `booking.amount =
services.price_amount` at creation (P0-1; client parity: seed bookings store 2.000.000,
600.000, …). Historical correctness: a later `services.price_amount` change must never
rewrite past bookings (1 Agustus booking stays Rp600.000 even after the service is
raised to Rp700.000 in 1 September). `amountOverride` is a FUTURE explicit permissioned
+ audited feature — NOT in V0.1. `serviceTitle` remains a **display join** on
`services.name` (title history is not needed). `idempotency_key` protects double-submit
(PRD §71), incl. future public booking.

### 2.3 `next_actions` — canonical action queue (R2-1 column freeze)

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations RESTRICT
contact_id        uuid NOT NULL FK contacts RESTRICT
booking_id        uuid NULL FK bookings RESTRICT                -- booking-linked actions (NA-005/006/009)
action_type       text NOT NULL CHECK IN ('CONTACT_LEAD','FOLLOW_UP','REMIND_PAYMENT','CONFIRM_BOOKING','REMIND_BOOKING','AFTERCARE','MANUAL')
title             text NOT NULL CHECK (char_length > 0)
description       text NULL                                     -- human-authored; subtitle = deterministic projection (R2-1)
due_at            timestamptz NOT NULL
priority          integer NOT NULL CHECK (priority BETWEEN 1 AND 100)
status            text NOT NULL DEFAULT 'PENDING' CHECK IN ('PENDING','COMPLETED','SKIPPED','CANCELLED')
source            text NOT NULL DEFAULT 'PROMOTORFLOW' CHECK IN ('PROMOTORFLOW','PROMOTORCLASS','MANUAL')
source_event_id   text NULL                                     -- Class seam (§11)
source_signal_id  text NULL                                     -- Class seam (§11)
idempotency_key   text NULL
context_json      jsonb NOT NULL DEFAULT '{}'
completed_at      timestamptz NULL
created_at, updated_at
CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL))     -- completed iff stamped
UNIQUE partial (organization_id, source, idempotency_key) WHERE idempotency_key IS NOT NULL
INDEX (organization_id, status, due_at)                         -- Today feed (§8.4)
INDEX (organization_id, contact_id, status)
INDEX (booking_id)                                              -- booking-rule cleanup
```

**`description` is human-authored and persisted.** The frontend's `subtitle` is a
deterministic projection — `description ?? context-derived` (e.g. "Parenting ·
Instagram" composed server-side from payload context when `description` is absent); it
is never silently dropped (R2-1). Integration fields (`source/source_event_id/
source_signal_id/idempotency_key/context_json`) freeze the Class seam contract (§11);
the partial unique rejects duplicate integration payloads and allows null keys;
`completed_at` is set iff `COMPLETED` (CHECK).

### 2.4 `activities` — append-only timeline (R2-1 column freeze)

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations RESTRICT
contact_id        uuid NOT NULL FK contacts RESTRICT
booking_id        uuid NULL FK bookings RESTRICT                -- nullable (arch §16)
event_type        text NOT NULL CHECK IN ('CONTACT_CREATED','CONTACT_UPDATED','STAGE_CHANGED','WHATSAPP_OPENED','WHATSAPP_SENT','ACTION_CREATED','ACTION_COMPLETED','ACTION_RESCHEDULED','ACTION_SKIPPED','ACTION_CANCELLED','BOOKING_CREATED','BOOKING_CONFIRMED','BOOKING_RESCHEDULED','BOOKING_CANCELLED','BOOKING_NO_SHOW','BOOKING_COMPLETED','PAYMENT_MARKED','AFTERCARE_CREATED','AFTERCARE_COMPLETED','ASSESSMENT_STATUS_CHANGED','CLASS_SIGNAL')
actor_user_id     uuid NULL FK users(id) ON DELETE SET NULL     -- server-resolved B2 AuthenticatedActor ONLY (P1-7); NULL for system/internal events
metadata_json     jsonb NOT NULL DEFAULT '{}'
occurred_at       timestamptz NOT NULL DEFAULT now()
INDEX (organization_id, contact_id, occurred_at)                -- contact timeline
INDEX (organization_id, occurred_at)                            -- org timeline
```

Append-only by construction: `ActivityRepository` exposes no update/delete methods at
all (§4). `event_type` is validated against the §2.9 catalog; `actor_user_id` never
comes from browser-controlled payloads (§4, P1-7).

### 2.5 `aftercare_records` — dedicated Flow-owned persistence (P0-2)

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations RESTRICT
booking_id        uuid NOT NULL FK bookings RESTRICT
contact_id        uuid NOT NULL FK contacts RESTRICT
scheduled_for     timestamptz NOT NULL                       -- completed_at + 7 days
status            text NOT NULL DEFAULT 'PENDING' CHECK IN ('PENDING','COMPLETED')
outcome           text NULL CHECK (outcome IS NULL OR outcome IN ('NO_NEED','HAS_QUESTION','INTERESTED_NEXT_SESSION','CONTACT_LATER'))
outcome_notes     text NULL
recorded_at       timestamptz NULL
created_at, updated_at
UNIQUE (organization_id, booking_id)                          -- one aftercare per booking, exactly once
CHECK ((status = 'COMPLETED') = (outcome IS NOT NULL))
CHECK ((status = 'COMPLETED') = (recorded_at IS NOT NULL))
INDEX (organization_id, status, scheduled_for)
```

The **aftercare record and the AFTERCARE `NextAction` are two related entities, not one**:
booking completion creates both (record + action). Analytics are direct queries, never
JSON mining of activities: pending count, completed count, outcome distribution,
bookings missing aftercare (`UNIQUE (organization_id, booking_id)`).

### 2.6 `contact_assessments` — canonical current assessment state (P0-3)

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations RESTRICT
contact_id        uuid NOT NULL FK contacts RESTRICT, UNIQUE   -- one canonical current record per contact
status            text NOT NULL DEFAULT 'NOT_STARTED' CHECK IN ('NOT_STARTED','SCHEDULED','COMPLETED','CANCELLED','UNKNOWN')
source_booking_id uuid NULL FK bookings RESTRICT               -- the assessment booking that last determined status
assessed_at       timestamptz NULL                             -- set when status → COMPLETED
notes             text NULL
created_at, updated_at
INDEX (organization_id, status)
```

**Sync (deterministic, no projection ambiguity):** whenever an assessment-category
booking (`services.category = 'ASSESSMENT'`) is created, completed, cancelled or marked
no-show, `AssessmentService.syncFromBooking` updates this record with the booking's
resulting status. Write precedence when multiple assessment bookings exist:
`COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED` (highest evidence wins). The
multi-booking question from review — A CANCELLED, B COMPLETED, C PENDING → canonical
answer `COMPLETED` — is defined by this rule and tested (§14.2 #16). `UNKNOWN` is kept
for contract parity (`INTEGRATION_CONTRACT.md` §15) and is unused in V0.1.

### 2.7 `message_templates` — in B6 (P0-4); storage ≠ auto-send

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations RESTRICT
title             text NOT NULL CHECK (char_length > 0)
category          text NOT NULL CHECK IN ('CONTACT_LEAD','FOLLOW_UP','CONFIRM_BOOKING','REMIND_PAYMENT','REMIND_BOOKING','AFTERCARE')
template_text     text NOT NULL
is_active         boolean NOT NULL DEFAULT true
created_at, updated_at
INDEX (organization_id, category, is_active)
```

Templates are Flow-owned state, selected by `NextActionType` (categories mirror the six
non-manual action types; fixture categories CONTACT_LEAD / CONFIRM_BOOKING /
REMIND_PAYMENT / AFTERCARE are a subset). **No WhatsApp API automation in B6** — template
storage is a config surface; sending stays out of scope.

### 2.8 `contact_flow_states` — Flow-owned lifecycle (1:1 with Shared Core contact)

```text
id                uuid PK defaultRandom
organization_id   uuid NOT NULL FK organizations RESTRICT     -- redundant with contact, defense-in-depth + uniform org scoping
contact_id        uuid NOT NULL FK contacts RESTRICT, UNIQUE  -- ONE PERSON = ONE CONTACT = ONE row
stage             text NOT NULL DEFAULT 'NEW' CHECK IN ('NEW','CONTACTED','INTERESTED','FOLLOW_UP','BOOKED','COMPLETED','LOST')
classification    text NOT NULL DEFAULT 'PROSPECT' CHECK IN ('PROSPECT','CLIENT')  -- stored/sticky (R2-8)
lost_reason       text NULL
source_channel    text NULL
notes             text NULL
created_at, updated_at
CHECK ( (stage = 'LOST' AND lost_reason IS NOT NULL) OR (stage <> 'LOST' AND lost_reason IS NULL) )
INDEX (organization_id, stage)
```

- **`interest` and `result_type` removed** (no current-source evidence — P1-2). Only
  `source_channel` and `notes` (fixture-backed) plus `lost_reason`.
- **Classification is STORED and STICKY (R2-8, D1 resolved)** —
  `contact_flow_states.classification` column: new contact → `PROSPECT` (default);
  **`CLIENT` promotion happens ONLY through `ContactLifecycleService.transitionStage`
  (`targetStage = 'COMPLETED'`)** — operator transition or booking completion — which
  atomically writes `stage='COMPLETED'` + `classification='CLIENT'` in one tx (§5.2,
  R2.1-1); **never auto-demoted** — later stage movement (e.g. `COMPLETED → FOLLOW_UP`)
  keeps `CLIENT` (a client is a client). No other write path exists: the repository
  seam never accepts `classification` as input (no demotion path; direct SQL is never
  used). The architecture §15 derivation is superseded by explicit storage; the
  `src/domain/classification.ts` derived formula is removed as canonical authority.
  Manual reclassification = future product operation.
- Row created lazily by Flow (get-or-create on first Flow read/write) so contacts created
  by other products (e.g. B4 registration) get a lifecycle row without cross-product
  write dependencies.
- **Operator-directed**: stage writes happen only via `ContactLifecycleService` (§5.2)
  with the semantics of §6 (any stage selectable; LOST rules enforced).

### 2.9 Canonical activity taxonomy — ONE consistent catalog (P0-9)

Every event type below is (a) accepted by the `activities.event_type` DB CHECK and
(b) has a deterministic UI projection (title/detail composed from `event_type` +
`metadata_json`). **Every service-emitted event has an exact type — nothing is emitted
that the CHECK cannot accept.** Test §14.2 #24 verifies emit-set ⊆ CHECK-set.

| event_type | Emitted by (service operation) | Key metadata |
|---|---|---|
| `CONTACT_CREATED` | ContactFlowService.createFlowContact (Phase 2) | — |
| `CONTACT_UPDATED` | ContactFlowService.updateProfile (incl. notes/sourceChannel) | `{field}` |
| `STAGE_CHANGED` | ContactLifecycleService.transitionStage | `{from, to, lostReason?}` |
| `WHATSAPP_OPENED` | MessagingService.buildWaDeepLink | `{contactId}` |
| `WHATSAPP_SENT` | NextActionService.completeAction(confirmed) | `{actionId}` |
| `ACTION_CREATED` | every next-action create (CONTACT_LEAD/FOLLOW_UP/REMIND_PAYMENT/CONFIRM_BOOKING/REMIND_BOOKING/AFTERCARE/MANUAL) | `{actionType, dueAt, source, priority}` |
| `ACTION_COMPLETED` | completeAction; markPaid completing a REMIND_PAYMENT; completeAftercare completing the action | `{actionType, completedBy: 'MANUAL'\|'PAYMENT'\|'AFTERCARE'}` |
| `ACTION_RESCHEDULED` | NextActionService.rescheduleAction | `{actionType, from, to}` |
| `ACTION_SKIPPED` | NextActionService.skipAction | `{actionType, nextActionId}` |
| `ACTION_CANCELLED` | cancelAction; lifecycle→LOST cleanup; booking confirm/reschedule/complete/cancel/no-show cleanup | `{actionType, reason?}` |
| `BOOKING_CREATED` | BookingService.createBooking | `{bookingId, serviceName, amount, startAt}` |
| `BOOKING_CONFIRMED` | BookingService.confirmBooking | `{bookingId}` |
| `BOOKING_RESCHEDULED` | BookingService.rescheduleBooking | `{bookingId, from, to}` |
| `BOOKING_CANCELLED` | BookingService.cancelBooking | `{bookingId}` |
| `BOOKING_NO_SHOW` | BookingService.markNoShow | `{bookingId}` |
| `BOOKING_COMPLETED` | BookingService.completeBooking (exactly once per booking, §7) | `{bookingId, amount}` |
| `PAYMENT_MARKED` | BookingService.markPaid | `{bookingId, paymentStatus}` |
| `AFTERCARE_CREATED` | BookingService.completeBooking (record + action creation) | `{bookingId, scheduledFor}` |
| `AFTERCARE_COMPLETED` | AftercareService.completeAftercare | `{outcome, notes?}` |
| `ASSESSMENT_STATUS_CHANGED` | AssessmentService.syncFromBooking | `{status, sourceBookingId}` |
| `CLASS_SIGNAL` | LocalPromotorFlowAdapter.appendLearningActivity (seam only, no consumer in B6) | projection payload |

Client adapter mapping (old fixture names → canonical): `WA_SENT→WHATSAPP_SENT`,
`FOLLOWUP_CREATED→ACTION_CREATED` (metadata.actionType=`FOLLOW_UP`),
`FOLLOWUP_COMPLETED→ACTION_COMPLETED`, `BOOKING_*→BOOKING_*` 1:1, `CLASS_SIGNAL→CLASS_SIGNAL`,
`PAYMENT_MARKED→PAYMENT_MARKED`, `STAGE_CHANGED→STAGE_CHANGED`, `CONTACT_CREATED→CONTACT_CREATED`.

### 2.10 Enumerations summary (all DB CHECKs, matching B1 style)

`CONTACT_STAGE`, `NEXT_ACTION_TYPE`, `NEXT_ACTION_STATUS` (incl. `SKIPPED`),
`ACTION_SOURCE`, `BOOKING_STATUS`, `PAYMENT_STATUS`, `LOCATION_TYPE`, `SERVICE_CATEGORY`,
`ACTIVITY_EVENT_TYPE` (full §2.9 catalog), `AFTERCARE_STATUS`, `AFTERCARE_OUTCOME`,
`ASSESSMENT_STATUS`, `TEMPLATE_CATEGORY`.

### 2.11 Explicitly deferred tables — **OPEN PRODUCT DECISION / post-V0.1**

| Table | Reason to defer | Canonical milestone |
|---|---|---|
| `availability_rules` | Only consumed by public booking + slot generation — public booking is a separate surface with its own auth/rate-limit needs | **OPEN PRODUCT DECISION — post-V0.1** (no canonical milestone assigned yet; counted in no grant arithmetic) |
| `tags` / `contact_tags` | Frontend-only today; not consumed by any B6 rule | **OPEN PRODUCT DECISION — post-V0.1** (adapter omits `tags[]` until available) |

---

## 3. Proposed PostgreSQL schema (Drizzle)

Files (one table per file, mirroring B1 layout in `apps/platform-api/src/db/schema/`):

```text
src/db/schema/services.ts
src/db/schema/bookings.ts
src/db/schema/next-actions.ts
src/db/schema/activities.ts
src/db/schema/contact-flow-states.ts
src/db/schema/aftercare-records.ts
src/db/schema/contact-assessments.ts
src/db/schema/message-templates.ts
src/db/schema/index.ts   ← append 8 exports after B2's (never rewrite another milestone's entries)
```

Conventions identical to B1 ([contacts.ts](../apps/platform-api/src/db/schema/contacts.ts)):
`uuid().defaultRandom().primaryKey()`, `timestamp(..., { withTimezone: true, mode: 'string' })`,
`check()` with `sql` template, named unique/index constraints, row types `$inferSelect/$inferInsert`.
No triggers, no magic.

---

## 4. Repository API

All repositories are org-scoped factories (B1 pattern): take `db: NodePgDatabase`,
require `OrganizationContext` on every method, `isOrganizationContext` guard first,
every WHERE includes `organization_id`. **No cross-tenant escape hatches** — no
`listAll`, no un-scoped id lookups, no cross-org join helpers.

**Transaction composition (locked, P0-7):** repositories are **cheap factories bound to
whatever handle is passed**. Orchestrations that span multiple repositories construct
ALL repositories **inside** `db.transaction(tx => …)` from `tx` — never mix repositories
bound to different handles. See §5.0 for the pattern.

**Trusted actor (locked, P1-7, R2.1-6):** `activities.actor_user_id`, when supplied, comes
ONLY from the server-resolved B2 `AuthenticatedActor` (session-derived). The actor write
seam is explicit: `ActivityRepository.append(ctx, actor?, input)` — `actor` is the
resolved `AuthenticatedActor` (or `null` for system/internal events) and is NEVER
accepted from browser-controlled payloads; no service input carries `actorUserId`.
`OrganizationContext` stays `{ organizationId }`.

**Active tenant parent verification (locked, R2.3-7):** single-column foreign keys ensure
parent existence, but cross-tenant isolation and soft-delete safety require fail-closed
parent verification. `ContactFlowRepository.getOrCreate`, `AssessmentRepository.getOrCreate`,
and all parent-linking operations (bookings, next actions, activities) MUST verify that
`contactId` belongs to an active contact within the tenant:
`contacts.id = contactId AND contacts.organization_id = ctx.organizationId AND contacts.deleted_at IS NULL`.
For atomic get-or-create, repositories execute conditional insertion from the active
`contacts` table:
```sql
INSERT INTO contact_flow_states (id, organization_id, contact_id, stage, classification, created_at, updated_at)
SELECT gen_random_uuid(), c.organization_id, c.id, 'NEW', 'PROSPECT', now(), now()
FROM contacts c
WHERE c.id = $contactId AND c.organization_id = $organizationId AND c.deleted_at IS NULL
ON CONFLICT (contact_id) DO NOTHING;
```
If the contact is not found, belongs to another tenant, or has `deleted_at IS NOT NULL`,
the operation returns `null` / fails closed with `DomainError('NOT_FOUND')`.

`src/repositories/`:

**ServiceRepository** (`createServiceRepository(db)`)
- `listActive(ctx)` / `listByIds(ctx, ids)` / `findById(ctx, id)`
- `create(ctx, input)` / `update(ctx, id, patch)` — name/description/category/price/duration/isActive

**ContactFlowRepository** (`createContactFlowRepository(db)`)
- `getOrCreate(ctx, contactId)` — conditional INSERT from active tenant `contacts` ON CONFLICT (contact_id) DO NOTHING, then select; lazy lifecycle row (classification default `PROSPECT` applied here only); returns `null` if contact missing/deleted/other-org
- `updateLifecycleState(ctx, contactId, {stage, lostReason?, promoteToClient?})` — ONE
  UPDATE setting stage (+`lost_reason` per the CHECK bijection) and, when
  `promoteToClient: true`, `classification = 'CLIENT'` in the same statement; **`classification`
  is never an input and never demoted** (no method accepts a `PROSPECT` write post-creation;
  R2.1-1)
- `updateProfile(ctx, contactId, patch)` — sourceChannel/notes
- Internal only: `findById(ctx, contactId)` (active join semantics: contact must exist and `deleted_at IS NULL`)

**BookingRepository** (`createBookingRepository(db)`)
- `create(ctx, input {amount, …}, idempotencyKey?)` — returns row; caller handles unique-violation mapping; requires active org contact and service
- `findById(ctx, id)` / `listByOrg(ctx, opts {status?, from?, to?, includeCompleted?})` / `listByContact(ctx, contactId)`
- `lockById(ctx, id)` — `SELECT … FOR UPDATE` (completion protocol §7)
- `updateStatus(ctx, id, status)` / `updatePayment(ctx, id, paymentStatus)` / `reschedule(ctx, id, startAt, endAt)` / `markCompleted(ctx, id, completedAt)`
- Every update returns the row; 0 rows → null (not an error) so services can raise `NOT_FOUND`

**NextActionRepository** (`createNextActionRepository(db)`)
- `create(ctx, input)` (incl. integration fields; maps pg unique-violation on
  `(organization_id, source, idempotency_key)` to `CONFLICT`); requires active org contact
- `findById(ctx, id)` / `listByContact(ctx, contactId, status?)`
- **Today feed seams (R2.1-7)**: `listPendingDueBy(ctx, upTo)` — overdue+today
  (`status='PENDING' AND due_at <= upTo`, org-scoped, asc); `listPendingUpcoming(ctx, from, limit)` —
  bounded future horizon for the upcoming group; `countPending(ctx)` — full PENDING count
  → Today `totalActiveCount` (never derived from the limited upcoming result)
- `findByIdempotency(ctx, source, idempotencyKey)` / `findActiveByBookingType(ctx, bookingId, type)` (for booking-rule cleanup)
- `complete(ctx, id, completedAt)` / `resolve(ctx, id, status: 'SKIPPED'|'CANCELLED')` / `reschedule(ctx, id, dueAt)`

**ActivityRepository** (`createActivityRepository(db)`)
- `append(ctx, actor?, input {eventType, contactId, bookingId?, metadataJson})` —
  append-only insert (no update/delete methods at all); `event_type` validated against the
  §2.9 catalog; `actor` = server-resolved B2 `AuthenticatedActor`, `null` for
  system/internal events — **never from request JSON (R2.1-6)**; `promotor_runtime` has
  `SELECT, INSERT` only (R2.3-3)
- `listByContact(ctx, contactId, limit?)` — `occurred_at DESC`
- `listByOrg(ctx, opts)` — org timeline (future analytics/audit)

**AftercareRepository** (`createAftercareRepository(db)`)
- `create(ctx, input)` — maps `(organization_id, booking_id)` unique-violation to `CONFLICT`
- `findByBooking(ctx, bookingId)` / `listByOrg(ctx, opts {status?})` / `findById(ctx, id)`
- `completeRecord(ctx, bookingId, {outcome, outcomeNotes, recordedAt})` — sets status/outcome/outcome_notes/recorded_at

**AssessmentRepository** (`createAssessmentRepository(db)`)
- `getOrCreate(ctx, contactId)` — conditional INSERT from active tenant `contacts` ON CONFLICT (contact_id) DO NOTHING, then select; returns `null` if contact missing/deleted/other-org
- `updateStatus(ctx, contactId, status, sourceBookingId?)` — with precedence guard (§2.6)

**TemplateRepository** (`createTemplateRepository(db)`)
- `listActive(ctx, category?)` / `findById(ctx, id)` / `create(ctx, input)` / `update(ctx, id, patch)` (incl. `isActive`)

Unit-testable repository surface stays thin; **all business rules live in services** (PRD §77).

---

## 5. Application services

`src/services/` (factories over repositories, B1 style `createXService(db)`).

### 5.0 Transaction composition pattern (locked, P0-7)

**Flow-only orchestration** — all dependencies transaction-scoped:

```ts
db.transaction(async (tx) => {
  const bookingRepo   = createBookingRepository(tx)
  const flowRepo      = createContactFlowRepository(tx)
  const actionRepo    = createNextActionRepository(tx)
  const activityRepo  = createActivityRepository(tx)
  const aftercareRepo = createAftercareRepository(tx)
  // … orchestrate …
})
```

Service factories take **factory dependencies** — the second argument is an object of
*factory functions* (never pre-bound instances), e.g. `createBookingService(db, {
lifecycle: createContactLifecycleService, nextActions: createNextActionService,
activities: createActivityRepository, aftercare: createAftercareRepository,
assessment: createAssessmentService })`. Dependencies are constructed from `tx` inside
the service's own `db.transaction` (R2-4) — the transaction genuinely propagates to
every dependency; nothing is bound to an outer handle. **Emission rule (R2.1-4):** every
service that writes an activity receives the `activities` factory explicitly — no
service emits through an undeclared dependency, and no service hides raw DB lookups
(e.g. MessagingService resolves `phone_e164` via its declared `contacts` dependency).

**Shared Core contact creation — two-phase, NOT cross-product atomic (per review):**

- **Phase 1:** Shared Core `matchOrCreateContact` runs its own internal transaction
  (B1 behavior — **unchanged, not refactored**) → durable canonical Contact.
- **Phase 2:** idempotent Flow onboarding transaction: flow-state get-or-create
  (`ON CONFLICT (contact_id) DO NOTHING`), NA-001 `CONTACT_LEAD` (guarded by its own
  idempotency key), `CONTACT_CREATED` activity. If Phase 2 fails → safe retry. A contact
  without a Flow state remains valid (Contact is shared across products, e.g. B4
  registration).

### 5.1 `ContactFlowService` — `createContactFlowService(db, { contactService, lifecycle: createContactLifecycleService, nextActions: createNextActionService, activities: createActivityRepository })`
- `createFlowContact(ctx, {name, phoneRaw, email?, sourceChannel?, notes?})`
  → Phase 1 Shared Core match-or-create (unchanged B1) + Phase 2 onboarding tx per §5.0:
  flow-state get-or-create + **NA-001** `CONTACT_LEAD` (due = now + 2h, priority 75) +
  `CONTACT_CREATED` activity. Required phone (frozen contract §1.5).
- `getContactContext(ctx, contactId)` → `FlowContactContext` per `INTEGRATION_CONTRACT.md`
  §14: identity + `stage` + stored `classification` (R2-8) + `primaryNextAction` + `activeBooking`.
- `getAssessmentStatus(ctx, contactId)` → **read of `contact_assessments`** (get-or-create)
  — canonical record, no derivation ambiguity (§2.6).
- `getContactTimeline(ctx, contactId)` → activities (for contact detail).

### 5.2 `ContactLifecycleService` — `createContactLifecycleService(db, { nextActions: createNextActionService, activities: createActivityRepository })`
**Operator-directed lifecycle (P0-5)** — the ONLY writer of `contact_flow_states.stage`
**and the ONLY path that sets `classification = 'CLIENT'`** (R2.1-1):
- `transitionStage(ctx, contactId, targetStage, {lostReason?})` — **any valid stage may
  be selected** (no transition matrix). Semantics:
  - `targetStage = 'COMPLETED'` → **atomically promotes `classification` to `CLIENT`**
    via `updateLifecycleState(ctx, {stage: 'COMPLETED', promoteToClient: true})` (same
    statement, same tx). `CLIENT` is never demoted by any later transition — the service
    has no demotion path.
  - `targetStage = 'LOST'` → `lostReason` REQUIRED (service validation →
    `DomainError('VALIDATION', 'LOST_REASON_REQUIRED')`; DB CHECK backstop); cancels all
    active pending actions for the contact (`ACTION_CANCELLED`, history kept).
  - leaving `LOST` (any stage from LOST) → `lost_reason` cleared (DB CHECK enforces
    `lost_reason NOT NULL ⇔ stage = 'LOST'`).
  - entering `INTERESTED` with no active follow-up → **NA-003** auto `FOLLOW_UP`
    (next local day 10:00, priority 70).
  - entering `CONTACTED` → **NA-002** returns follow-up scheduling suggestions
    (besok/2/3 d/1 minggu/custom) — **prompt only, human picks** (no auto-create).
  - records `STAGE_CHANGED` activity `{from, to, lostReason?}`; history append-only
    (correction = a new event, never a rewrite).
- **Booking side effects invoke this service** (`BOOKED` on create, `COMPLETED` on
  completion) inside the booking transaction — never direct SQL (§5.3, §7).
- `suggestFollowUpOptions(ctx, contactId)` — pure helper for the Rule B/D prompts.

### 5.3 `BookingService` — `createBookingService(db, { lifecycle: createContactLifecycleService, nextActions: createNextActionService, activities: createActivityRepository, aftercare: createAftercareRepository, assessment: createAssessmentService })`
All orchestration inside ONE transaction with tx-scoped repositories (§5.0):
- `createBooking(ctx, input {contactId, serviceId, startAt, endAt?, locationType, locationText?, paymentStatus, notes?, idempotencyKey?})`
  — **`amount` is server-canonical (R2-5): NOT in the input — the server loads the
  active org-scoped service and snapshots `booking.amount = service.price_amount`**
  (P0-1 preserved); validate contact (exists, active, org) + service (belongs to org,
  active) → insert booking →
  `lifecycle.transitionStage(ctx, contactId, 'BOOKED')` (operator-directed side effect,
  no-op if already BOOKED — booking creation reaches BOOKED through lifecycle authority,
  R2.1-1) →
  **NA-005**: UNPAID → `REMIND_PAYMENT` (due = min(now+2h, start−1d), priority 85)
  → PENDING+paid → `CONFIRM_BOOKING` (due = start, priority 90) →
  `BOOKING_CREATED` activity → if `service.category = 'ASSESSMENT'` →
  `assessment.syncFromBooking` (status `SCHEDULED`).
- `confirmBooking(ctx, bookingId)` — **PENDING→CONFIRMED (matrix §7)**; re-confirm on
  CONFIRMED → idempotent no-op (no duplicate `REMIND_BOOKING`); COMPLETED/CANCELLED/NO_SHOW
  → `DomainError('VALIDATION', 'INVALID_BOOKING_STATE')`; cancel `CONFIRM_BOOKING`;
  **NA-006**: `REMIND_BOOKING` (due = start−1d, priority 90; if start < now+24h → due = now);
  `BOOKING_CONFIRMED` activity.
- `markPaid(ctx, bookingId, paymentStatus: 'PAID'|'WAIVED')` — idempotent (already PAID/WAIVED → no-op);
  **Rule F**: complete pending `REMIND_PAYMENT` for the booking (`ACTION_COMPLETED`,
  `completedBy='PAYMENT'`); **if the booking is still `PENDING`, ensure exactly one
  pending `CONFIRM_BOOKING` (created if absent — idempotent, R2-6)**; `PAYMENT_MARKED`
  activity.
- `rescheduleBooking(ctx, bookingId, startAt, endAt?)` — **source status PENDING|CONFIRMED
  only (matrix §7)**; terminal → `DomainError('VALIDATION', 'INVALID_BOOKING_STATE')`;
  update; **architecture §31**:
  cancel pending `REMIND_BOOKING`+`CONFIRM_BOOKING`, recreate per new timing (NA-005/NA-006
  re-evaluation for unpaid); `BOOKING_RESCHEDULED` activity.
- `completeBooking(ctx, bookingId)` — **concurrency-safe protocol (§7)**: lock row
  `FOR UPDATE`; already COMPLETED → return canonical result (idempotent no-op);
  **source status must be `CONFIRMED` (matrix §7)** — PENDING must be confirmed first
  (confirmBooking / markPaid flow), CANCELLED/NO_SHOW are terminal → otherwise
  `DomainError('VALIDATION', 'INVALID_BOOKING_STATE')` (never a silent direct complete);
  mark COMPLETED + `completed_at`;
  **`lifecycle.transitionStage(ctx, contactId, 'COMPLETED')` — same tx, lifecycle
  authority: atomically `stage='COMPLETED'` + `classification='CLIENT'` +
  `STAGE_CHANGED` (R2.1-1), never direct SQL**; cancel pending booking-scoped
  actions; `BOOKING_COMPLETED` exactly once; **create `aftercare_records` row**
  (`scheduled_for = completed_at + 7d`, `ON CONFLICT (organization_id, booking_id)
  DO NOTHING`) + **AFTERCARE NextAction** (due = completed_at + 7d, priority 50,
  `idempotency_key = 'aftercare:booking:{bookingId}:d7'`) + `AFTERCARE_CREATED`
  activity. **Outcome NOT asked now** (PRD §35). If `service.category = 'ASSESSMENT'` →
  `assessment.syncFromBooking` (status `COMPLETED`, `assessed_at`).
- `cancelBooking(ctx, bookingId, opts?)` — **source PENDING|CONFIRMED → CANCELLED
  (matrix §7)**; repeat cancel on CANCELLED → idempotent no-op; COMPLETED/NO_SHOW →
  `DomainError('VALIDATION', 'INVALID_BOOKING_STATE')`; cancel booking-scoped actions,
  `BOOKING_CANCELLED` (+ assessment sync → `CANCELLED` if assessment booking).
- `markNoShow(ctx, bookingId)` — **source PENDING|CONFIRMED → NO_SHOW (matrix §7)**;
  repeat on NO_SHOW → idempotent no-op; COMPLETED/CANCELLED →
  `DomainError('VALIDATION', 'INVALID_BOOKING_STATE')`; cancel booking-scoped actions,
  `BOOKING_NO_SHOW` (+ assessment sync → `CANCELLED` if assessment booking).
- `getAgenda(ctx, {from, to})` / `getBookingDetail(ctx, id)` — calendar read model.

### 5.4 `NextActionService` — `createNextActionService(db, { clock, orgTz, activities: createActivityRepository })`
(clock/orgTz = injected config; `activities` = tx-scoped repo factory)
The engine (`implementation-plan.md` §10). Explicit rule functions (no giant switch):
- `createContactLeadAction` (NA-001) — internal, used by 5.1
- `createFollowUp(ctx, {contactId, dueAt, title?, description?})` — `FOLLOW_UP`, priority 70, `ACTION_CREATED`
- `createPaymentReminder` (NA-005) / `createBookingReminder` (NA-006) / `createConfirmBooking` — internal, used by 5.3
- `createAftercare` (NA-009) — internal; unique via idempotency key (partial unique index is the final guard)
- `createManualAction(ctx, input)` — `MANUAL`, priority 40, `source='MANUAL'`
- `completeAction(ctx, actionId, {confirmedWhatsAppSent?: boolean})` — **wa.me rule**:
  completing a messaging-origin action requires `confirmedWhatsAppSent === true` —
  opening WhatsApp NEVER completes an action; explicit user confirmation required.
  Sets COMPLETED + `completed_at` (idempotent). Records `ACTION_COMPLETED` (+
  `WHATSAPP_SENT` where applicable).
- **`skipAction(ctx, actionId, nextStep: {type, dueAt?, title?, description?})` — next
  step REQUIRED (P0-6).** Marks `SKIPPED` and **atomically creates the new pending
  action** (`nextStep.type`; default `dueAt` = next local day 10:00 for FOLLOW_UP) in the
  same transaction; records `ACTION_SKIPPED` (+ `ACTION_CREATED`). Skipping without a
  next step is rejected (`DomainError('VALIDATION', 'NEXT_STEP_REQUIRED')`) — "tidak
  dikerjakan sekarang" ≠ "hilang dari radar". UI uses `cancelAction` when the action is
  genuinely void.
- `cancelAction(ctx, actionId)` → `CANCELLED` (`ACTION_CANCELLED`)
- `rescheduleAction(ctx, actionId, dueAt)` — updates `due_at` (`ACTION_RESCHEDULED`)
- `getPrimaryNextAction(ctx, contactId)` — effective priority (§8.3), earliest due, oldest created
- `getToday(ctx, now?)` — Today read model (§8.4): `{ date, totalActiveCount, overdueCount,
  groups: { overdue[], today[], upcoming[] } }` with contact/booking/service summaries
  joined server-side (no N+1 client assembly, architecture §26).

### 5.5 `AftercareService` — `createAftercareService(db, { aftercare: createAftercareRepository, nextActions: createNextActionService, activities: createActivityRepository })`
- `completeAftercare(ctx, actionId, {outcome, notes?})` — **frozen execution order
  (R2.1-2)**, one transaction:
  1. load the action (org-scoped) and its linked `aftercare_records` row (via `booking_id`);
  2. **idempotency FIRST**: if `action.status = 'COMPLETED'` AND `record.status =
     'COMPLETED'` → **return the canonical existing completion result** (outcome,
     recorded_at; follow-ons already created) — **no new activity, no new follow-ons**
     (repeat = true no-op);
  3. else `action.action_type` must be `'AFTERCARE'` → else `DomainError('VALIDATION',
     'INVALID_ACTION_TYPE')`;
  4. `action.status` must be `'PENDING'` → else `DomainError('VALIDATION',
     'INVALID_ACTION_STATUS')`; the record must exist and be `'PENDING'`;
  5. **temporal guard (R2-7)**: `now < scheduled_for` → `DomainError('VALIDATION',
     'AFTERCARE_NOT_DUE')` (completable at/after D+7 only);
  6. atomic completion: action `COMPLETED` + record `COMPLETED` (status, `outcome`,
     `outcome_notes`, `recorded_at = now`) + `AFTERCARE_COMPLETED` activity with
     `metadata_json = { outcome, notes? }` + follow-on actions per outcome:
     - `CONTACT_LATER` → **MANUAL** next action, due D+30 (PRD §35: "create manual next action")
     - `INTERESTED_NEXT_SESSION` → `FOLLOW_UP` offering next session, due D+3 (client parity)
     - `NO_NEED` / `HAS_QUESTION` → no follow-on (HAS_QUESTION satisfied by the promoter reply).
  **WhatsApp send decoupling (R2.3-8)**: recording an aftercare outcome must NEVER
  fabricate `WHATSAPP_SENT`. If aftercare is executed via WhatsApp, message sending is
  explicitly human-confirmed first (`WHATSAPP_OPENED` → operator confirmation → `WHATSAPP_SENT`);
  the outcome recording operation records `AFTERCARE_COMPLETED` only.
  Outcome only ever recorded at the D+7 completion — never at booking completion.

### 5.6 `AssessmentService` — `createAssessmentService(db, { assessments: createAssessmentRepository, bookings: createBookingRepository, activities: createActivityRepository })` — emits `ASSESSMENT_STATUS_CHANGED` through the declared tx-scoped `activities` dependency (R2.1-4)
- `syncFromBooking(ctx, bookingId)` — internal, called by BookingService for
  `category='ASSESSMENT'` bookings; applies §2.6 precedence
  (`COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED`), writes
  `ASSESSMENT_STATUS_CHANGED` activity.
- `getAssessmentStatus(ctx, contactId)` — get-or-create + read (no derivation).
- Pure precedence rule lives in `src/domain/assessment.ts` (unit-testable).

### 5.7 `TemplateService` — `createTemplateService(db, { templates: createTemplateRepository })`
- `listTemplates(ctx, {category?, activeOnly?})` / `getTemplate(ctx, id)` / `createTemplate(ctx, input)` /
  `updateTemplate(ctx, id, patch)` — org-scoped V0.1 config surface. No sending.

### 5.8 `MessagingService` — `createMessagingService(db, { contacts: createContactRepository, activities: createActivityRepository })`
- `buildWaDeepLink(ctx, {contactId, message})` — resolves `phone_e164` **through the
  declared Shared Core `contacts` dependency: org-scoped lookup of an ACTIVE contact
  (`deleted_at IS NULL`)**; contact missing/inactive/other org → `NOT_FOUND` (fails
  closed); no hidden raw DB lookups (R2.1-4) → builds
  `https://wa.me/{phone_e164}?text={encoded}` + records `WHATSAPP_OPENED` (call site:
  the future HTTP route fired when the user taps "Open WhatsApp" — B6 ships the pure
  builder + activity writer, no HTTP).
- `confirmSent` semantics live in `NextActionService.completeAction` (§5.4) — single source of truth.

---

## 6. Lifecycle semantics — operator-directed (P0-5)

Pure domain module `src/domain/contact-lifecycle.ts` (no DB — unit-testable):

**Locked V0.1 semantics (no strict funnel, no transition matrix):**

0. **ONE writer (R2.1-1):** all stage writes — operator transitions AND booking side
   effects — go through `ContactLifecycleService.transitionStage` (§5.2), the ONLY
   writer of `contact_flow_states.stage`. Direct SQL/stage updates elsewhere are
   prohibited by design (the repo seam `updateLifecycleState` exists for the service).
1. **Any valid `LifecycleStage` may be selected for any contact** via
   `transitionStage` — the CRM operator directs the lifecycle. `NEW → INTERESTED`,
   `INTERESTED → BOOKED`, `NEW → COMPLETED` are all **normal behavior** (canonical
   test parity). No invented `INVALID_TRANSITION` constraint.
2. **`LOST` requires `lostReason`** (service validation + DB CHECK backstop) and
   cancels all active pending actions for the contact (history kept, `ACTION_CANCELLED`).
3. **Leaving `LOST` clears `lost_reason`** (DB CHECK enforces the bijection).
4. **Booking creation reaches `BOOKED` via lifecycle** (side effect of §5.3, same tx).
5. **Booking completion reaches `COMPLETED` via lifecycle** (side effect of §5.3, same
   tx) — and **atomically promotes `classification` to `CLIENT`** (§5.2, R2.1-1);
   `CLIENT` is never auto-demoted.
6. **History remains append-only** — `STAGE_CHANGED` activities; a correction is a new
   event with `{from, to}`, never a rewrite.
7. Rule triggers on stage entry are **side effects, not constraints**: NA-002 (CONTACTED
   suggestions — prompt only), NA-003 (INTERESTED auto follow-up if none active).
8. LOST without reason → `DomainError('VALIDATION', 'LOST_REASON_REQUIRED')`.

If a strict funnel is ever wanted, that is a separate product change — not B6.

---

## 7. Booking semantics

- **Statuses** `PENDING → CONFIRMED → COMPLETED`; terminal `CANCELLED`, `NO_SHOW`.
- **Frozen mutation matrix (R2.1-3)** — the ONLY allowed transitions in V0.1:

  ```text
  confirm:     PENDING             → CONFIRMED
  reschedule:  PENDING | CONFIRMED   (same booking, new time)
  complete:    CONFIRMED           → COMPLETED
  cancel:      PENDING | CONFIRMED → CANCELLED
  no-show:     PENDING | CONFIRMED → NO_SHOW

  COMPLETED / CANCELLED / NO_SHOW are TERMINAL:
    - repeating the SAME terminal command may be idempotent
      (complete×2 → canonical no-op; cancel×2 → no-op; no-show×2 → no-op)
    - any OTHER mutation on a terminal booking →
      DomainError('VALIDATION', 'INVALID_BOOKING_STATE')
  ```

  `PENDING → COMPLETED` directly is **explicitly NOT a V0.1 transition** — a PENDING
  booking must be confirmed first (`confirmBooking`, or `markPaid`'s confirm path, or
  the NA-005b `CONFIRM_BOOKING` action). If product later wants direct completion, that
  is an explicit product decision, not implementation freedom.
  **`markPaid` is NOT a status mutation** — it may run on any booking (payment record +
  Rule F); its `CONFIRM_BOOKING` creation applies only while the booking is still
  `PENDING` (R2-6).
- **`amount` is server-canonical at creation (R2-5)** — `booking.amount =
  services.price_amount` resolved server-side from `serviceId` (P0-1 snapshot kept);
  clients never supply `amount`. Display `serviceTitle` is joined from `services.name`.
  A later price change never rewrites history; `amountOverride` is a future explicit
  permissioned feature.
- **Payments** manual only: `UNPAID → PAID | WAIVED` (no gateway — PRD §30). Marking
  paid is idempotent; always completes pending `REMIND_PAYMENT` for that booking (Rule F)
  and, while the booking is still `PENDING`, ensures exactly one `CONFIRM_BOOKING`
  (idempotent, R2-6).
- **Create** (§5.3) provisions booking + stage + action + activity + assessment sync in
  ONE transaction; mid-failure → nothing persisted.
- **Reschedule** always re-syncs reminders (architecture §31) — never leaves a
  `REMIND_BOOKING` pointing at the old time.
- **Completion — concurrency-safe protocol (P0-8), one transaction:**

  ```text
  BEGIN
    SELECT … FROM bookings WHERE id = $bookingId AND organization_id = $org FOR UPDATE
    if not found              → NOT_FOUND
    if status = 'COMPLETED'   → load canonical completion result
                                (completed_at, aftercare record, AFTERCARE action, activity)
                                → return success no-op (double-tap safe)
    if status != 'CONFIRMED'  → DomainError('VALIDATION', 'INVALID_BOOKING_STATE')
                                (PENDING → confirm first; CANCELLED/NO_SHOW terminal; §7 matrix)
    UPDATE bookings SET status = 'COMPLETED', completed_at = now()
    lifecycle.transitionStage(ctx, contactId, 'COMPLETED')   -- lifecycle authority (R2.1-1):
                                                              -- stage='COMPLETED' +
                                                              -- classification→'CLIENT' atomically
                                                              -- + STAGE_CHANGED (NOT direct SQL)
    cancel pending booking-scoped actions (ACTION_CANCELLED)
    INSERT aftercare_records (…, scheduled_for = now() + 7d, status = 'PENDING')
      ON CONFLICT (organization_id, booking_id) DO NOTHING
    INSERT next_actions (AFTERCARE, due = now() + 7d,
      idempotency_key = 'aftercare:booking:{bookingId}:d7')   -- partial unique guards dupes
    INSERT activities (BOOKING_COMPLETED)                    -- exactly once, inside the lock
    INSERT activities (AFTERCARE_CREATED)
    assessment sync if category = 'ASSESSMENT'
  COMMIT
  ```

  The row lock serializes concurrent completions; the unique partials backstop
  duplicates. **The test runs two REAL concurrent calls** (§14.2 #13), not sequential
  duplicates.
- Completed booking requires `completed_at` (PRD §70; DB CHECK backstop).
- **Concurrency note (architecture §68):** low expected concurrency, but completion is
  now provably safe via `FOR UPDATE`; slot-conflict handling belongs to public booking
  (deferred, OPEN PRODUCT DECISION), not B6.

---

## 8. NextAction semantics

### 8.1 Types & statuses
Seven types (canonical, §2.3). Statuses `PENDING/COMPLETED/SKIPPED/CANCELLED`
(`SKIPPED` = consciously deferred today WITH a next step; distinct from `CANCELLED` =
no longer valid — both terminal, neither has `completed_at`).

### 8.2 Rule → function mapping (deterministic, no AI — PRD §23/arch §23)

| Rule | Trigger | Function | Due / priority |
|---|---|---|---|
| NA-001 | contact.created | `createContactLeadAction` | now + 2h / 75 |
| NA-002 | NEW→CONTACTED | prompt helper (human picks) | — |
| NA-003 | stage=INTERESTED, no active follow-up | `createFollowUp` | next local day 10:00 / 70 |
| NA-004 | WhatsApp sent confirmed | `completeAction` + follow-up prompt | — |
| NA-005 | booking created + UNPAID | `createPaymentReminder` | min(now+2h, start−1d) / 85 |
| NA-005b | booking created + paid, PENDING | `createConfirmBooking` | start / 90 |
| NA-006 | booking CONFIRMED | `createBookingReminder` | start−1d (now if <24h) / 90 |
| NA-007 | payment → PAID/WAIVED | complete pending `REMIND_PAYMENT`; **if booking still PENDING → ensure exactly one `CONFIRM_BOOKING` (R2-6, idempotent)** | — |
| NA-008 | booking COMPLETED | cleanup + aftercare (below) | — |
| NA-009 | booking completed | `createAftercare` (record + action) | completed_at + 7d / 50 |
| SKIP | action skipped | `skipAction(actionId, nextStep)` — **next step REQUIRED** | nextStep.dueAt ?? next local day 10:00 |

### 8.3 Effective priority & primary selection (server-side only)
`effective = base(priority) + 10 (overdue > 1d) + 20 (overdue > 3d)`.
Primary per contact: max effective → earliest `due_at` → oldest `created_at`
(architecture §25). **Frontend never computes this** (§ included in Today/context payloads).

### 8.4 Today read model (`getToday`)
Server groups by org timezone (never server/device implicit timezone, arch §67):
`overdue = due_at < startOfLocalDay`, `today = due_at within local day`,
`upcoming = rest (bounded)`.
**Repository support (R2.1-7):** `totalActiveCount = countPending(ctx)` — its own full
count query, never derived from the limited upcoming result; overdue/today from
`listPendingDueBy(ctx, endOfToday)`; upcoming from bounded `listPendingUpcoming(ctx,
startOfTomorrow, limit)`. Server-side grouping only — no N+1 client assembly.
Items carry `{ action, contact {id, name, phoneE164, stage}, booking? {id, serviceTitle, amount, startAt, status, paymentStatus}, service? {name, category} }`.
Core index `(organization_id, status, due_at)` keeps it cheap (arch §27).

### 8.5 wa.me rule (locked)
`wa.me` opening ⊭ message sent. Only `completeAction(..., {confirmedWhatsAppSent: true})`
completes a messaging-origin action (explicit user confirmation — the client already
implements this via the Yes/No sheet; the server now enforces it).

### 8.6 Unscheduled Class requests — deterministic fallback (P1-6)
`next_actions.due_at` stays **NOT NULL**. The Class seam (`createNextAction` via
LocalPromotorFlowAdapter, §11) accepts an **optional** `dueAt`; when absent → Flow
schedules deterministically: **next local day 10:00 in the org timezone** (same rule as
NA-003; default priority 70 for `FOLLOW_UP`, 40 for `MANUAL`). The B7 adapter can always
satisfy the frozen request contract.

### 8.7 Idempotency keys
- Flow-generated: `aftercare:booking:{bookingId}:d7` (client-parity), booking `idempotency_key` caller-supplied.
- Class (future B7): `promotorclass:{source_event_id}:{rule_id}` per contract §26.
- DB partial unique indexes are the final guard; repository maps uniqueness violations to `CONFLICT` (never 500).

---

## 9. Aftercare semantics — record + action duality (P0-2)

- Booking completion creates **two related entities atomically** (one tx, §7):
  the `aftercare_records` row (persistent domain state) and the AFTERCARE
  `NextAction` (the D+7 task). The record is not a task; the task is not the record.
- **Exactly once per completion**: record guarded by `UNIQUE (organization_id, booking_id)`;
  action guarded by `idempotency_key = 'aftercare:booking:{bookingId}:d7'` + partial
  unique `(organization_id, source, idempotency_key)`; re-running `completeBooking`
  (idempotent, locked) cannot duplicate either. Test matrix: sequential duplicate AND
  true concurrent completion (§14.2 #12/#13).
- Outcome is recorded **at D+7** when the promoter completes the aftercare action
  (`AftercareService.completeAftercare`): record updated (status/outcome/outcome_notes/
  recorded_at) + action completed + `AFTERCARE_COMPLETED` activity. Never prompted at
  booking completion.
- **Temporal guard (R2-7)**: completion requires `now >= scheduled_for` — earlier
  attempts are rejected with the stable error `AFTERCARE_NOT_DUE` (D+6 → rejected,
  D+7 → accepted); repeats after completion are true no-ops — the canonical existing
  completion result is returned with **no new activity and no duplicate follow-ons**
  (R2.1-2, §5.5).
- Outcome enum (canonical): `NO_NEED | HAS_QUESTION | INTERESTED_NEXT_SESSION | CONTACT_LATER`
  (PRD §35; client labels map via adapter §13).
- Follow-ons: `CONTACT_LATER → MANUAL D+30`, `INTERESTED_NEXT_SESSION → FOLLOW_UP D+3`,
  others → none.
- **WhatsApp send decoupling (R2.3-8)**: Aftercare outcome recording NEVER implies or
  fabricates a `WHATSAPP_SENT` event. If aftercare communication occurs via WhatsApp,
  the workflow remains explicitly human-in-the-loop: `WHATSAPP_OPENED` → operator
  confirms "Pesan sudah dikirim?" → `WHATSAPP_SENT` recorded → then outcome may be
  recorded. The outcome recording operation records `AFTERCARE_COMPLETED` and the
  aftercare record, never synthesizing automated message events.
- **Analytics without JSON mining**: pending count, completed count, outcome
  distribution, bookings missing aftercare — direct queries on `aftercare_records`.

---

## 10. Tenant guarantees

1. **Every Flow table carries `organization_id`** with FK `RESTRICT`; every repository
   method requires a valid `OrganizationContext` (runtime guard) and includes the org in
   every WHERE/INSERT. Applies to all **8** tables.
2. **FKs guarantee existence/deletion; tenant equality is enforced at the application
   boundary (R2.1-5)**: business FKs (`contact_id`, `service_id`, `booking_id`) are
   single-column — they prove the parent row exists, NOT that it belongs to the same
   org. Tenant equality is enforced by: repository/service parent validation
   (every parent resolved by `organization_id + id` before any mutation), every
   mutation scoped by `OrganizationContext`, and no route exposing arbitrary SQL or
   un-scoped repositories. Cross-org parent poisoning through any supported surface
   fails closed (`NOT_FOUND`, §14.2 #19/#42). Composite FK infrastructure is
   deliberately NOT added (B1 schema untouched).
3. **No cross-tenant escape hatches**: no un-scoped finders, no bulk exports, no
   `listByUser`-style bypass; service inputs carry only ids + context — org comes from
   context, never from caller payload (arch §10/§75.7).
4. **Trusted actor (P1-7)**: `activities.actor_user_id` only ever comes from the
   server-resolved B2 `AuthenticatedActor`; browser-controlled payloads can never set it.
5. **Soft-deleted contacts invisible**: Flow reads join `contacts` with
   `deleted_at IS NULL` (contact-level filtering follows Shared Core semantics).
6. Integration tests prove org B cannot read/update/delete org A data across ALL eight
   tables (§14.2 #18/#19).
7. B2 session resolution feeds the same minimal `OrganizationContext` later — no B6 code
   change required (frozen type).

---

## 11. Future Class integration seam (prepared, NOT implemented)

- `next_actions` carries `source/source_event_id/source_signal_id/idempotency_key/context_json`
  with the partial unique `(organization_id, source, idempotency_key)` (contract §25/§26).
- Flow-side adapter surface (`src/adapters/local-promotor-flow-adapter.ts`, contract §12)
  implemented over services — `getContactContext`, `getAssessmentStatus`, `createNextAction`
  (validates `LearningNextActionRequest` shape, maps `actionType FOLLOW_UP|MANUAL`,
  **optional `dueAt` → deterministic fallback next local day 10:00 (§8.6)**,
  idempotent via the partial unique), `appendLearningActivity` (writes `CLASS_SIGNAL`
  activity with projection payload). Unit/integration-tested; **no consumer calls it in
  B6** (B7 wires Class).
- **Class requests without `dueAt` are fully satisfiable** — `due_at NOT NULL` holds;
  the frozen request contract is never left dangling (P1-6).
- `PromotorClassAdapter` (reverse, §13: `listEligiblePrograms`, `enrollContact`, …) is
  explicitly NOT in B6 (Class-side capability); Flow's "service completed" hook is the
  B6-side seam — a hook point documented at `completeBooking`, no-op until B7.

---

## 12. API endpoints — B6 owns the Flow API (P1-3, R2.3-6)

B0, B1, B2, and B3 dependency gates are already satisfied. B6 ships zero implementation
until the remaining human gate is explicitly released: **B6 IMPLEMENTATION GO**.
The route layer is part of B6's deliverable and lands inside B6 (PR 7).
All endpoints are strictly versioned under the `/api/v1/flow/*` namespace to prevent
semantic collision with Shared Core contacts. All routes are protected by Better Auth
`sessionMiddleware` + `requireOrganization()` + `requireEntitlement('promotorFlow')` + `requireRole(['owner', 'admin'])`.
Contract below binds the B6 route PR:

```text
GET    /api/v1/flow/today                                          → Today read model (§8.4)
GET    /api/v1/flow/contacts                                      → list (search name/phone, PROSPECT/CLIENT filter)
POST   /api/v1/flow/contacts                                      → createFlowContact (§5.1)
GET    /api/v1/flow/contacts/:id                                  → FlowContactContext (§5.1)
PATCH  /api/v1/flow/contacts/:id                                  → profile fields (sourceChannel/notes)
POST   /api/v1/flow/contacts/:id/stage                            → transitionStage (§5.2) {stage, lostReason?}
GET    /api/v1/flow/contacts/:id/activities                       → timeline
GET    /api/v1/flow/contacts/:id/primary-next-action              → primary (§8.3)
GET    /api/v1/flow/contacts/:id/assessment-status                → contact_assessments (§5.6)
GET    /api/v1/flow/next-actions?contactId=&status=               → list
POST   /api/v1/flow/next-actions                                  → createFollowUp / createManualAction
POST   /api/v1/flow/next-actions/:id/complete                     → completeAction {confirmedWhatsAppSent?} (§8.5)
POST   /api/v1/flow/next-actions/:id/skip                         → skipAction {nextStep:{type,dueAt?,title?,description?}} (REQUIRED, §5.4)
POST   /api/v1/flow/next-actions/:id/cancel                       → cancelAction
POST   /api/v1/flow/next-actions/:id/reschedule                   → rescheduleAction
POST   /api/v1/flow/next-actions/:id/aftercare-complete           → completeAftercare {outcome, notes?}
GET    /api/v1/flow/services                                      → active services
POST   /api/v1/flow/services                                      → createService
PATCH  /api/v1/flow/services/:id                                  → updateService
GET    /api/v1/flow/message-templates?category=                   → list templates
POST   /api/v1/flow/message-templates                             → createTemplate
PATCH  /api/v1/flow/message-templates/:id                         → updateTemplate
GET    /api/v1/flow/aftercare?status=                             → aftercare_records list (analytics)
GET    /api/v1/flow/bookings?from=&to=                            → agenda
POST   /api/v1/flow/bookings                                      → createBooking {serviceId, …, idempotencyKey?} — **no `amount` (server-canonical snapshot, R2-5)**
GET    /api/v1/flow/bookings/:id                                  → booking detail
POST   /api/v1/flow/bookings/:id/confirm                          → confirmBooking
POST   /api/v1/flow/bookings/:id/mark-paid                        → markPaid
POST   /api/v1/flow/bookings/:id/reschedule                       → rescheduleBooking
POST   /api/v1/flow/bookings/:id/complete                         → completeBooking
POST   /api/v1/flow/bookings/:id/cancel                           → cancelBooking
POST   /api/v1/flow/bookings/:id/no-show                          → markNoShow
POST   /api/v1/flow/messaging/whatsapp-opened                     → records WHATSAPP_OPENED (wa.me open ≠ sent)
POST   /api/v1/flow/messaging/confirm-sent                        → completeAction with confirmation (alias of complete)
GET    /p/:slug  GET /api/v1/public/:slug/slots  POST /api/v1/public/:slug/bookings   → OPEN PRODUCT DECISION / post-V0.1
```

Path stability is secondary; the **service signatures are the contract** (arch §50).
Cross-boundary transport DTOs and Zod validation schemas are placed in `@promotor/contracts` (R2.3-5).
Routes are thin: parse/validate request → `OrganizationContext` + `AuthenticatedActor` from B2 middleware → service.

---

## 13. Frontend adapter migration

The frontend is already port-shaped: swap mock repos for HTTP repos behind the same
`ports.ts` interfaces, via `src/adapters/http/flow-http-adapter.ts` (seam exists).
No UI refactor required. Mapping:

| Client fixture field | Server source |
|---|---|
| `FlowContact.stage/classification` | `contact_flow_states.stage` + stored `classification` (§2.8, D1 resolved — sticky, R2-8) |
| `FlowContact.sourceChannel/notes/lostReason` | `contact_flow_states` columns |
| `FlowContact.tags[]` | deferred (OPEN PRODUCT DECISION) → adapter omits until available |
| `FlowService.title` | `services.name` |
| `FlowService.priceAmount/durationMinutes/category/isActive` | `services.price_amount/duration_minutes/category/is_active` |
| `FlowBooking.amount` | **`bookings.amount` — server-canonical snapshot `= services.price_amount` (P0-1, R2-5), NOT joined, never client-supplied** |
| `FlowBooking.serviceTitle` | join `services.name` (display only) |
| `FlowBooking.locationAddress` | `location_text`; `locationType` 1:1 |
| `FlowNextAction.actionType/title/subtitle/dueAt/status/source(+5 integration fields)` | `next_actions` columns; `subtitle` = deterministic projection `description ?? context-derived` (R2-1) — `description` is persisted human-authored text; fallback composed server-side from payload context; never silently dropped |
| Aftercare port (`AftercareRepositoryPort`) | **`aftercare_records`** (list by status, outcome) + `completeAftercare` endpoint — repository boundary preserved, now persistent |
| Assessment status | **`contact_assessments`** (canonical record, §2.6) |
| `MessageTemplate` | **`message_templates`** (categories 1:1) |
| `FlowActivity.type` | `event_type` — **mapping table §2.9** (`WA_SENT→WHATSAPP_SENT`, `FOLLOWUP_CREATED→ACTION_CREATED`(metadata), `BOOKING_*→BOOKING_*`, `CLASS_SIGNAL→CLASS_SIGNAL`, …); `title/detail` → rendered from `event_type + metadata_json` (server read model) |
| Aftercare outcome | `NO_FURTHER_NEED→NO_NEED`, `HAS_QUESTION→HAS_QUESTION`, `NEEDS_FOLLOW_ON_SESSION→INTERESTED_NEXT_SESSION`, `CONTACT_LATER→CONTACT_LATER` |
| `NextActionStatus.SKIPPED` | kept (canonical §8.1); **skip UX unchanged — still requires a next step (P0-6)** |
| Today queue | server `GET /api/v1/flow/today` replaces client-side `getTodayQueue`; `DevControlsOverlay`/mock adapters remain for prototype mode behind an explicit env gate; `org_rina_stifin` hard-coding replaced by session-resolved org |

Sequence: (1) Auth foundation active on master → (2) B6 route PR exposes the API under `/api/v1/flow/*` (§12) → (3) implement
`Http*` repos with fetch + credentials using DTOs from `@promotor/contracts` → (4) container swap behind feature flag →
(5) mock adapters preserved for demo/dev only. Client-side rule logic (booking/lifecycle/
aftercare commands) gets **deleted in favor of server calls** — rules move server-side
(PRD §77, arch §75.2), never duplicated in the client. Lifecycle stage picker needs no
client change (server is operator-directed, any stage selectable).

---

## 14. Test plan

### 14.1 Unit (node:test, no DB — `src/__tests__/*.test.ts`, B1 style)
- **Lifecycle (operator-directed)**: any→any accepted (`NEW→INTERESTED`, `NEW→COMPLETED`
  normal); `→LOST` requires reason; leaving LOST clears `lost_reason`; LOST cancels
  active actions; NA-002/NA-003 side-effect triggers fire only on stage entry.
- **Priority**: base + overdue modifiers (1d/3d boundaries); primary selection
  (priority → due → created ordering).
- **Due grouping** (pure, fixed `now` + Asia/Jakarta): overdue/today/upcoming boundary
  cases incl. UTC-vs-local day rollover.
- **Rule due computations**: NA-005 `min(now+2h, start−1d)`; NA-006 H-1 and <24h short-cut;
  NA-003 next-day-10:00 local; NA-009 +7d; **Class no-dueAt fallback = next local day
  10:00 local (P1-6)**.
- **Aftercare outcome follow-ons**: CONTACT_LATER→MANUAL D+30; INTERESTED_NEXT_SESSION→FOLLOW_UP D+3; others none.
- **Assessment precedence**: pure function `COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED`
  (A CANCELLED / B COMPLETED / C PENDING → COMPLETED).
- **Classification sticky semantics (D1 resolved, R2-8, R2.1-1)**: new contact →
  `PROSPECT`; `CLIENT` promotion ONLY via `transitionStage('COMPLETED')` (operator or
  booking completion); later movement (`COMPLETED → FOLLOW_UP`) **never auto-demotes**;
  the lifecycle seam has no demotion path (classification is never an input).
- **Taxonomy completeness**: catalog §2.9 emit-set ⊆ CHECK-set; every type has a UI
  projection key (single source of truth module `src/domain/activity-catalog.ts`).
- **Schema guardrails & contracts compatibility**: source-guardrail extension (runtime `src/` still never touches
  `DATABASE_URL`); `@promotor/contracts` ownership preserved (B6 MUST NOT break frozen Shared Core or Class contracts; B6 MAY make additive backward-compatible Flow HTTP DTO additions; contract baseline hash guardrail is deliberately re-baselined).
- **Idempotency key builders**: `aftercare:booking:{id}:d7`; partial-unique semantics.

### 14.2 Integration (real PostgreSQL, CI `postgres:16`, runtime role)

| # | Test | Assertions |
|---|---|---|
| 1 | lifecycle happy path | operator-directed NEW→…→COMPLETED via 5.2; flow-state row + STAGE_CHANGED activities |
| 2 | any→any allowed | e.g. `NEW→INTERESTED`, `NEW→COMPLETED` direct — accepted (no transition matrix) |
| 3 | LOST rules | LOST without reason → VALIDATION error + DB CHECK rejects; with reason → stage LOST + pending actions cancelled; leaving LOST → lost_reason NULL |
| 4 | contact created → NA-001 | two-phase onboarding (Phase 1 contact durable; Phase 2 retry-safe); CONTACT_LEAD due≈now+2h, priority 75, CONTACT_CREATED activity |
| 5 | action create/complete/reschedule/skip | statuses; completed_at set iff COMPLETED; due_at updates; **skip without nextStep rejected; skip with nextStep → SKIPPED + new FOLLOW_UP atomic**; events ACTION_CREATED/COMPLETED/RESCHEDULED/SKIPPED/CANCELLED |
| 6 | due grouping | seeded due_at set → getToday correct overdue/today/upcoming counts |
| 7 | wa.me does not complete | completeAction without `confirmedWhatsAppSent` → action stays PENDING |
| 8 | booking create | booking + **amount snapshot stored** + stage BOOKED + REMIND_PAYMENT/CONFIRM_BOOKING + activities, one tx (failure mid-way → nothing persisted) |
| 9 | booking reschedule | reminders recreated; no stale REMIND_BOOKING at old time; BOOKING_RESCHEDULED |
| 10 | payment update | UNPAID→PAID; pending REMIND_PAYMENT completed (ACTION_COMPLETED completedBy=PAYMENT); PAYMENT_MARKED activity |
| 11 | booking completion | booking COMPLETED + completed_at; contact COMPLETED; stale actions cancelled; **aftercare record + AFTERCARE action created**; BOOKING_COMPLETED + AFTERCARE_CREATED |
| 12 | D+7 aftercare exactly once (sequential) | `completeBooking` called twice → single record + single action; second call idempotent no-op |
| 13 | **concurrent completion** | **two concurrent DB clients (`Promise.all`)**: one completed booking, one BOOKING_COMPLETED, one aftercare record, one AFTERCARE action, one AFTERCARE_CREATED (P0-8) |
| 14 | aftercare outcome at D+7 | `completeAftercare` updates record (status/outcome/outcome_notes/recorded_at) + completes action + activity metadata; follow-ons per outcome; no outcome prompt at completion; NO fabricated WHATSAPP_SENT (R2.3-8) |
| 15 | aftercare analytics | pending/completed counts, outcome distribution, bookings-without-aftercare via UNIQUE(org, booking) |
| 16 | assessment sync | assessment booking create/complete/cancel/no-show → contact_assessments updated (precedence: A CANCELLED + B COMPLETED + C PENDING → COMPLETED); UNIQUE(org, contact); ASSESSMENT_STATUS_CHANGED |
| 17 | templates CRUD | org-scoped; category CHECK; is_active filter; no cross-org read |
| 18 | tenant isolation | org A writes cannot be read/updated by org B (**all 8 tables — `next_actions` + `activities` covered explicitly**); cross-org read → null/empty |
| 19 | cross-org access denial | service calls with org B context on org A ids → NOT_FOUND (never data leak) |
| 20 | FK behavior | booking/action/activity/aftercare/assessment for missing contact impossible; org hard-delete with flow data → RESTRICT; flow-state / assessment UNIQUE(contact_id); aftercare UNIQUE(org, booking) |
| 21 | idempotency fields | partial unique `(org, source, idempotency_key)` rejects dupes, allows null keys, allows same key across orgs; booking idempotency_key |
| 22 | runtime grants | after `grants_b6.sql`: 7 tables × 4 CRUD (28) + activities (SELECT, INSERT = 2) = **30 new capabilities**; B1 20 + B2 20 + B3 24 still pass → **94 total runtime privilege checks**; runtime UPDATE/DELETE on activities DENIED; runtime CREATE in public DENIED (R2.3-3) |
| 23 | migration reproducibility | apply canonical history from blank (0000 B1 → 0001 B2 → 0002 B3 → 0003 B6); apply B6 entry (0003) over migrated B1+B2+B3 with seeded predecessor data; journal hash stable across all 4 entries; schema matches canonical (R2.3-4) |
| 24 | **taxonomy completeness** | parametrized: run every service operation → assert each emitted `event_type` accepted by CHECK + has deterministic projection (P0-9) |
| 25 | Class adapter | `createNextAction` with dueAt → as given; without dueAt → next local day 10:00; `promotorclass:` keys idempotent (duplicate → CONFLICT → reused); appendLearningActivity → CLASS_SIGNAL; getContactContext/getAssessmentStatus |
| 26 | two-phase onboarding | Phase 2 failure (simulated) → retry succeeds; contact without flow state remains valid |
| 27 | markPaid on PENDING (R2-6) | UNPAID→PAID on a still-PENDING booking → exactly ONE `CONFIRM_BOOKING` created; repeat `markPaid` → no duplicates (idempotent); `REMIND_PAYMENT` completed; PAYMENT_MARKED |
| 28 | aftercare temporal guard (R2-7) | D+6 `completeAftercare` → `AFTERCARE_NOT_DUE` rejected; D+7 → accepted; repeat completion → idempotent no-op (no duplicate follow-ons) |
| 29 | classification sticky (R2-8) | new contact → PROSPECT; booking completion → CLIENT; operator `COMPLETED→FOLLOW_UP` later → **stays CLIENT** (never auto-demoted); direct stage writes never mutate classification |
| 30 | amount immutable (R2-5) | client-supplied `amount` rejected/ignored (server resolves from `serviceId`); later `services.price_amount` edit → existing `bookings.amount` unchanged |
| 31 | next_actions/activities constraints (R2-1) | both tables: CHECKs (status⇔completed_at bijection; action_type/event_type catalogs; priority range), partial unique `(org, source, idempotency_key)`, FK behavior incl. `actor_user_id` SET NULL policy; activities append-only (no update/delete surface) |
| 32 | description/subtitle projection (R2-1) | `description` persisted verbatim; `subtitle` = `description ?? context-derived` fallback; absent description never silently dropped |
| 33 | lifecycle COMPLETED promotes CLIENT (R2.1-1) | operator `transitionStage(ctx, contactId, 'COMPLETED')` → classification `CLIENT` atomically (same tx); `STAGE_CHANGED` recorded; no separate classification write needed |
| 34 | completion uses lifecycle authority (R2.1-1) | `completeBooking` → contact reaches `COMPLETED` via tx-scoped `ContactLifecycleService` (classification → `CLIENT`, `STAGE_CHANGED` present); the service path never issues a direct `UPDATE contact_flow_states` |
| 35 | CLIENT stays sticky (R2.1-1) | after `CLIENT`, later `transitionStage` (e.g. `COMPLETED→FOLLOW_UP`, `→LOST`) keeps `CLIENT`; repository seam has no demotion path |
| 36 | booking terminal-state guards (R2.1-3) | confirm on COMPLETED/CANCELLED/NO_SHOW → `INVALID_BOOKING_STATE`; reschedule/cancel/no-show on terminal → `INVALID_BOOKING_STATE`; complete on PENDING → `INVALID_BOOKING_STATE` (confirm first); complete on CANCELLED/NO_SHOW → `INVALID_BOOKING_STATE`; repeat complete×2 / cancel×2 / no-show×2 → idempotent no-op |
| 37 | aftercare repeat is a true no-op (R2.1-2) | second `completeAftercare` (action + record both COMPLETED) → canonical existing result returned; NO duplicate `AFTERCARE_COMPLETED` activity; NO duplicate follow-ons |
| 38 | assessment emission via declared dependency (R2.1-4) | assessment-category booking ops → `ASSESSMENT_STATUS_CHANGED` emitted through the tx-scoped `activities` factory injected into `createAssessmentService` (same tx as booking); no undeclared/outer-handle activity writes |
| 39 | messaging org-scoped phone resolution (R2.1-4) | `buildWaDeepLink` resolves `phone_e164` only from an ACTIVE (`deleted_at IS NULL`) contact in the same org; other-org / soft-deleted / missing contact → `NOT_FOUND` |
| 40 | actor write seam (R2.1-6) | `append(ctx, actor?, …)`: `actor_user_id` set only from server-resolved B2 `AuthenticatedActor`; system/internal events → NULL; browser-supplied actor values rejected/never accepted (no service input carries `actorUserId`) |
| 41 | Today count vs bounded upcoming (R2.1-7) | with upcoming list limited, `totalActiveCount = countPending(ctx)` stays the FULL pending count (own query, not derived from the limited result); server-side grouping, no N+1 |
| 42 | cross-org parent poisoning (R2.1-5, R2.3-7) | org B creating/updating a row with org A `contact_id`/`service_id`/`booking_id` parent → `NOT_FOUND` fails closed (repo resolves by `organization_id + id` AND `deleted_at IS NULL`); getOrCreate seams conditionally insert from active contacts table; DB-level single-column FKs alone never admit cross-org rows through supported paths |

### 14.3 Live acceptance (operator-run, post-implementation)
`tooling/b6-live-acceptance.ts` on a Neon rehearsal branch, mirroring B1's sequence:
migrate as owner → `grants_b6.sql` as owner (fail-fast) → runtime CRUD + isolation +
**expected 94 privilege checks (20 B1 + 20 B2 + 24 B3 + 30 B6; UPDATE/DELETE on activities denied, CREATE in public denied, R2.3-3)** → Worker health. Production = human-approved gate + audit record
(B1 rule).

---

## 15. Grants

New committed file `docs/sql/grants_b6.sql` (role names only, B1 style, no credentials):

```sql
-- Schema usage
GRANT USAGE ON SCHEMA public TO promotor_runtime;

-- B6 Flow tables (explicit, reviewable per milestone) — 8 tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bookings TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.next_actions TO promotor_runtime;
GRANT SELECT, INSERT ON TABLE public.activities TO promotor_runtime; -- True append-only least privilege (UPDATE/DELETE denied, R2.3-3)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_flow_states TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.aftercare_records TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_assessments TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_templates TO promotor_runtime;
```

- `grants_b1.sql` (20), `grants_b2.sql` (20), and `grants_b3.sql` (24) are the canonical/frozen predecessors on master.
- B6 contributes its own `grants_b6.sql`: 7 tables × 4 CRUD (28) + 1 table (`activities`) × 2 (`SELECT, INSERT`) = **30 capabilities**.
- Total runtime privilege capabilities: B1 (20) + B2 (20) + B3 (24) + B6 (30) = **94 / 94**.
- `scripts/ci-setup-db.sh` appends `-f docs/sql/grants_b6.sql` (executed at B6 implementation time).
- Still NO `ALTER DEFAULT PRIVILEGES`, no DDL, no ownership.
- **Runtime least privilege checks: B1 (5×4 = 20) + B2 (5×4 = 20) + B3 (6×4 = 24) + B6 (7×4 + 1×2 = 30) = total 94 capabilities (with UPDATE/DELETE on activities denied, and CREATE in public schema denied).**
- `availability_rules`/`tags` are NOT counted (deferred, OPEN PRODUCT DECISION).

---

## 16. Migration plan

- ONE Drizzle history; canonical B1 (`0000_fluffy_prowler.sql`), B2 (`0001_shocking_black_widow.sql`), and B3 (`0002_heavy_scarlet_witch.sql`) exist on master.
- B6: 8 schema files (§3), `pnpm --filter @promotor/platform-api db:generate` → `0003_...` B6 migration entry + journal entry + snapshot. **Final numbering is serialized as 0003 against canonical master** — B6 never renumbers or rewrites predecessor files (migration discipline, B1 §3).
- Apply as owner (`DATABASE_URL` = owner, tooling-only; runtime never reads it —
  source-guardrail test covers `src/db/`), then `grants_b6.sql` as owner, fail-fast.
- Seeds (default services / templates) stay out of migrations — separate seed tooling or
  none in B6 (PRD suggests defaults; does not require seeding).
- Rehearse on a Neon branch; reproduction test validates applying `0003` over clean blank DB and over migrated B1+B2+B3 database with seeded predecessor data; production run human-approved with the B1 audit record
  (milestone, approved SHA, actor, UTC, environment, migration names + hashes, grant
  version, preflight/postflight, deployed Worker version; no credentials).

---

## 17. Detailed implementation tasks — ALL GATED (deferred until authorized, R2-2)

**Every PR below (2–8) is gated solely on an explicit human B6 implementation GO.**
Predecessor milestone gates (B0, B1, B2, B3) are satisfied and FINAL ACCEPTED / FROZEN on master.
Before the implementation gate: no schema files, no migration, no grants, no
repositories, no services, no routes, no frontend changes — this document is the plan.

**PR 1 — Recon/plan:** this document (Revision R2.3). Review gate. No code.

**PR 2 — `feat/b6-flow-schema-grants` (GATED: explicit B6 GO):**
1. `src/db/schema/{services,bookings,next-actions,activities,contact-flow-states,aftercare-records,contact-assessments,message-templates}.ts` (+ `index.ts` append after B3's)
2. `db:generate` → `0003_...` B6 migration entry + journal + snapshot
3. `docs/sql/grants_b6.sql` (8 tables, activities SELECT+INSERT only)
4. `scripts/ci-setup-db.sh` append grants_b6
5. Integration tests: tables exist; CHECK constraints reject bad values (stage/lost_reason
   pair, status/completed_at pair, action_type/event_type catalogs, amount < 0, enums,
   priorities, aftercare/assessment/template CHECKs), partial uniques, FKs,
   migration-from-canonical/blank (0000→0001→0002→0003), seeded B1+B2+B3 migration test,
   journal hash across all 4 entries, **runtime privilege checks (94/94)**

**PR 3 — `feat/b6-flow-repositories` (GATED: explicit B6 GO):**
6. `src/repositories/{service,booking,next-action,activity,contact-flow,aftercare,assessment,template}-repository.ts`
   (org-scoped, `isOrganizationContext` guard, active tenant parent verification on `getOrCreate` / mutations, unique-violation mapping, `lockById` FOR UPDATE)
7. Unit tests for repository-adjacent pure logic (key builders, guards)

**PR 4 — `feat/b6-flow-domain-rules` (GATED: explicit B6 GO):**
8. `src/domain/contact-lifecycle.ts` (pure operator-directed semantics — any→any, LOST rules, NA-002/NA-003 triggers)
9. `src/domain/next-action-rules.ts` (NA-001…NA-009 + skip-next-step due/priority functions)
10. `src/domain/priority.ts` (effective priority + primary selection) + `src/domain/today-grouping.ts` (timezone-aware)
11. `src/domain/assessment.ts` (precedence) + `src/domain/activity-catalog.ts` (taxonomy source of truth) — **no `classification.ts` derived formula (classification stored/sticky, D1 resolved R2-8)**
12. Unit tests for each (§14.1)

**PR 5 — `feat/b6-flow-services` (GATED: explicit B6 GO):**
13. `src/services/contact-flow-service.ts` (two-phase onboarding), `contact-lifecycle-service.ts`
14. `src/services/booking-service.ts` (create/confirm/mark-paid/reschedule/complete/cancel/no-show; one-tx orchestration; FOR UPDATE completion)
15. `src/services/next-action-service.ts` (engine + wa.me rule + skip-requires-next-step + Today read model)
16. `src/services/aftercare-service.ts`, `assessment-service.ts`, `template-service.ts`, `messaging-service.ts`
17. Integration test matrix §14.2 (full — 42 cases, incl. concurrent completion, R2-5/6/7/8, R2.1 #33–#42, R2.3 #42 parent fail-closed)

**PR 6 — `feat/b6-class-seam` (GATED: explicit B6 GO):**
18. `src/adapters/local-promotor-flow-adapter.ts` (contract §12 surface, validated; optional dueAt → fallback)
19. Tests: createNextAction idempotency with `promotorclass:` keys, duplicate rejection,
    no-dueAt fallback, appendLearningActivity → CLASS_SIGNAL, getContactContext/getAssessmentStatus

**PR 7 — `feat/b6-flow-api` (GATED: explicit B6 GO):**
20. Additive Flow transport DTOs and Zod validation schemas added to `@promotor/contracts` (contracts hash re-baselined)
21. Hono route layer per §12 under `/api/v1/flow/*` (thin; session → `OrganizationContext` + `AuthenticatedActor` from B2 middleware)
22. Route integration tests (happy path + auth-denied paths)

**PR 8 — `feat/b6-rehearsal-docs` (GATED: explicit B6 GO):**
23. `tooling/b6-live-acceptance.ts` + Neon rehearsal record
24. `docs/backend/B6_PROMOTORFLOW.md` milestone doc (acceptance record per B1 rule)
25. Frontend adapter migration (§13) — sequenced after the B6 route PR; mock
    adapters preserved behind env gate

---

## 18. Decisions / risks for review

| # | Topic | Decision / risk |
|---|---|---|
| D1 | **Classification stored/sticky — RESOLVED (R2-8)** | `contact_flow_states.classification` (`PROSPECT` default; `CLIENT` on booking completion or operator transition → COMPLETED; **never auto-demoted** — later stage movement keeps `CLIENT`). Architecture §15 derivation superseded by explicit storage; derived `src/domain/classification.ts` removed. Manual reclassification = future product op |
| D2 | Booking `amount` snapshot (P0-1, R2-5) | Stored on `bookings` at creation — **server-canonical `= services.price_amount` (client never supplies `amount`)**; historical correctness over join simplicity; serviceTitle stays display-join; `amountOverride` = future explicit permissioned feature |
| D3 | Aftercare record & WhatsApp decoupling (P0-2, R2.3-8) | `aftercare_records` + AFTERCARE action duality, exactly-once per booking; analytics without JSON mining. Recording aftercare outcome NEVER fabricates `WHATSAPP_SENT` (human-in-the-loop send confirmation required) |
| D4 | Assessment record (P0-3) | `contact_assessments` canonical current record, precedence `COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED`; derived-only rejected (multi-booking projection ambiguous) |
| D5 | Message templates in B6 (P0-4) | Storage only — no WhatsApp automation; categories mirror non-manual action types |
| D6 | Operator-directed lifecycle (P0-5) | Any→any selectable; LOST rules enforced; booking side effects; no strict funnel (would be a separate product change) |
| D7 | Skip requires next step (P0-6) | `skipAction(actionId, nextStep)` atomic; preserved from canonical client behavior |
| D8 | Availability / tags (P1-4) | **OPEN PRODUCT DECISION — post-V0.1**, no canonical milestone; excluded from grants arithmetic |
| D9 | Routes owned by B6 & versioned (P1-3, R2.3-6) | Route layer inside B6 under `/api/v1/flow/*`; prevents semantic collision with Shared Core contacts |
| D10 | Migration numbering (P1-5, R2-3, R2.2) | Explicitly serialized as `0003` against canonical master post-B3 merge |
| D11 | Phone required vs PRD "optional" | Frozen B1 contract wins; flagged to product for a later decision |
| D12 | `SKIPPED` status beyond PRD's 3 statuses | Kept: fixtures + canonical test require "skip with next step"; DB CHECK + documented deviation |
| D13 | `interest`, `result_type`, `deposit_amount` (P1-2) | Removed — no current-source evidence; re-add only with a fixture/product source |
| D14 | Concurrent completion (P0-8) | `SELECT … FOR UPDATE` + unique partials; true concurrent test (#13) |
| D15 | `CLASS_SIGNAL` activity type | Seam-only, no consumer in B6; supports contract §12 `appendLearningActivity` |
| D16 | Transport contracts ownership (R2.3-5) | `@promotor/contracts` owns cross-boundary DTOs & schemas; B6 adds backward-compatible Flow DTOs without breaking Shared Core/Class contracts; baseline hash re-baselined intentionally |
| D17 | Activities append-only least privilege (R2.3-3) | `activities` table gets `GRANT SELECT, INSERT` only (UPDATE/DELETE denied); total runtime privilege checks = 94 capabilities |

---

## 19. Definition of done (B6, when authorized to implement)

- **8 Flow tables** in the single Drizzle history (`services, bookings, next_actions,
  activities, contact_flow_states, aftercare_records, contact_assessments,
  message_templates`); final numbering `0003_...` serialized; journal stable across all 4 entries.
- `grants_b6.sql` (8 tables) + CI wiring; **runtime privilege checks pass — 20 B1 + 20 B2 + 24 B3 + 30 B6 = 94 / 94 capabilities**; runtime UPDATE/DELETE on activities denied; runtime CREATE in public still denied.
- Repositories org-scoped with no escape hatches; tx-scoped composition (§5.0);
  trusted-actor rule for `actor_user_id` (§4); active tenant contact validation on `getOrCreate` and parent seams (§4, §10).
- Services own ALL business rules (operator-directed lifecycle via the SINGLE
  `ContactLifecycleService` writer with atomic `CLIENT` promotion (R2.1-1),
  NA-001…NA-009, wa.me confirmation, skip-requires-next-step, aftercare record+action
  exactly-once, aftercare execution order (R2.1-2), aftercare WhatsApp send decoupling (R2.3-8), booking terminal-state guards
  (R2.1-3), aftercare temporal guard `AFTERCARE_NOT_DUE` (R2-7), assessment sync
  precedence, server-canonical amount (R2-5), stored/sticky classification (R2-8),
  markPaid → CONFIRM_BOOKING (R2-6), explicit factory dependencies + actor seam
  (R2.1-4/6)) inside transactions; completion uses `FOR UPDATE`.
- Test matrix §14.2 (42 integration cases, incl. **true concurrent completion**,
  R2-5/6/7/8 cases, and R2.1 consistency cases #33–#42) +
  §14.1 unit suites green on real PG in CI.
- Activity taxonomy §2.9 complete: every service-emitted event accepted by DB CHECK
  with deterministic UI projection (test #24).
- LocalPromotorFlowAdapter seam ready (tested), zero Class consumption; Class no-dueAt
  fallback defined (§8.6).
- Flow API route layer implemented **inside B6** once an explicit B6 implementation GO is issued (§12/§17 PR 7).
- Rehearsed on Neon branch; production acceptance record per B1 audit rule.
- Zero changes to: B1/B2/B3 migration/grant files, `@promotor/contracts`, Shared Core tables.
- No WhatsApp auto-send, no payment gateway, no availability/tags tables, no temporary auth.
