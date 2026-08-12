# Promotor Platform Frontend Architecture V1

Date: 2026-08-12
Status: Locked for M0 scaffold

## Decision

PromotorClass frontend will be built as the first app inside a **Promotor Platform monorepo**, not as a PromotorClass-local monorepo.

Root:

```text
D:\Coding\Stiffin\
├── apps/
│   └── promotor-class-web/
├── packages/
│   ├── contracts/
│   ├── platform-core/
│   ├── api-client/
│   ├── promotor-class-fixtures/
│   └── config/
├── docs/
│   ├── INTEGRATION_CONTRACT.md
│   ├── promotor-class/
│   │   ├── PRD.md
│   │   ├── architecture.md
│   │   ├── design.md
│   │   └── implementation-plan.md
│   └── promotor-flow/
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

Future apps:

```text
apps/
├── promotor-class-web/
├── promotor-class-mobile/
├── promotor-flow-web/
├── promotor-flow-mobile/
└── api/
```

Reason: `INTEGRATION_CONTRACT.md` already defines one shared platform foundation. PromotorFlow and PromotorClass will consume shared identity, contracts, and platform-core semantics. Creating `promotor-class/packages/contracts` now would create a known future migration and increase contract drift risk.

## Source-of-truth rule

`docs/INTEGRATION_CONTRACT.md` remains highest-priority integration source of truth.

No repository restructuring may override these rules:

- One person equals one canonical `Contact`.
- Shared Core owns `organizations`, `users`, and `contacts`.
- Phone identity uses E.164, e.g. `+628...`.
- PromotorFlow is the only canonical owner of `NextAction`.
- PromotorClass owns `programs`, `modules`, `lessons`, `resources`, `enrollments`, `lesson_progress`, `reflections`, `CTAs`, `learning_events`, `learning_signals`, intent score, learning status, and program analytics.
- PromotorClass must not create a second canonical `next_actions` model.
- Class to Flow and Flow to Class integration uses adapter contracts.
- Runtime validation is required for integration DTOs.
- Cross-app UI is contextual, actionable, and secondary.
- Flow unavailable must not block Class learning flows; integration request can be queued.

## Flow action management decision for M0

M0 web frontend will **not** manage canonical PromotorFlow action lifecycle inside PromotorClass.

Allowed in PromotorClass M0:

```text
Create/request follow-up action
Show recommendation / queued state / confirmed Flow action reference
Open in PromotorFlow
Open editable follow-up draft
Open WhatsApp deep link after user action
```

Not in PromotorClass M0:

```text
complete Flow NextAction
reschedule Flow NextAction
snooze Flow NextAction
edit Flow task lifecycle
```

Therefore `INTEGRATION_CONTRACT.md` does not need `completeNextAction()` or `rescheduleNextAction()` for M0. If later UI requires `Tandai selesai`, `Tunda`, or follow-up scheduling against canonical Flow actions from inside PromotorClass, update `INTEGRATION_CONTRACT.md` first.

## Root package boundaries

### Dependency direction

Workspace dependency direction is locked:

```text
contracts
  ↓
platform-core
  ↓
api-client
  ↓
promotor-class-web
```

Additional allowed dependencies:

```text
promotor-class-fixtures → contracts
api-client → contracts
api-client → platform-core only when truly platform-neutral helper is needed
promotor-class-web → contracts, platform-core, api-client, promotor-class-fixtures, config
```

Forbidden dependency direction:

```text
contracts → platform-core
contracts → api-client
contracts → promotor-class-web
platform-core → api-client
platform-core → promotor-class-web
promotor-class-fixtures → promotor-class-web
```

Internal workspace dependency version:

```text
workspace:*
```

### `packages/contracts`

Purpose: cross-boundary contracts only.

Allowed:

```text
DTOs
Zod schemas
event envelopes
adapter interfaces
ID branded types
enum contracts
API input/output schemas
```

Initial contract examples:

```text
ContactId
OrganizationId
UserId
ProgramId
EnrollmentId
LessonId

