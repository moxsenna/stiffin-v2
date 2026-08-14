# B3 — PromotorClass Canonical Persistent Content Management Plan

**Status:** PLAN ONLY — ACCEPTED / FROZEN (2026-08-14). No implementation. B3 stays blocked until B2 (Better Auth) implementation is FINAL ACCEPTED / FROZEN and B3 receives an explicit implementation GO.
**Revision:** R4.1 — publication sync (chronology refreshed to canonical master; NO architecture changes). Design baseline: master @ `c121f860fa03e5338286483c368e99dbe07add22` (historical — not the current canonical master).
**Domain:** PromotorClass — programs / modules / lessons / content / publishing / presentation
**B2 status (current canonical master):** B2 reconnaissance/architecture plan is ACCEPTED / FROZEN on canonical master (`docs/backend/B2_RECONNAISSANCE.md`). B2 implementation is NOT yet FINAL ACCEPTED / FROZEN. B3 implementation remains BLOCKED until B2 implementation is FINAL ACCEPTED / FROZEN and B3 receives explicit implementation GO. This document designs B3 against the abstract server-resolved `OrganizationContext`; schema DESIGN may run in parallel — schema CODE, `db:generate`, routes, and migration finalization stay BLOCKED.

---

## 1. Current frontend/mock domain audit

### 1.1 Where the domain lives today (all mock)

| Concern | Location |
|---|---|
| Contracts (Program/Module/Lesson/Enrollment/Reflection/Event/Signal) | `packages/contracts/src/index.ts` (frozen hash during B1) |
| Seed fixtures | `packages/promotor-class-fixtures/src/index.ts` (`SEED_PROGRAMS` etc., org `org_stifin_parenting` / slug `rina`) |
| In-memory state | `apps/promotor-class-web/src/adapters/mock/mock-state-store.ts` (localStorage `promotor_class_mock_state_v2`) |
| Program mock repo | `apps/promotor-class-web/src/adapters/mock/program-repository.ts` |
| Storefront mock repo + presentation maps | `apps/promotor-class-web/src/adapters/mock/public-storefront-repository.ts` |
| Ports | `apps/promotor-class-web/src/modules/programs/ports.ts`, `src/modules/public-storefront/ports.ts` |
| Queries/Commands | `apps/promotor-class-web/src/modules/programs/{queries,commands}.ts`, `src/modules/public-storefront/{queries,commands}.ts` |
| YouTube parsing (web, Class-owned) | `apps/promotor-class-web/src/lib/video/parse-youtube-url.ts` |
| API client (get/post only) | `packages/api-client/src/index.ts` |
| HTTP adapter (stub) | `apps/promotor-class-web/src/adapters/http/index.ts` (throws `HttpApiAdapterNotImplementedError`) |
| Backend (health only, no content routes) | `apps/platform-api/src/app.ts` |

### 1.2 Screens consuming the domain

- Promotor: `(promotor)/app/programs` (list), `/programs/new`, `/programs/[programId]` (module CRUD, reorder, publish toggle), `/programs/[programId]/lessons/[lessonId]` (lesson editor)
- Public: `(public)/p/[workspaceSlug]` + `/catalog`, `/p/[workspaceSlug]/[programSlug]` (landing)
- Learner: `(learner)/learn/programs/[enrollmentId]` + `/lessons/[lessonId]` (reader: video embed, text, attachments, reflection, CTA)
- Settings: `(promotor)/app/storefront` (workspace profile editing — currently localStorage only)

### 1.3 Current type shapes (quoted from contracts)

- `ProgramType = 'lead_magnet' | 'aftersales' | 'paid' | 'private' | 'challenge'` (challenge reserved/future)
- `AccessType = 'public' | 'private' | 'manual'`
- `ProgramStatus = 'draft' | 'published' | 'archived'`
- `ProgramPricing = 'free' | 'one_time'`
- `Lesson`: id, moduleId, title, order, optional `textContent`, `videoYoutubeUrl`, `videoExternalId`, `attachments[] ({id,name,url,sizeFormatted})`, `hasReflection`, `reflectionType ('long_text'|'single_select'|'multi_select')`, `reflectionPrompt`, `hasCta`, `ctaLabel`, `ctaUrl` — **composite by design: one lesson may simultaneously carry video + text + attachments + reflection + CTA**
- `Module`: id, programId, title, order, lessons[]
- `Program`: id, organizationId, workspaceSlug, programSlug, title, subtitle?, description?, programType, accessType, status, pricing, priceAmount?, modules[], createdAt, updatedAt
- Web-local (NOT in contracts): `PublicWorkspaceProfile`, `ProgramPublicPresentation {coverVariant, featured, heroEyebrow, shortOutcome, durationLabel, learningOutcomes[]}`, `PublicProgramCatalogItem`, `PublicProgramDetail` in `apps/promotor-class-web/src/modules/public-storefront/types.ts`

### 1.4 Current behaviors worth preserving

