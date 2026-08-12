# PromotorClass M0 Frontend Implementation Plan
## Promotor Platform Frontend Architecture V1

**Date:** 2026-08-12  
**Status:** Ready for execution  
**Scope:** M0 frontend foundation only  
**Source spec:** `promotor-class/docs/superpowers/specs/2026-08-12-promotorclass-frontend-monorepo-design.md`  
**Integration source of truth:** `docs/INTEGRATION_CONTRACT.md`

---

# 0. Objective

M0 establishes the Promotor Platform frontend foundation without implementing production backend behavior.

At the end of M0:

```text
Promotor Platform monorepo exists
        ↓
PromotorClass Web boots
        ↓
shared contracts/core packages compile
        ↓
design system shell matches locked direction
        ↓
stateful mock data layer works
        ↓
first promoter/public/learner routes work
```

M0 does **not** attempt to complete PromotorClass V0.1.

The goal is to make every later frontend milestone build on correct boundaries.

---

# 1. Locked Architecture Decisions

Do not reconsider these during M0 unless the source spec is explicitly changed.

## 1.1 Platform root

```text
D:\Coding\Stiffin\
```

is the Promotor Platform monorepo root.

## 1.2 First application

```text
apps/promotor-class-web
```

is the first product application.

Do not create `promotor-class/apps/web` as a separate nested monorepo.

## 1.3 Root packages

M0 creates:

```text
packages/contracts
packages/platform-core
packages/api-client
packages/promotor-class-fixtures
packages/config
```

## 1.4 Shared identity

Canonical:

```text
Organization
User
Contact
```

No PromotorClass-local canonical copy.

Canonical phone identity:

```text
E.164
+628...
```

## 1.5 Next Action ownership

PromotorFlow remains the only canonical owner of `NextAction`.

PromotorClass M0 may model:

```text
LearningSignal
RecommendedNextStep
FlowNextActionRef
```

but must not introduce a local canonical `NextAction` entity/table/store.

## 1.6 Frontend-first boundary

```text
Screen
↓
Query / Command
↓
Port
↓
Mock Adapter | HTTP Adapter
↓
MockStateStore | API Client
```

UI must never import fixture data directly.

## 1.7 Mock scenarios

M0 supports:

```text
CLASS_ONLY
BUNDLE_AVAILABLE
BUNDLE_FLOW_UNAVAILABLE
```

These are derived from separate concepts:

```text
ProductEntitlements
IntegrationHealth
```

Do not use one overloaded status enum as the real model.

## 1.8 Mock persistence

Use:

```text
MockStateStore
localStorage
resetDemo()
```

Browser refresh must preserve demo mutations.

`resetDemo()` restores deterministic fixture state.

## 1.9 Video

V0.1 remains:

```text
YouTube Unlisted
Official YouTube embed
Manual lesson completion
No native video upload
No recording
No transcoding
No watch percentage tracking
```

## 1.10 Flow action lifecycle in M0

PromotorClass M0 does **not** complete or reschedule canonical Flow actions from inside Class.

Allowed:

```text
show Flow context
show Flow Next Action reference
create/request Flow action in mock integration
Open in PromotorFlow
```

Not M0:

```text
completeNextAction()
rescheduleNextAction()
```

No integration-contract revision is needed in M0.

---

# 2. M0 Deliverables

M0 contains exactly six implementation blocks:

```text
M0.1 Docs restructure/update
M0.2 pnpm workspace root
M0.3 Root packages scaffold
M0.4 Next.js PromotorClass Web scaffold
M0.5 Design tokens + application shell
M0.6 Mock state + first routes
```

Do not start Program Builder, analytics, real auth, backend, database, production registration, or complete PromotorFlow integration during M0.

---

# 3. Recommended Commit Sequence