FlowContactContext
AssessmentStatus
LearningContext
LearningSignal
LearningNextActionRequest
LearningActivityProjection
IntegrationEventEnvelope
PromotorFlowAdapter
PromotorClassAdapter
```

Forbidden inside `packages/contracts`:

```text
React
Next.js
browser APIs
database client
UI components
business logic with side effects
phone normalization implementation
random helpers
```

`packages/contracts` should depend on almost nothing except Zod.

### `packages/platform-core`

Purpose: pure shared platform logic.

Allowed:

```text
phone normalization
E.164 handling
identity helpers
time helpers
shared capability model
platform-neutral formatters
```

Initial examples:

```ts
normalizePhone(input: string): PhoneE164
formatPhone(phone: PhoneE164): string
```

Capability and integration health must be separate concepts:

```ts
type ProductEntitlements = {
  promotorClass: boolean;
  promotorFlow: boolean;
};

type IntegrationHealth = {
  promotorFlow: "AVAILABLE" | "UNAVAILABLE";
};
```

Meaning:

```text
Class-only:
entitlements.promotorFlow = false

Bundle with Flow available:
entitlements.promotorFlow = true
integrations.promotorFlow = "AVAILABLE"

Flow outage:
entitlements.promotorFlow = true
integrations.promotorFlow = "UNAVAILABLE"
```

This prevents upgrade/cross-sell UI and outage UI from being mixed.

Forbidden:

```text
React
Next.js routing
DOM APIs
database client
product UI
```

### `packages/api-client`

Purpose: canonical cross-platform API client boundary.

Initial scope:

```text
HTTP client shell
API DTO validation
API error mapping
auth/session header interface
pagination contract
```

Backend does not need to exist for M0. The package can start minimal:

```text
packages/api-client/src/
├── client.ts
├── errors.ts
└── index.ts
```

Rule: canonical backend contract must not be Next.js Server Actions only. Server Actions may exist later as web-specific BFF/convenience layer, but Android/future mobile must be able to consume the same backend through HTTP/API contracts.

### `packages/promotor-class-fixtures`

Purpose: static demo data only.

Fixtures are not the mock backend.

Allowed:

```text
const promotor = {...}
const programs = [...]
const learners = [...]
const activities = [...]
```

Forbidden:

```text
stateful mutation behavior
business workflow simulation
React components
Next.js imports
```

Primary fixtures:

- Promotor: Rina Maharani
- Learners: Ayu Rahma, Nina Wulandari, Dimas Pratama, Nadia Putri, Hendra Saputra
- Programs: `7 Hari Mengenal Cara Belajar Anak`, `30 Hari Setelah Tes`, `Parenting Growth Program`, `7 Hari Memahami Potensi Remaja`

### `packages/config`

Purpose: shared TypeScript/lint/format config.

Structure:

```text
packages/config/
├── typescript/
├── eslint/
└── prettier/
```

CSS/style tooling stays web-specific in `apps/promotor-class-web` for now. React Native/Expo will not consume web CSS the same way. Design token values may later be shared as JSON/TypeScript if needed.

## App structure

```text
apps/promotor-class-web/
├── src/
│   ├── app/
│   ├── modules/
│   ├── components/
│   ├── adapters/
│   │   ├── mock/
│   │   └── http/
│   ├── lib/
│   └── styles/
└── public/
```

Internal `src/` maps the existing PromotorClass architecture plan into platform monorepo form.

## Web app internal structure

```text
apps/promotor-class-web/src/
├── app/
│   ├── (auth)/
│   ├── (promotor)/
│   ├── (learner)/
│   └── p/
│       └── [workspaceSlug]/
│           └── [programSlug]/
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── contacts/
│   ├── programs/
│   ├── lessons/
│   ├── enrollments/
│   ├── learning/
│   ├── reflections/
│   ├── ctas/
│   ├── events/
│   ├── signals/
│   ├── templates/
│   └── promotorflow/
├── components/
│   ├── foundation/
│   ├── controls/
│   ├── data/
│   ├── overlays/
│   └── learning/
├── adapters/
│   ├── mock/
│   │   ├── mock-state-store.ts
│   │   ├── program-repository.ts
│   │   ├── learner-repository.ts
│   │   ├── learning-service.ts
│   │   └── promotorflow-adapter.ts
│   └── http/
│       ├── program-repository.ts
│       ├── learner-repository.ts
│       ├── learning-service.ts
│       └── promotorflow-adapter.ts
├── lib/
│   ├── format/
│   ├── navigation/
│   ├── validation/
│   └── video/
└── styles/
    ├── tokens.css
    └── globals.css