- Create program → status `draft`, one starter module + one starter lesson (mock behavior)
- Publish toggle: `draft ↔ published`; drafts hidden from public storefront
- Public catalog: `status==='published'`, excludes `accessType==='private'` and `programType==='private'`
- Registration policy: only `lead_magnet` + `public` + `free` allows self-registration; aftersales/paid show notices (B4 policy — B3 stores the canonical state it reads)
- Mock `createProgramDetailed` persists a `programPresentations` entry **including `imageUrl`**; `MOCK_PRESENTATION_MAP` is the fallback for seed programs
- YouTube: parse + `videoExternalId` extraction client-side (Class-owned helper); official embed URL `https://www.youtube.com/embed/{id}`; manual completion only

### 1.5 Guardrails that constrain B3

- `domain-guardrails.test.ts`: UI files must not import `MockStateStore`, `/adapters/mock/`, or `@promotor/promotor-class-fixtures`
- B1 source guardrails: runtime `src/` never references `DATABASE_URL`; contracts hash frozen (B3 re-baselines deliberately)
- B1: no org-scoped HTTP surface without auth; Hyperdrive-only DB access; explicit per-table grants

---

## 2. Canonical ownership map

| Concern | Owner | B3 |
|---|---|---|
| `programs`, `modules`, `lessons`, `lesson_attachments` | PromotorClass | YES — schema + repos + services |
| Program publishing, visibility, presentation (`program_presentations`, `workspace_profiles`) | PromotorClass | YES |
| Reflection question definition (incl. `reflection_options`) | PromotorClass | YES — B3 owns definition; B5 owns learner responses |
| CTA definition (canonical typed CTA) | PromotorClass | YES — B3 owns config; B7 owns FLOW_BOOKING adapter integration |
| YouTube URL parsing / embed | PromotorClass | YES — Class-owned helper, NOT platform-core |
| `organizations`, `users`, `organization_members`, `contacts`, `product_entitlements` | Shared Core (B1, frozen) | READ-ONLY (FK targets; org slug for public paths) |
| Auth/session → `OrganizationContext` resolution | B2 Better Auth | NOT implemented — abstract seam only |
| Enrollments, progress, reflections responses, learning events, signals, intent | PromotorClass (B4/B5) | NOT in B3 — no tables, no code |
| PromotorFlow (incl. FLOW_BOOKING target), referrals, payments, cross-app events | other domains (B7+) | NOT in B3 — no cross-domain FK, config-only seam |

---

## 3. Proposed persistent schema

Location: `apps/platform-api/src/db/schema/` — new files `programs.ts`, `modules.ts`, `lessons.ts`, `lesson-attachments.ts`, `program-presentations.ts`, `workspace-profiles.ts`, exported from `index.ts`. Follows B1 conventions exactly: `uuid DEFAULT gen_random_uuid()` PKs, `timestamptz` (mode string, `defaultNow()`), `updated_at` application-maintained, CHECK constraints, org-scoped unique indexes.

**B3 schema is DESIGN ONLY.** Schema code and `db:generate` remain blocked until B2 is frozen and B3 implementation receives explicit GO (§12).

### 3.1 `programs`

```ts
id              uuid PK defaultRandom
organization_id uuid NOT NULL FK → organizations.id ON DELETE RESTRICT
slug            text NOT NULL                                  // unique per organization
title           text NOT NULL CHECK char_length > 0
subtitle        text
description     text
program_type    text NOT NULL CHECK IN ('lead_magnet','aftersales','paid','private')  // 'challenge' NOT in V0.1
access_type     text NOT NULL DEFAULT 'public' CHECK IN ('public','private','manual')
status          text NOT NULL DEFAULT 'draft' CHECK IN ('draft','published','archived')
pricing         text NOT NULL DEFAULT 'free' CHECK IN ('free','one_time')
price_amount    integer NOT NULL DEFAULT 0 CHECK price_amount >= 0   // FROZEN V0.1 representation — always 0 when free, > 0 when one_time
published_at    timestamptz                                    // set on publish, NULL otherwise
created_at / updated_at  timestamptz NOT NULL DEFAULT now()
```

- Uniqueness: `uniqueIndex('programs_org_slug_unique').on(organization_id, slug)` — program-slug uniqueness per organization; the same slug is allowed across different organizations
- Indexes: `(organization_id, status)` (catalog queries), `(organization_id, program_type)` (B4 policy)
- **Frozen price representation (V0.1):** `price_amount` is `INTEGER NOT NULL DEFAULT 0` with `CHECK price_amount >= 0`. Cross-field invariants (service validation is the minimum obligation; **the DB cross-field CHECK is REQUIRED** — the rules below are the frozen V0.1 set):
  - `pricing = 'free'` ⇒ `price_amount = 0`
  - `pricing = 'one_time'` ⇒ `price_amount > 0`
  - Frozen per-type minimal rules (the exact V0.1 freeze list — nothing more is frozen):
    - `program_type = 'lead_magnet'` ⇒ `access_type = 'public'` AND `pricing = 'free'`
    - `program_type = 'aftersales'` ⇒ `access_type = 'manual'` AND `pricing = 'free'`
    - `program_type = 'paid'` ⇒ `pricing = 'one_time'`
    - `program_type = 'private'` ⇒ `access_type = 'private'`
  - For `private`, pricing is NOT frozen to a single value; the two pricing/amount invariants above still apply (free ⇒ 0, one_time ⇒ > 0)
  - `access_type` for `paid` stays the §5 create default (`public`) but is not part of the frozen DB rules