```text
commit 1  docs: align PromotorClass paths with platform monorepo
commit 2  chore: initialize pnpm platform workspace
commit 3  chore: scaffold shared platform packages
commit 4  feat: scaffold PromotorClass Next.js web app
commit 5  feat: add Quiet Utility tokens and app shells
commit 6  feat: add persistent mock state and demo scenarios
commit 7  feat: add first promoter/public/learner routes
commit 8  test: add M0 smoke and boundary tests
```

Do not collapse all M0 work into one giant commit.

---

# 4. M0.1 — Documentation Restructure / Update

## Goal

Make repository documentation match the locked platform-monorepo architecture before code is scaffolded.

## Target structure

```text
docs/
├── INTEGRATION_CONTRACT.md
├── promotor-class/
│   ├── PRD.md
│   ├── architecture.md
│   ├── design.md
│   └── implementation-plan.md
├── promotor-flow/
│   └── ...
└── superpowers/
    ├── specs/
    │   └── 2026-08-12-promotorclass-frontend-monorepo-design.md
    └── plans/
        └── 2026-08-12-promotorclass-m0-frontend-plan.md
```

The final plan file should be committed as:

```text
docs/superpowers/plans/2026-08-12-promotorclass-m0-frontend-plan.md
```

## Tasks

### M0.1.1 Canonical integration contract

Ensure:

```text
docs/INTEGRATION_CONTRACT.md
```

is canonical.

Do not create competing semantic copies.

### M0.1.2 Normalize PromotorClass document names

Use:

```text
docs/promotor-class/PRD.md
docs/promotor-class/architecture.md
docs/promotor-class/design.md
docs/promotor-class/implementation-plan.md
```

Do not retain canonical filenames such as `*_REVISED.md`, `*_FINAL.md`, or `*_V2.md`.

### M0.1.3 Update architecture paths

Map prior generic `src/` references to:

```text
apps/promotor-class-web/src/
```

Document root packages.

### M0.1.4 Update implementation-plan M0 paths

Example:

Bad:

```text
src/styles/tokens.css
```

Correct:

```text
apps/promotor-class-web/src/styles/tokens.css
```

### M0.1.5 Update public route

Canonical:

```text
/p/[workspaceSlug]/[programSlug]
```

### M0.1.6 Document data boundary

Architecture must show:

```text
Screen → Query/Command → Port → Adapter
```

and prohibit direct fixture imports from UI.

### M0.1.7 Document mobile boundary

Share later:

```text
contracts
platform-core
api-client
```

Do not share:

```text
Next.js components
CSS
DOM code
web router
Server Components
web overlay implementations
```

## Verification

Search docs for stale patterns:

```text
promotor-class/apps/web
apps/web
/[workspaceSlug]/[programSlug]
_REVISED.md
```

Review every match.

## Acceptance Criteria

- [ ] Canonical docs exist at locked paths.
- [ ] No `_REVISED` suffix remains in canonical product docs.
- [ ] Architecture references `apps/promotor-class-web/src`.
- [ ] `/p/[workspaceSlug]/[programSlug]` is documented.
- [ ] Integration contract remains highest priority.
- [ ] Mobile sharing boundary is explicit.
- [ ] M0 plan lives under `docs/superpowers/plans`.

---

# 5. M0.2 — pnpm Workspace Root

## Goal

Initialize the platform monorepo with minimal tooling.

## Root files