```

## Data-access architecture

Frontend-first flow:

```text
React Screen
     ↓
Module Query / Command
     ↓
Repository / Service Port
     ├──────────────┐
     ↓              ↓
Mock Adapter     HTTP Adapter
     ↓              ↓
MockStateStore   API Client
     ↓              ↓
Fixtures         Backend
```

Future mobile flow:

```text
Native Screen
     ↓
Application Logic
     ↓
API Client
     ↓
Backend
```

Rules:

- UI must not import fixtures directly.
- Screens call module queries/commands.
- Modules depend on repository/service ports.
- Mock adapters read/write through `MockStateStore`.
- HTTP adapters use `packages/api-client` later.
- Data types and DTOs come from `packages/contracts`.
- Platform-neutral helpers come from `packages/platform-core`.

## Mock state persistence

M0 mock behavior must persist across browser refresh.

Use:

```text
MockStateStore
localStorage-backed state
resetDemo()
```

Rules:

- Seed state comes from `packages/promotor-class-fixtures`.
- `MockStateStore` owns mutable demo state.
- Module-level in-memory objects are not sufficient as primary storage.
- `resetDemo()` restores deterministic seed data.
- Persistence is demo-only and must stay isolated from contracts/fixtures.

## Queries and commands

Each module with reads and writes should separate queries and commands.

Example:

```text
modules/programs/
├── queries.ts
├── commands.ts
├── ports.ts
└── components/
```

Learning example:

```text
modules/learning/
├── queries.ts
├── commands.ts
├── ports.ts
└── components/
```

Do not put all behavior into one generic `service.ts`.

## Mock behavior requirements

The mock layer must simulate stateful product behavior, not just static screens.

Required learning behavior:

```text
complete lesson
↓
progress changes
↓
learning event is created
↓
signal is created/updated
↓
Home changes
```

Required acquisition behavior:

```text
public program registration
↓
mock matchOrCreateContact
↓
enrollment created/reused
↓
learner.registered + learner.enrolled events
↓
learner access/session state
↓
Learner Home shows enrolled program
```

Required entitlement/health scenarios:

```text
CLASS_ONLY
BUNDLE_AVAILABLE
BUNDLE_FLOW_UNAVAILABLE
```

Scenario meanings:

```text
CLASS_ONLY:
entitlements.promotorFlow = false
Learning Signal → Recommended next step

BUNDLE_AVAILABLE:
entitlements.promotorFlow = true
integrations.promotorFlow = "AVAILABLE"
Learning Signal → Flow NextAction reference

BUNDLE_FLOW_UNAVAILABLE:
entitlements.promotorFlow = true
integrations.promotorFlow = "UNAVAILABLE"
Recommended next step → Sync queued
```

This validates integration, entitlement, and outage behavior before backend exists.

## Contact module guardrail

`modules/contacts` is allowed only as UI/query consumption of Shared Core Contact.

It is not canonical contact ownership.

Allowed:

```ts
import { Contact, ContactId } from "@promotor/contracts";
```

Forbidden:

```ts
// modules/contacts/types.ts
interface Contact { ... }
```

PromotorClass web must not redefine canonical `Contact`, `Organization`, `AssessmentStatus`, or integration DTOs.

## Routes

Promotor routes:

```text
/app
/app/programs
/app/programs/new
/app/programs/[programId]
/app/programs/[programId]/lessons/[lessonId]
/app/learners
/app/activity
/app/templates
/app/settings
```

Learner routes:

```text
/learn
/learn/programs/[enrollmentId]
/learn/programs/[enrollmentId]/lessons/[lessonId]
```

Public program route uses explicit namespace to avoid route collision:

```text
/p/[workspaceSlug]/[programSlug]
```

Example:

```text
/p/rina/7-hari-mengenal-cara-belajar-anak
```

Do not use root dynamic route `/<workspaceSlug>/<programSlug>` for implementation unless explicitly changed later.

## Navigation targets

P1 future concept: add platform-neutral app destination contracts.

Example:

```ts
type AppDestination =
  | { type: "PROGRAM"; enrollmentId: string }
  | { type: "LESSON"; enrollmentId: string; lessonId: string }
  | { type: "LEARNER"; contactId: string };