- `workspaceSlug` in the contract = `organizations.slug` (joined at read time — never stored duplicated)
- Archive = `status='archived'`. No hard delete and no `deleted_at` on `programs` (contracts already have `archived`; avoids double delete-semantics). Archived stays in admin lists, hidden from public.

### 3.2 `modules`

```ts
id         uuid PK; program_id uuid NOT NULL FK → programs.id ON DELETE CASCADE
title      text NOT NULL CHECK char_length > 0
order      integer NOT NULL CHECK order > 0
created_at / updated_at
uniqueIndex (program_id, order)
```

### 3.3 `lessons` (COMPOSITE — no exclusive `body_type`)

The canonical Lesson is composite: one lesson may simultaneously carry video, text, attachments, a reflection definition, and a CTA. There is **no required single-type discriminator** and **no tagged union**. Each content component is an independent, optional persistent field; the service validates that at least one content component is present and that each present component is internally valid.

```ts
id         uuid PK; module_id uuid NOT NULL FK → modules.id ON DELETE CASCADE
title      text NOT NULL CHECK char_length > 0
order      integer NOT NULL CHECK order > 0

-- content components (all optional, composite by design)
text_content        text

video_provider      text CHECK IN ('youtube')      // Class-owned provider abstraction; V0.1 only youtube
video_url           text                            // canonical watch URL as entered
video_external_id   text CHECK video_external_id ~ '^[A-Za-z0-9_-]{11}$'

-- reflection definition (B3 owns definition; B5 owns learner responses)
reflection_type     text CHECK IN ('long_text','single_select','multi_select')
reflection_prompt   text
reflection_options  jsonb                          // [{ "id": "opt_a", "label": "Sering" }, ...] — stable option IDs; rules below

-- canonical typed CTA (B3 owns definition; B7 owns FLOW_BOOKING adapter integration)
cta_type             text CHECK IN ('WHATSAPP','FLOW_BOOKING','EXTERNAL','ENROLL_PROGRAM')
cta_label            text
cta_target_program_id uuid FK → programs.id ON DELETE SET NULL   // ENROLL_PROGRAM only; tenant-validated in service
cta_config           jsonb                         // typed per cta_type — see rules below

created_at / updated_at
uniqueIndex (module_id, order)
```

Content validation rules (service layer):

- **At least one content component required:** text_content, video (provider+url+external_id), ≥1 attachment, reflection definition (type+prompt), or CTA (type+config).
- **Video:** if any of provider/url/external_id is set, all three must be set and parse-valid (Class-owned YouTube parser, §5). Unlisted-by-convention; official embed only at render time; manual completion.
- **Reflection:** `reflection_type` + `reflection_prompt` set together. `reflection_options` rules: `long_text` → options empty/null; `single_select`/`multi_select` → ≥ 2 valid options. **Option shape is `{ id, label }`** (id: short stable string; label: display text). `id` must be unique within the lesson and immutable once created; editing a label must preserve the `id`. B5 stores learner answers as `selectedOptionIds`, so label edits never break historical responses. No separate options table — JSONB is sufficient.
- **CTA:** `cta_type` set ⇒ `cta_label` + typed `cta_config` set. Typed targets:
  - `WHATSAPP`: config `{phoneE164?, messageTemplate?}` — phone optional (falls back to workspace profile WhatsApp), E.164-validated when present
  - `FLOW_BOOKING`: config `{serviceId?, payloadHint?}` — opaque JSON only. **No cross-domain FK from Class to Flow.** Stored as an adapter/integration target; B7 resolves it through the PromotorFlow adapter
  - `EXTERNAL`: config `{url}` — URL validated (http/https, safe scheme)
  - `ENROLL_PROGRAM`: config `{}` + `cta_target_program_id` REQUIRED. The target must belong to the SAME organization — tenant-validated in the service (intra-Class self-FK to `programs.id`, `ON DELETE SET NULL`)

### 3.4 `lesson_attachments` (image + download content; external URLs only — no R2 in B3)

```ts
id uuid PK; lesson_id uuid NOT NULL FK → lessons.id ON DELETE CASCADE
kind text NOT NULL CHECK IN ('image','download')
name text NOT NULL; url text NOT NULL; size_formatted text
order integer NOT NULL DEFAULT 1 CHECK order > 0
created_at / updated_at
index (lesson_id)
```