Create:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
.gitignore
.editorconfig
```

Optional if already part of repository conventions:

```text
.nvmrc
.node-version
```

Do not add Turborepo in M0 unless a concrete current need requires it.

## M0.2.1 Root package

Intent:

```json
{
  "name": "promotor-platform",
  "private": true,
  "packageManager": "pnpm@<locked-version>",
  "scripts": {
    "dev:class": "pnpm --filter @promotor/promotor-class-web dev",
    "build:class": "pnpm --filter @promotor/promotor-class-web build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  }
}
```

Use the actual selected pnpm version. Do not invent it without checking the environment.

## M0.2.2 Workspace

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## M0.2.3 Base TypeScript

Use a conservative strict base.

Framework-specific settings stay inside the app.

## M0.2.4 Package names

```text
@promotor/contracts
@promotor/platform-core
@promotor/api-client
@promotor/promotor-class-fixtures
@promotor/config
@promotor/promotor-class-web
```

Internal dependencies use:

```text
workspace:*
```

## M0.2.5 Dependency direction

Lock:

```text
contracts
   ↑
platform-core

contracts
   ↑
api-client

contracts
   ↑
promotor-class-fixtures

contracts/platform-core/api-client/fixtures/config
   ↑
promotor-class-web
```

### contracts may depend on

```text
Zod
minimal runtime-schema dependencies
```

### platform-core may depend on

```text
@promotor/contracts
```

### api-client may depend on

```text
@promotor/contracts
```

Only add platform-core when a concrete need exists.

### fixtures may depend on

```text
@promotor/contracts
```

Forbidden:

```text
contracts → web
platform-core → web
api-client → web
fixtures → web
```

## Acceptance Criteria

- [ ] `pnpm install` succeeds from root.
- [ ] Workspace discovers apps/packages.
- [ ] Root is private.
- [ ] Internal names are consistent.
- [ ] `workspace:*` is used.
- [ ] No unnecessary Turborepo dependency.
- [ ] Dependency direction is documented.

---

# 6. M0.3 — Root Packages Scaffold

## Goal

Create package boundaries before the web app starts redefining contracts locally.

## 6.1 `packages/contracts`

Suggested:

```text
packages/contracts/
├── package.json
├── tsconfig.json
└── src/
    ├── ids.ts
    ├── identity.ts
    ├── capabilities.ts
    ├── programs.ts
    ├── enrollments.ts
    ├── learning-events.ts
    ├── learning-signals.ts
    ├── promotorflow.ts
    └── index.ts
```

### Minimal IDs

```text
OrganizationId
UserId
ContactId
ProgramId
EnrollmentId
LessonId
LearningEventId
LearningSignalId
```

### ProductEntitlements

```ts
type ProductEntitlements = {
  promotorClass: boolean;
  promotorFlow: boolean;
};
```

### IntegrationHealth

```ts
type IntegrationHealth = {
  promotorFlow: "AVAILABLE" | "UNAVAILABLE";
};
```

If user is not entitled to Flow, consumers determine that from entitlements rather than fake service health.

### Demo scenarios

Scenario names are mock configuration, not core production business state.

```text
CLASS_ONLY
BUNDLE_AVAILABLE
BUNDLE_FLOW_UNAVAILABLE
```

Prefer placing them in mock/fixtures code rather than canonical contracts unless shared testing needs them.

### Minimum integration contracts

M0 may define:

```text
FlowContactContext
AssessmentStatus
FlowNextActionRef
LearningNextActionRequest
LearningActivityProjection
PromotorFlowAdapter
PromotorClassAdapter
```

Do not add Flow complete/reschedule methods in M0.

### Forbidden in contracts

```text
React
Next.js
DOM
localStorage
database clients
fetch implementation
phone normalization implementation
business side effects
```

---

## 6.2 `packages/platform-core`

Suggested:

```text
src/
├── phone/
│   ├── normalize-phone.ts
│   └── format-phone.ts
├── time/
│   └── organization-timezone.ts
├── identity/
└── index.ts
```

### Required M0 logic

Test canonical Indonesian phone normalization:

```text
0812...
62812...
+62812...
+62 812-...
```

→

```text
+62812...
```

Invalid input must fail explicitly.

---

## 6.3 `packages/api-client`

M0 structure:

```text
src/
├── client.ts
├── errors.ts
└── index.ts
```

It reserves the canonical HTTP/API boundary.

Do not implement fictional production endpoints.

A minimal config type is enough:

```ts
type ApiClientConfig = {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
};
```

---

## 6.4 `packages/promotor-class-fixtures`

Static deterministic seeds only:

```text
src/
├── promotor.ts
├── contacts.ts
├── programs.ts
├── enrollments.ts
├── learning-events.ts
├── learning-signals.ts
├── activities.ts
├── templates.ts
└── index.ts
```

Locked narrative:

```text
Rina Maharani
Ayu Rahma
Nina Wulandari
Dimas Pratama
Nadia Putri
Hendra Saputra

7 Hari Mengenal Cara Belajar Anak
30 Hari Setelah Tes
Parenting Growth Program
7 Hari Memahami Potensi Remaja
```

No state mutation functions in fixtures.

---

## 6.5 `packages/config`

M0:

```text
typescript/
eslint/
prettier/
```

No CSS tooling.

No shared UI package.

---

## Acceptance Criteria

- [ ] Five root packages exist.
- [ ] Contracts expose runtime-validatable schemas.
- [ ] platform-core owns phone normalization.
- [ ] api-client contains no fake endpoints.
- [ ] fixtures are static.
- [ ] config contains no web CSS dependency.
- [ ] packages typecheck independently.
- [ ] no dependency cycles.

---

# 7. M0.4 — Next.js PromotorClass Web Scaffold

## Goal

Create the first running product app without adding backend/domain scope beyond M0.

## App path

```text
apps/promotor-class-web
```

Use the currently selected/supported Next.js baseline in the repository.

Do not blindly copy an old pinned framework version from stale docs.

## Suggested structure

```text
apps/promotor-class-web/
├── src/
│   ├── app/
│   │   ├── (promotor)/
│   │   ├── (learner)/
│   │   └── p/
│   │       └── [workspaceSlug]/
│   │           └── [programSlug]/
│   ├── modules/
│   ├── components/
│   ├── adapters/
│   │   ├── mock/
│   │   └── http/
│   ├── lib/
│   └── styles/
└── public/
```

## Route rule

Route groups organize layouts but do not become URL segments.

Promotor:

```text
/app
```

Learner:

```text
/learn
```

Public:

```text
/p/[workspaceSlug]/[programSlug]
```

## M0 modules

Create only immediately useful domains plus obvious structural needs:

```text
organizations
contacts
programs
enrollments
learning
signals
promotorflow
```

Do not scaffold dozens of empty files just to mirror the final product map.

## Contact guardrail

Import canonical contact types from:

```text
@promotor/contracts
```

Do not redefine canonical Contact inside web modules.

## HTTP adapter

May remain a placeholder.

Do not invent endpoint strings.

## Server/client boundaries

Use Client Components only where needed:

```text
MockStateStore/localStorage
interactive state
demo mutation
scenario switching
forms
```

Do not make the whole app `"use client"` for convenience.

## Acceptance Criteria

- [ ] `pnpm dev:class` starts.
- [ ] `/app` renders.
- [ ] `/learn` renders.
- [ ] public demo route renders.
- [ ] workspace packages resolve.
- [ ] Contact is not redefined.
- [ ] screens do not import fixtures directly.

---

# 8. M0.5 — Design Tokens + Shell

## Goal

Lock Quiet Utility before feature proliferation.

This is not a full design-system project.

## 8.1 Tokens

Create:

```text
apps/promotor-class-web/src/styles/tokens.css
apps/promotor-class-web/src/styles/globals.css
```

Implement locked values for:

```text
warm-neutral surfaces
text hierarchy
semantic accent
dividers
borders
danger/warning/success
spacing
type scale
line heights
radius
focus ring
```

No gradients.

No decorative shadows.

## 8.2 Minimal foundation components

Build only what initial routes need:

```text
PageHeader
SectionHeader
Divider
Button
IconButton
TextLink
Input
Textarea
StatusText
ProgressBar
EmptyState
```

Thin layout primitives allowed:

```text
Stack
Inline
Container
```

Do not create:

```text
Card
DashboardCard
StatCard
```

## 8.3 Promotor shell

Create:

```text
PromotorAppShell
PromotorSidebar
PromotorMobileNav
PromotorTopBar
```

Do not create a universal navigation component with a large prop API.

## 8.4 Learner shell

Create separately:

```text
LearnerHeader
LearnerMobileNav
LearnerContent
```

Learner experience remains editorial/content-first.

## 8.5 Responsive floor

Verify:

```text
360px
390px
desktop
```

Interactive target:

```text
>= 44px
```

## 8.6 Initial visual routes

```text
/app
/learn
/p/rina/7-hari-mengenal-cara-belajar-anak
```

Use realistic content, not lorem ipsum.

## Acceptance Criteria

- [ ] Quiet Utility is recognizable.
- [ ] no generic KPI card grid.
- [ ] no gradients/glass/glow.
- [ ] Promotor and learner shells differ appropriately.
- [ ] 360px works.
- [ ] touch targets meet requirement.
- [ ] focus-visible exists.
- [ ] no emoji system iconography.

---

# 9. M0.6 — Mock State + First Routes

## Goal

Turn the frontend from static mockups into a stateful product simulator.

## 9.1 Mock layer

Suggested:

```text
src/adapters/mock/
├── mock-state-store.ts
├── seed-state.ts
├── scenario.ts
├── program-repository.ts
├── learner-repository.ts
├── learning-service.ts
└── promotorflow-adapter.ts
```

## 9.2 Mock state contents

Enough for M0:

```text
capabilities/health
contacts
programs
enrollments
lesson progress
reflections
learning events
learning signals
Flow context/action refs
```

Do not model the future database exactly.

## 9.3 localStorage persistence

Use a namespaced/versioned key, e.g.:

```text
promotorclass:m0:state:v1
```

Requirements:

```text
seed if absent
persist mutation
survive refresh
resetDemo()
recover from corrupt/invalid state
version mock state
```

Invalid state:

```text
discard
restore deterministic seed
```

Do not crash.

## 9.4 `resetDemo()`

Must:

1. clear persisted mock state,
2. clone deterministic seed,
3. persist it,
4. notify subscribers/UI,
5. restore default scenario.

Recommended default:

```text
BUNDLE_AVAILABLE
```

## 9.5 Scenario derivation

```text
CLASS_ONLY
→ entitlements: Class true, Flow false
→ Flow health not queried

BUNDLE_AVAILABLE
→ Class true, Flow true
→ Flow health AVAILABLE

BUNDLE_FLOW_UNAVAILABLE
→ Class true, Flow true
→ Flow health UNAVAILABLE
```

Class-only is not an outage.

## 9.6 Module boundaries

Example:

```text
modules/learning/
├── queries.ts
├── commands.ts
└── ports.ts
```

Minimum queries:

```text
getLearnerHome()
getEnrollment()
getLesson()
getPromotorHomeSignals()
```

Minimum commands:

```text
completeLesson()
submitReflection()
resetDemo()
setDemoScenario()
```

## 9.7 Demo path A — Promotor signal

```text
Promotor Home
↓
Ayu signal
↓
Learner Detail
↓
timeline / reflection / Flow context
↓
follow-up draft
```

No Flow action complete/reschedule mutation in M0.

## 9.8 Demo path A2 — Learning completion

```text
open lesson
↓
complete lesson
↓
lesson progress updates
↓
program progress recalculates
↓
learning event created
↓
signal created/updated
↓
Promotor Home changes
```

This is the main M0 proof.

## 9.9 Demo path B — Public acquisition

```text
/p/rina/7-hari-mengenal-cara-belajar-anak
↓
registration
↓
matchOrCreateContact mock
↓
enrollment
↓
registration success/access state
↓
learner home
```

Phone matching uses:

```text
@promotor/platform-core normalizePhone()
```

Existing matching phone must reuse canonical `contact_id`.

## 9.10 Initial route set

Recommended:

```text
/app
/app/learners/[contactId]

/learn
/learn/programs/[enrollmentId]
/learn/programs/[enrollmentId]/lessons/[lessonId]

/p/[workspaceSlug]/[programSlug]
```

Optional if necessary for existing mockup continuity:

```text
/app/programs
/app/programs/[programId]
```

Do not expand to full Program Builder unless M0 scope is explicitly changed.

## 9.11 CLASS_ONLY UI

Show:

```text
Learning Signal
Recommended next step
```

Do not show outage language.

## 9.12 BUNDLE_AVAILABLE UI

Show Flow context/reference where relevant.

Allow:

```text
Open in PromotorFlow
```

Do not complete/reschedule Flow action in Class.

## 9.13 BUNDLE_FLOW_UNAVAILABLE UI

Show:

```text
Learning Signal
Recommended next step
Sync queued
```

Learning remains fully usable.

A mock integration queue is allowed.

Do not call queued work a canonical Flow NextAction until sync succeeds.

## 9.14 Follow-up draft

May support editable message and `wa.me` demo link.

No WhatsApp automation.

## Acceptance Criteria

- [ ] MockStateStore survives refresh.
- [ ] resetDemo restores deterministic state.
- [ ] scenario switching works.
- [ ] Class-only ≠ Flow outage.
- [ ] lesson completion changes progress.
- [ ] completion creates learning event.
- [ ] signal updates when rule matches.
- [ ] Promotor Home reacts.
- [ ] public registration reuses canonical contact when phone matches.
- [ ] enrollment is created.
- [ ] learner home reflects enrollment.
- [ ] Flow outage does not break learning.
- [ ] no screen imports fixture files directly.

---

# 10. First Route UX Requirements

## `/app`

Purpose:

```text
promotor attention queue
```

Must show realistic signal reasons and correct Class-only/bundle/outage behavior.

No KPI card grid.

## `/app/learners/[contactId]`

Show:

```text
identity
program
progress
intent label
learning timeline
reflection
next step
Flow context when relevant
```

Raw reflection belongs here rather than dominating Home.

## `/learn`

Purpose:

```text
resume learning
```

Show active program/progress.

## Lesson

Use official YouTube embed for fixture video.

Completion is manual.

Required reflection blocks completion where defined.

## Public route

Mobile-first.

Minimum:

```text
program identity/value
curriculum preview
promotor identity
registration form
privacy copy
```

Privacy copy must not promise narrower usage than the platform actually performs.

---

# 11. M0 Tests

## 11.1 platform-core

Unit-test:

```text
phone normalization
phone formatting
```

## 11.2 contracts

Validate representative schemas:

```text
ProductEntitlements
IntegrationHealth
AssessmentStatus
LearningNextActionRequest
```

## 11.3 MockStateStore

Test:

```text
seed
persist
reload
corrupt-state recovery
resetDemo
scenario mapping
```

## 11.4 Learning behavior

```text
complete lesson once
→ progress changes once
→ one completion event

complete again
→ idempotent

required reflection missing
→ reject completion

reflection submitted
→ completion allowed
```

## 11.5 Identity

Phone variants:

```text
0812...
62812...
+62812...
```

must resolve to one canonical demo Contact.

## 11.6 Scenarios

`CLASS_ONLY` must not display outage.

`BUNDLE_FLOW_UNAVAILABLE` must preserve learning and show queued integration state.

## 11.7 Route smoke

```text
/app
/learn
/p/rina/7-hari-mengenal-cara-belajar-anak
```

must render.

## 11.8 Optional Playwright

If Playwright setup is already cheap:

```text
open lesson
→ complete
→ promoter Home signal changes
```

Otherwise browser E2E can wait until M1, but state/service tests are required in M0.

---

# 12. M0 Non-Goals

Do not implement during M0:

## Backend

```text
PostgreSQL
real auth
production API
database migrations
production outbox
workers
```

## PromotorFlow operations

```text
complete Flow action
reschedule Flow action
booking
payment
aftercare
full Flow UI
```

## Full Class

```text
full curriculum builder
analytics
template engine
production publishing
file storage
real magic-link delivery
notifications
```

## Video

```text
upload
record
transcode
watch tracking
custom player
```

## Mobile

```text
TWA project
Expo project
React Native project
```

M0 only preserves the seam.

---

# 13. Stop Conditions

Agent must stop/report rather than invent a new architecture if:

1. existing repo root conflicts with the locked platform root,
2. package names collide,
3. existing code defines incompatible canonical Contact semantics,
4. existing architecture requires Next.js Server Actions as the only API contract,
5. existing video system conflicts with locked V0.1,
6. integration contract unexpectedly requires Flow action mutations beyond M0,
7. source docs materially conflict with the locked frontend spec.

Document the conflict instead of silently redesigning the system.

---

# 14. Coding Agent Guardrail

> Implement only Promotor Platform Frontend Architecture V1 M0. PromotorClass Web is the first application in a platform-level pnpm monorepo. Canonical Organization/User/Contact identity is shared platform state. PromotorFlow remains the only canonical NextAction owner. UI never imports fixtures directly. Reads/writes use module query/command boundaries and repository/service ports. M0 uses a persistent localStorage-backed MockStateStore with deterministic fixtures and resetDemo(). CLASS_ONLY, BUNDLE_AVAILABLE, and BUNDLE_FLOW_UNAVAILABLE represent entitlement + integration-health combinations; Class-only is not an outage. Do not implement backend, mobile, video upload, auto video completion, or Flow action completion/rescheduling during M0.

---

# 15. M0 Completion Checklist

## Documentation

- [ ] canonical docs moved/renamed,
- [ ] architecture paths updated,
- [ ] M0 plan committed,
- [ ] integration semantics unchanged.

## Workspace

- [ ] pnpm root initialized,
- [ ] workspace globs correct,
- [ ] base TS config works,
- [ ] dependency direction respected.

## Packages

- [ ] contracts,
- [ ] platform-core,
- [ ] api-client,
- [ ] fixtures,
- [ ] config,
- [ ] all typecheck.

## Web

- [ ] app boots,
- [ ] promoter shell,
- [ ] learner shell,
- [ ] public route,
- [ ] Quiet Utility tokens,
- [ ] responsive at 360px.

## Mock

- [ ] persistent MockStateStore,
- [ ] resetDemo,
- [ ] 3 scenarios,
- [ ] lesson completion mutation,
- [ ] progress update,
- [ ] learning event,
- [ ] learning signal,
- [ ] public registration,
- [ ] matchOrCreateContact,
- [ ] enrollment,
- [ ] Home reacts.

## Integrity

- [ ] no duplicate Contact,
- [ ] no Class canonical NextAction,
- [ ] no direct fixture imports in UI,
- [ ] no Server-Action-only API contract,
- [ ] no web dependency in contracts/platform-core,
- [ ] no video upload/record/transcode,
- [ ] no Android implementation started.

---

# 16. Verification Commands

Equivalent commands must pass:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build:class
```

Manual smoke:

```text
/app
/learn
/p/rina/7-hari-mengenal-cara-belajar-anak
```

Viewport verification:

```text
360px
390px
desktop
```

Scenario verification:

```text
CLASS_ONLY
BUNDLE_AVAILABLE
BUNDLE_FLOW_UNAVAILABLE
```

Persistence:

```text
mutate
refresh
state remains

resetDemo()
state returns to deterministic seed
```

---

# 17. Definition of Done

M0 is complete when the frontend is no longer a set of static mockups.

It must prove this loop:

```text
public visitor registers
        ↓
canonical mock Contact matched/created
        ↓
Enrollment created
        ↓
learner opens lesson
        ↓
lesson completed
        ↓
progress recalculated
        ↓
learning event produced
        ↓
learning signal produced
        ↓
promotor Home changes
```

while:

```text
backend = absent
database = absent
mobile = absent
```

and those future layers can be added without replacing the identity/contracts/data-access foundation.