```

Web maps `AppDestination` to URL. Mobile maps it to native screen. This is P1 and should not block M0.

## Design constraints

Frontend must follow PromotorClass Quiet Utility design direction.

Required:

- warm-neutral palette,
- typography/spacing/alignment/separators before decoration,
- admin compact and action-oriented,
- learner editorial and content-first,
- mobile usable from 360px,
- touch targets at least 44px.

Forbidden unless explicitly justified:

- decorative gradients,
- glassmorphism,
- glow effects,
- large static shadows,
- generic KPI card grids,
- generic `DashboardCard` / `StatCard` architecture,
- emoji system icons,
- pill for every metadata item,
- modal editor for workflows that need full page,
- native video upload/recording/transcoding behavior.

## Component direction

Foundation:

```text
AppShell
TopBar
PageHeader
SectionHeader
Divider
Stack
Inline
Container
```

Navigation should be product/surface-specific, not one universal component with many props:

```text
PromotorSidebar
PromotorMobileNav
LearnerHeader
LearnerMobileNav
```

Shared lower-level primitive allowed:

```text
NavItem
```

Controls:

```text
Button
IconButton
TextLink
Input
Textarea
Select
RadioGroup
Checkbox
Switch
DropdownMenu
```

Data:

```text
ProgramRow
LearnerRow
ActivityRow
StatusText
ProgressBar
Timeline
EmptyState
```

Overlays:

```text
SidePanel
Modal
Popover
BottomSheet
Tooltip
```

Learning:

```text
CurriculumSection
LessonRow
LessonEditor
ReflectionBlock
ResourceRow
LearnerProgress
NextStepBlock
LearningSignalTimeline
```

Layout primitives (`Stack`, `Inline`, `Container`) must stay simple. Do not create deeply nested abstract layout soup.

## Video scope

V0.1 video decision remains locked:

```text
Provider: YouTube Unlisted
Player: Official YouTube embed
Completion: Manual
White-label: Not supported
Video upload/storage/transcoding: None
```

Allowed `lib/video` scope:

```text
lib/video/
├── parse-youtube-url.ts
├── youtube-id.ts
└── youtube-embed.ts
```

Forbidden:

```text
upload-video.ts
record-video.ts
transcode.ts
upload-progress.ts
watch-percentage tracking
custom player controls over YouTube
```

## Demo paths to support first

### Demo path A — signal/action loop

Stateful frontend prototype should support this narrative:

1. Promotor opens Home.
2. Sees Ayu completed program and needs follow-up.
3. Opens Ayu detail.
4. Reads timeline, reflection, PromotorFlow stage, and next step.
5. Opens follow-up draft.
6. Opens Programs.
7. Opens curriculum for a program.
8. Opens lesson editor.
9. Opens learner preview / learner lesson.
10. Completes lesson.
11. Mock state creates progress/event/signal.
12. Home updates with new signal/action context.

### Demo path B — acquisition / lead magnet

Stateful frontend prototype should also support:

1. Visitor opens public program route `/p/rina/7-hari-mengenal-cara-belajar-anak`.
2. Visitor submits registration.
3. Mock `matchOrCreateContact` normalizes/matches phone.
4. Enrollment is created or reused.
5. `learner.registered` and `learner.enrolled` events are created.
6. Registration success/access state appears.
7. Learner enters Learner Home.
8. Learner sees enrolled program and continue action.

## Android/mobile future

Do not choose mobile technology in M0.

Two valid future paths:

### Path A — PWA/TWA

Use if Android mostly needs Play Store presence, same UI as web, basic deep links, basic notifications, and learner lessons.

```text
Next.js PWA
↓
TWA Android wrapper
```

### Path B — Expo / React Native

Use if Android/mobile needs stronger native capability:

```text
offline
native notifications
camera
native file picker
native downloads
background behavior
native navigation
```

Future app name:

```text
apps/promotor-class-mobile
```

Use `mobile`, not `android`, because Expo/React Native can target Android and iOS.

## What mobile may share later

Share:

```text
contracts
Zod schemas
API client
IDs
domain enums
phone normalization
platform-neutral formatters
pure business helpers
```

Do not share:

```text
Next.js components
CSS
DOM code
Next router
Server Components
web SidePanel implementation
web BottomSheet implementation
```

## Monorepo tooling

Use minimal tooling first:

```text
pnpm workspaces
```

Turborepo can be added later when CI/build graph benefits from it.

Next.js local workspace packages should use `transpilePackages` where needed.

Do not create these packages in M0:

```text
packages/promotor-class-domain
packages/promotor-class-application
packages/shared-ui
```

Extract reusable domain/application packages later only after real code proves reuse need.

## Documentation updates needed

Update existing docs to reflect this structure:

1. Platform/root docs:
   - move or mirror `INTEGRATION_CONTRACT.md` to `docs/INTEGRATION_CONTRACT.md` when root monorepo is initialized.

2. PromotorClass docs at production paths:
   - `docs/promotor-class/PRD.md`
   - `docs/promotor-class/architecture.md`
   - `docs/promotor-class/design.md`
   - `docs/promotor-class/implementation-plan.md`

3. Content updates:
   - add platform monorepo topology,
   - map existing `src/` architecture to `apps/promotor-class-web/src/`,
   - preserve integration contract priority,
   - update public route to `/p/[workspaceSlug]/[programSlug]`,
   - add adapter/data-port boundary,
   - add dependency-direction rules,
   - add entitlement vs integration health split,
   - add `MockStateStore` localStorage persistence,
   - add acquisition demo path.

4. Drop `_REVISED` suffix when moving docs into production paths. Git history should carry version history.

5. Do not change integration semantics in `INTEGRATION_CONTRACT.md` for M0.

## Acceptance criteria

- [ ] `D:\Coding\Stiffin` becomes platform monorepo root.
- [ ] `apps/promotor-class-web` becomes Next.js frontend app root.
- [ ] `packages/contracts` lives at platform root, not inside PromotorClass.
- [ ] `packages/platform-core` exists for shared identity/phone/time helpers.
- [ ] `packages/api-client` exists as canonical HTTP/API boundary placeholder.
- [ ] `packages/promotor-class-fixtures` contains static demo data only.
- [ ] `packages/config` contains TS/lint/format config only.
- [ ] Workspace dependencies use `workspace:*`.
- [ ] Package dependency direction follows locked rules.
- [ ] Entitlement and integration health are separate in types and mock state.
- [ ] Web UI does not import fixtures directly.
- [ ] Mock adapter supports query and mutation.
- [ ] Mock state persists through refresh via `MockStateStore` and can reset with `resetDemo()`.
- [ ] Mock adapter supports `CLASS_ONLY`, `BUNDLE_AVAILABLE`, and `BUNDLE_FLOW_UNAVAILABLE` scenarios.
- [ ] Web code does not redefine canonical `Contact`, `Organization`, `AssessmentStatus`, or integration DTOs.
- [ ] No canonical API depends only on Next.js Server Actions.
- [ ] Contract types are free from React/Next/browser dependency.
- [ ] Public route uses `/p/[workspaceSlug]/[programSlug]`.
- [ ] Video remains YouTube Unlisted + official embed + manual completion.
- [ ] Signal/action demo works: complete lesson changes progress, creates event/signal, and updates Home.
- [ ] Acquisition demo works: public registration matches/creates contact, creates enrollment, and opens Learner Home.
- [ ] PromotorFlow integration UI remains contextual, actionable, and secondary.
- [ ] PromotorClass M0 does not manage canonical Flow action lifecycle beyond create/request/open.
- [ ] No duplicate canonical NextAction type/table is introduced in PromotorClass.
- [ ] No duplicate Contact/person identity is introduced.
- [ ] Design anti-slop constraints remain enforced.