### 3.5 `program_presentations` (1:1 per program, public presentation)

```ts
id uuid PK; program_id uuid NOT NULL FK → programs.id ON DELETE CASCADE UNIQUE
cover_variant  text NOT NULL DEFAULT 'cover-a' CHECK IN ('cover-a','cover-b','cover-c')
featured       boolean NOT NULL DEFAULT false
image_url      text                                     // PRESERVED: current createProgramDetailed persists presentation.imageUrl
hero_eyebrow   text; short_outcome text; duration_label text
learning_outcomes jsonb NOT NULL DEFAULT '[]'   // [{title, description}] — no need to normalize
created_at / updated_at
```

`image_url` preserves the existing `ProgramPublicPresentation.imageUrl` data — it is not silently dropped during migration.

### 3.6 `workspace_profiles` (org-level public presentation; 1:1 per org)

```ts
id uuid PK; organization_id uuid NOT NULL FK → organizations.id ON DELETE RESTRICT UNIQUE
display_name text NOT NULL; tagline text; headline text; bio text
city text; role_label text
whatsapp_phone_e164 text CHECK E.164 format (nullable)
avatar_url text; logo_url text
hero_program_id uuid FK → programs.id ON DELETE SET NULL      // NULLABLE in DB
stats jsonb NOT NULL DEFAULT '{}'   // {familiesHelped?, location?} — programCount computed at read time
created_at / updated_at
```

**Nullability alignment (DB → contract → API → frontend):** `hero_program_id` is nullable and `ON DELETE SET NULL`. The contract `PublicWorkspaceProfile.heroProgramId` becomes `string | null`, the API returns `null` unchanged, and the frontend hero section is rendered only when a non-null value exists. No layer may assume a required hero program.

### 3.7 FK delete behavior summary

- org hard-delete with programs or workspace profile → RESTRICT (content is valuable; matches B1 contacts precedent)
- program → modules/presentations CASCADE; module → lessons CASCADE; lesson → attachments CASCADE
- workspace profile → hero program SET NULL; lesson CTA → target program SET NULL
- **B5 seam:** future B5 tables (progress / reflection responses / learning events) must FK `lessons.id` with **ON DELETE RESTRICT** — destructive deletion must never silently cascade away learning history. B3 documents this as a binding constraint for B5 schema design.

---

## 4. Repository layer

`apps/platform-api/src/repositories/` — factory pattern identical to B1 (`createXRepository(db)`), every method org-scoped via explicit `OrganizationContext` (child tables verified by JOIN to parent → org).

- `program-repository.ts`: `list(ctx, {includeArchived})`, `findById(ctx, id)`, `findBySlug(ctx, slug)`, `create(ctx, input)`, `update(ctx, id, patch)`, `setStatus(ctx, id, status, publishedAt?)`, `countBySlug(ctx, slug)` (slug-collision suffix), plus child ops: `addModule/removeModule/reorderModules(ctx, programId, orderedModuleIds)` (two-phase order reassign inside one transaction: temp-offset shift then final orders — avoids unique-index transients), `addLesson/removeLesson/reorderLessons/saveLesson`
- `lesson-repository.ts` / `module-repository.ts`: every mutation first asserts parent belongs to ctx org (single JOIN query); child rows carry no `organization_id` (inherit via parent, per architecture doc §38)
- `public-content-repository.ts` (public read path — no OrganizationContext): `getPublishedProgramsByOrgSlug(orgSlug)` — resolves organization from slug and REQUIRES `organizations.deleted_at IS NULL`; WHERE hard-codes `status='published'` AND `program_type <> 'private'` AND `access_type <> 'private'`; `getPublishedProgramBySlugs(orgSlug, programSlug)`; `getWorkspaceProfileBySlug(orgSlug)`. Tenant-safe because org is resolved from the slug server-side and the WHERE never trusts client org input. **A soft-deleted organization has NO public storefront: all three public queries join `organizations` and filter `deleted_at IS NULL`; a soft-deleted org yields profile null, catalog empty, detail null (→ 404).**

---

## 5. Service layer

`apps/platform-api/src/services/` — `createProgramService(db)` + `createPublicContentService(db)`, same style as B1 `createContactService` (zod validation → `DomainError` envelopes → repo calls).

- `createProgram(ctx, cmd)`: validate → slugify title → suffix on collision (`slug-2`) → insert program (status `draft`, pricing/access defaults derived from programType per the frozen §3.1 invariants: lead_magnet→public/free/0, aftersales→manual/free/0, paid→public/one_time/>0, private→private) + default `program_presentations` row (preserving `imageUrl` when provided) in one transaction. Service enforces the frozen `price_amount` invariants (§3.1) on create and update; the DB cross-field CHECK (when frozen) is the final guard.
- `updateProgram(ctx, id, patch)`, `publishProgram(ctx, id)` — publish rule: title present AND (program_type='private' OR at least one module with one lesson); sets `published_at` (keeps on re-publish), `unpublishProgram` → draft + `published_at=NULL`, `archiveProgram` → archived, `restoreProgram` → draft
- `addModule/reorderModules/addLesson/reorderLessons/saveLesson` — saveLesson validates the composite content per §3.3 rules (at least one component; video triple + parser; reflection type/prompt pairing + `reflection_options` count rules; CTA typed config; ENROLL_PROGRAM same-org target check) and upserts attachments
- `deleteModule/deleteLesson` — enforced by the **content delete policy** (§9.5)
- `updateWorkspaceProfile(ctx, patch)`, `updateProgramPresentation(ctx, programId, patch)`
- Public service: `getPublicWorkspaceProfile(workspaceSlug)`, `getPublicProgramCatalog(workspaceSlug)` (published, non-private, presentation joined, computed `programCount` stat), `getPublicProgramDetail(workspaceSlug, programSlug)` (null for drafts/private — 404 semantics)

**Class-owned helpers (NOT platform-core):** YouTube parsing and embed URL construction live in `apps/platform-api/src/services/program/youtube.ts`; program slug generation lives in `apps/platform-api/src/services/program/slug.ts`. `platform-core` stays pure shared-platform utilities only — no media helpers, no Class domain helpers are added to it. (The web app keeps its own Class-owned copy in `lib/video/`; the duplication is deliberate until a platform-wide utility decision is made.)

New error codes added to `core/errors.ts`: `INVALID_YOUTUBE_URL`, `PROGRAM_NOT_PUBLISHED`, `CONTENT_DELETE_FORBIDDEN`.

---

## 6. API endpoints (platform-api, Hono)

### 6.1 Public (read-only, published content, no auth)

```
GET /api/v1/public/workspaces/:workspaceSlug                       → workspace profile
GET /api/v1/public/workspaces/:workspaceSlug/programs              → published catalog (with presentation)
GET /api/v1/public/workspaces/:workspaceSlug/programs/:programSlug → published detail (null → 404)
```

### 6.2 Admin (CONTRACT DEFINITION ONLY — no routes registered in B3 planning)

Admin routes are designed against the B2 session-based resolver abstraction (`deps.orgContextResolver` in `createApp`). There is **no temporary AUTH_NOT_READY route and no unauthenticated org-scoped surface**. The admin route set below is wired for real only when B2 is frozen and implementation begins:

```
GET    /api/v1/programs
POST   /api/v1/programs
GET    /api/v1/programs/:programId
PATCH  /api/v1/programs/:programId
POST   /api/v1/programs/:programId/publish | /unpublish | /archive | /restore
POST   /api/v1/programs/:programId/modules
PATCH  /api/v1/programs/:programId/modules/:moduleId
DELETE /api/v1/programs/:programId/modules/:moduleId
POST   /api/v1/programs/:programId/modules/reorder
POST   /api/v1/programs/:programId/modules/:moduleId/lessons
PATCH  /api/v1/programs/:programId/modules/:moduleId/lessons/:lessonId
DELETE /api/v1/programs/:programId/modules/:moduleId/lessons/:lessonId
POST   /api/v1/programs/:programId/modules/:moduleId/lessons/reorder
GET    /api/v1/programs/:programId/presentation
PUT    /api/v1/programs/:programId/presentation
GET    /api/v1/storefront/profile
PUT    /api/v1/storefront/profile
```

Response envelope: success = plain JSON; errors = `{code, message}` via `DomainError.toSafeObject()` (B1 style, never raw pg errors).

---

## 7. Frontend migration plan

Target chain (per architecture doc): `Screen → Query/Command → Port → HTTP adapter → api-client → platform-api → service → repository → PostgreSQL`.

1. **Contracts (deliberate re-baseline of frozen hash):** add `ActiveProgramType` (4 types, excludes `challenge`); move `PublicWorkspaceProfile` (**with `heroProgramId: string | null`**), `ProgramPublicPresentation` (**with `imageUrl`**), `LearningOutcome`, `PublicProgramCatalogItem`, `PublicProgramDetail` from web module into contracts; extend Lesson contracts with `reflection_options` and canonical typed CTA (`ctaType`/`ctaLabel`/`ctaTargetProgramId`/`ctaConfig`); add B3 request/response DTO schemas (`CreateProgramRequest`, `UpdateProgramRequest`, `ReorderRequest`, `LessonUpsertRequest`, `ProgramResponse`, `ErrorEnvelopeSchema`). Update the B1 contracts-hash guardrail with the new baseline (documented as a deliberate B3 change).
2. **api-client:** extend `ApiClient` with `put/patch/delete` + typed error (`ApiError {code,message}`); add typed client `PromotorClassContentApiClient` (programs/storefront endpoints). No React/browser/DB deps — stays shareable.
3. **Web HTTP adapters:** `src/adapters/http/program-repository.ts` and `public-storefront-repository.ts` implement the EXISTING `ProgramRepositoryPort` / `PublicStorefrontRepositoryPort` over the typed client. Port signatures stay unchanged (some return types gain presentation fields via contracts types).
4. **Adapter factory (fail-closed in production):** new `src/adapters/index.ts` exporting `getProgramRepository()` / `getPublicStorefrontRepository()` resolved from `NEXT_PUBLIC_API_MODE`:
   - `'mock'` is ONLY allowed in development/test — an explicit, deliberate selection for demo/testing.
   - In production: `'http'` is REQUIRED. Missing mode, `'mock'`, or any unknown value in a production build is a build-time or runtime configuration error — the app fails closed (error state), NEVER silently falls back to MockStateStore/localStorage.
   - Mock is a demo/testing adapter, not a production fallback.
   - Queries/Commands import the factory instead of `@/adapters/mock/...`.
5. **Types alignment:** web `modules/public-storefront/types.ts` re-exports from contracts (removes duplication); `Program.workspaceSlug` continues to be served by the API (joined from org slug) so screens don't change. Frontend hero rendering handles `heroProgramId: null` by hiding the hero program section.
6. **Guardrail test extension:** `domain-guardrails.test.ts` gains assertions that `src/modules/**` must not import from `/adapters/mock/` or `/adapters/http/` directly (factory only), while UI rules stay unchanged. MockStateStore/fixtures remain adapter-side demo scaffolding only.
7. **YouTube parser:** web keeps its Class-owned `lib/video/parse-youtube-url.ts` (no platform-core move). Server-side Class-owned parser lives in the API service layer. Deliberate dual ownership; a platform-wide utility decision is out of B3 scope.
8. **Persistence of presentations:** after the switch, `programPresentations` (incl. `imageUrl`)/`workspaceProfiles` localStorage maps are retired in favor of API-persisted rows; mock adapter keeps behavior for demo mode.

---

## 8. Tenant rules

- Every B3 private query/mutation receives server-resolved `OrganizationContext`; WHERE always includes `organization_id` (programs) or JOIN-proves parent → org (modules/lessons/attachments/presentations/workspace profile).
- Never trust `organizationId` from browser input. Public paths resolve org ONLY from `workspaceSlug` server-side and hard-filter to published/non-private.
- **Frozen public lookup rule:** public workspace lookup = `organization.slug` matches → `organization.deleted_at IS NULL` → program published → program non-private. A soft-deleted organization exposes nothing publicly (profile null/404, catalog `[]`, program detail null/404).
- Cross-org access = null/0-rows, indistinguishable from missing (B1 precedent).
- Child tables inherit tenant through parent FK — no redundant `organization_id` columns (architecture doc §38).
- CTA `ENROLL_PROGRAM` target is tenant-validated: the service rejects targets whose `organization_id` differs from the lesson's organization (cross-org target → `VALIDATION_ERROR`).

## 9. Access/visibility rules

### 9.1 Status visibility

- `draft`: admin-only visibility; never in public catalog/detail (public detail → null/404).
- `published`: visible per program_type/access_type below; `published_at` set.
- `archived`: admin-only, excluded from public and from default admin list.

### 9.2 Public catalog/detail

Always excludes: non-published, `program_type='private'`, `access_type='private'`.

- `lead_magnet` (public/free): fully visible; B4 reads `program_type+access_type+pricing` to allow self-registration.
- `aftersales` (`access_type='manual'`): visible in catalog (like current mock) with canonical state for B4's notice/eligibility policy.
- `paid` (`one_time`, `price_amount`): visible with price; B4 enforces purchase/contact policy.
- `private`: never public. Canonical state exposed for B4 access enforcement.

### 9.3 YouTube policy

Official embed only; unlisted-by-convention (URL + external id stored; no YouTube API verification in V0.1); manual completion only.

### 9.4 Workspace profile

`heroProgramId` nullable end-to-end (DB SET NULL → contract `string | null` → API returns null → frontend hides hero section). `programCount` stat is computed at read time, never stored.

### 9.5 Content deletion & history policy (production-safe)

- **B3 only (no enrollments exist yet):** hard delete of modules/lessons is ALLOWED when the program is `draft` (children cascade: lessons → attachments). Published/archived programs: destructive module/lesson deletion is REJECTED by the service (`DomainError('CONTENT_DELETE_FORBIDDEN')`). Removal path for published content in B3: unpublish → (content returns to draft rules) → republish.
- **Binding B4 seam (documented now, enforced by B4):** once enrollments exist, unpublish is NO LONGER a backdoor for hard-deleting curriculum. **Program with ≥ 1 enrollment ⇒ destructive module/lesson deletion is FORBIDDEN even when status is `draft`.** B4 MUST enforce this seam when it introduces the `enrollments` table. **Ownership stays with B3 — there is no separate "B4 delete path".** B4 only provides the enrollment usage fact (enrollment count / existence query); the B3 deletion operation consumes it and decides allow vs `CONTENT_DELETE_FORBIDDEN`. Rationale: a learner enrolled in curriculum A must never wake up to curriculum B because a promoter unpublished → deleted lessons → republished. Clean ownership chain:

```
B3 deleteModule/deleteLesson
        ↓
check enrollment usage seam (B3-owned policy)
        ↓
B4 enrollment repository/query (usage fact only)
        ↓
allow  /  CONTENT_DELETE_FORBIDDEN
```
- **B5 seam (physical guard):** B5 tables (progress / reflection responses / learning events) must FK `lessons.id` with **ON DELETE RESTRICT** (§3.7). From B5 on, hard delete of any historically-used lesson is physically impossible; the policy tightens to: lesson referenced by history → delete REJECTED at the DB level, and content removal moves to a future soft-hide/archive mechanism.
- **Timeline summary:** B3 = status-based guard (draft-only hard delete). After B4 = enrollment-count guard closes the unpublish backdoor. After B5 = FK RESTRICT closes the remaining physical gap. Each stage is a strict tightening — no existing delete path changes semantics, it only gets narrower.

---

## 10. Tests

### Unit (node:test, no DB — `apps/platform-api/src/__tests__/`)
- Class-owned helpers: slugify (unicode→ascii fallback, dedupe suffixes); YouTube parser accept matrix (watch/youtu.be/embed/shorts, `www`/`m` variants) + reject matrix (non-YouTube host, missing/malformed ID, non-11-char ID); embed URL builder
- Service validation: composite lesson "at least one component" rule; video triple pairing; reflection type/prompt pairing; `reflection_options` count rules (long_text empty, single/multi ≥ 2 valid `{id,label}` options, duplicate id rejection); CTA typed config matrix (WHATSAPP/FLOW_BOOKING/EXTERNAL/ENROLL_PROGRAM); ENROLL_PROGRAM same-org target rule; publish-rule matrix per program type; delete-policy rules (draft vs published); **price_amount invariants** (free ⇒ 0, one_time ⇒ > 0, per-type matrix)
- Source guardrails: runtime src never references `DATABASE_URL`; contracts hash = NEW B3 baseline

### Integration (real PostgreSQL 16 via CI service — `apps/platform-api/src/__tests__/integration/`)
- programs: create/update; **program-slug uniqueness per organization** (same slug allowed across different organizations); slug collision suffix; **price_amount freeze:** free ⇒ 0, one_time ⇒ > 0; per-type invariant matrix (lead_magnet/aftersales/paid/private) rejected on violation at service level (and at DB level where the CHECK is frozen)
- tenant isolation: cross-org program read → null; cross-org update/child mutation → 0 rows; child ops on cross-org module/lesson ids fail closed; ENROLL_PROGRAM target in another org rejected
- **public soft-delete isolation:** soft-deleted organization → workspace profile null/404, program catalog `[]`, program detail null/404; same org restored → storefront visible again
- ordering: module `(program_id, order)` unique; reorder commits valid final orders; lesson ordering same
- lifecycle: publish transition sets `published_at`; unpublish clears it; archive/restore; publish rule rejects empty curriculum (non-private)
- delete policy: draft program → module/lesson hard delete allowed; published/archived program → delete rejected with `CONTENT_DELETE_FORBIDDEN`; no silent cascade on published content
- visibility: draft/archived/private absent from public catalog+detail; published lead_magnet/aftersales/paid present with correct canonical state
- presentation: `program_presentations` persisted/updated/joined on public reads **including `image_url` round-trip**; workspace profile 1:1, `programCount` computed, `hero_program_id` NULL round-trips as `heroProgramId: null` and SET NULL when the hero program is deleted
- attachments: image/download kind CHECK; cascade from lesson delete (draft path only)
- FK behavior: org hard-delete RESTRICT with programs/profile; program→module→lesson→attachment CASCADE chain (draft); CTA target program delete → SET NULL
- reflection_options: single/multi-select with <2 options rejected; long_text with options rejected; valid `{id, label}` options persist and round-trip; duplicate option ids rejected; label edit preserves id (B5 response stability contract)
- YouTube: service-level parse/validate integration (invalid URL → `INVALID_YOUTUBE_URL`, never persisted)
- grants: runtime role CRUD works on all 6 new tables; runtime cannot CREATE (per-table privilege introspection, side-effect-free like B1)
- migration: journal consistent (owner-role assertion), migrations reproducible from blank DB

### Frontend (web `__tests__`)
- Extended guardrails (modules import factory only; UI still mock/fixture-free)
- **Adapter mode fail-closed:** development/test may select `mock`; production with missing/`mock`/unknown mode → build/runtime configuration error, never silent mock fallback
- Mock adapter contract tests keep passing (regression for demo mode); `heroProgramId: null` handled without hero section rendering

---

## 11. Grants

New `docs/sql/grants_b3.sql` (same discipline as B1: role names only, explicit per-table, no `ALTER DEFAULT PRIVILEGES`):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.programs              TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules              TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lessons              TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_attachments   TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.program_presentations TO promotor_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_profiles   TO promotor_runtime;
```

`scripts/ci-setup-db.sh` applies `grants_b1.sql` then `grants_b3.sql` (both idempotent). `b3:live-acceptance` tooling mirrors `b1-live-acceptance.ts` (24 new privilege checks = 6 tables × 4 CRUD).

---

## 12. Migration sequencing (Migration Integrator)

1. **B3 implementation remains BLOCKED until B2 (Better Auth) implementation is FINAL ACCEPTED / FROZEN.** (B2 reconnaissance/architecture plan is already ACCEPTED / FROZEN on canonical master; that is not the same as implementation being frozen.)
2. **Schema DESIGN may run in parallel. Schema CODE and `db:generate` remain BLOCKED until B2 implementation is frozen and B3 receives an explicit implementation GO.** No provisional migration is generated in the B3 planning phase — nothing to re-base later.
3. **Canonical migration numbering is determined ONLY from canonical master at B3 implementation time.**
   - If B2 implementation has claimed migration `0001` on canonical master → B3 uses the next sequential migration through the Migration Integrator.
   - If no B2 migration exists on canonical master → B3's migration becomes `0001_*.sql`; schema+SQL reviewed together; journal re-verified.
   - Non-merged branches and uncommitted worktree artifacts NEVER claim a canonical migration number — they are not canonical history, do not shift numbering, and must not be committed with B3, deployed, or applied to any database.
4. Migration content is schema-coded only after GO; production apply requires the B1-documented human-approved gate + audit record.

---

## 13. Risks

- **B2 serialization:** B3 schema code is blocked until B2 freeze; once GO is given, migration ordering is decided by the integrator — no provisional SQL exists to drift.
- **Contracts hash re-baseline:** deliberate B3 change to the B1-frozen file; must be called out in PR review (not silently rebased).
- **Composite lesson model:** matches the canonical composite Lesson (video+text+attachments+reflection+CTA coexist); "at least one component" service validation prevents empty rows without a forced discriminator.
- **CTA ENROLL_PROGRAM self-FK:** intra-Class only; tenant validation at service level prevents cross-org program targeting. FLOW_BOOKING carries zero FK — pure config for the B7 adapter.
- **Public soft-delete filtering:** public lookups JOIN `organizations` and require `deleted_at IS NULL`; a soft-deleted org must never keep a live public storefront (frozen rule in §8). Covered by the soft-delete isolation integration test.
- **Delete policy:** service-level guard now (published/draft split), B4 enrollment-usage seam (B3-owned decision consuming B4 usage fact) closes the unpublish backdoor, physical RESTRICT guard when B5 lands; no future silent cascade of learning history.
- **Public endpoints without auth:** public storefront reads are by design; admin routes do not exist at runtime until B2 wires the resolver — no bypass path, no temporary 503 surface.
- **Adapter mode fail-closed:** production never defaults to mock; missing/invalid mode is a configuration error.
- **No R2 in B3:** attachments are external-URL metadata only; upload flow is a later milestone.
- **YouTube unlisted verification:** not enforceable without YouTube API; V0.1 relies on promoter discipline + embed-only rendering.

---

## 14. Detailed tasks (implementation phase — ONLY after B2 FINAL ACCEPTED / FROZEN + explicit GO)

1. Add 6 schema files + export; `typecheck`
2. Add Class-owned helpers (YouTube parser, slugify) + unit tests — NOT in platform-core
3. Add `INVALID_YOUTUBE_URL`/`PROGRAM_NOT_PUBLISHED`/`CONTENT_DELETE_FORBIDDEN` error codes
4. Implement program/module/lesson/attachments/presentation/profile repositories + public-content repository (public lookups filter `organizations.deleted_at IS NULL`)
5. Implement program service (composite lesson validation incl. `{id,label}` reflection options, typed CTA validation, frozen price_amount invariants, delete policy) + public content service
6. Re-baseline contracts (types + DTOs, `heroProgramId: string | null`, `imageUrl`, typed CTA), extend api-client
7. Hono routes: public live; admin wired to the real B2 `orgContextResolver` seam (no AUTH_NOT_READY path)
8. `docs/sql/grants_b3.sql` + CI script update
9. Integration test suite (full matrix in section 10, incl. soft-deleted org isolation and price freeze) + unit tests
10. Web: adapter factory with production fail-closed mode, HTTP adapters, guardrail extensions, type re-exports, nullable hero handling
11. Migration finalized through the Migration Integrator (one canonical history, post-GO)
12. `docs/backend/B3_*.md` acceptance record at merge time

---

## Execution note

This document is the complete B3 design and the ONLY B3 artifact produced while B2 is unfrozen. No schema code, no contract/platform-core changes, no `db:generate`, no routes, no Neon operations, no deploy — until B2 is FINAL ACCEPTED / FROZEN and B3 implementation receives an explicit GO.
