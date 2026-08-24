# PromotorClass V0.1 — Architecture
> ## Platform monorepo mapping — supersedes generic `src/` paths below (2026-08-12)
>
> PromotorClass is now one app inside the Promotor platform monorepo. Locked baseline: `docs/superpowers/specs/2026-08-12-promotorclass-frontend-monorepo-design.md`; M0 scope: `docs/superpowers/plans/2026-08-12-promotorclass-m0-frontend-plan.md`.
>
> **Path mapping.** Every generic `src/...` reference below means `apps/promotor-class-web/src/...` (e.g. `src/styles/tokens.css` → `apps/promotor-class-web/src/styles/tokens.css`).
>
> **Platform topology.** Root package: `apps/promotor-class-web` (Next.js app). Shared packages: `packages/contracts`, `packages/platform-core`, `packages/api-client`, `packages/promotor-class-fixtures`, `packages/config`. Internal dependencies use `workspace:*`.
>
> **Dependency direction.** `contracts <- platform-core`; `contracts <- api-client`; `contracts <- fixtures`; `web <- everything else`. Forbidden: `contracts`, `web`, `api-client`, or `fixtures` depending on `web`. `contracts` holds only DTO/Zod schemas, adapter interfaces, branded IDs, enums — no React/Next/browser/DB/fetch/phone-normalization/side effects; depends on Zod only.
>
> **Public routes.** `/app`, `/learn`, `/p/[workspaceSlug]/[programSlug]`. No dynamic root route: the canonical public program URL is `/p/[workspaceSlug]/[programSlug]`, NOT `/[workspaceSlug]/[programSlug]`.
>
> **Data boundary (port/adapter).** `Screen → Query/Command → Port → Adapter`. UI must NOT import fixtures directly — fixtures are reached only through ports and adapters.
>
> **Entitlement vs integration health — two separate concepts.** `ProductEntitlements {promotorClass, promotorFlow}` (entitlement) is distinct from `IntegrationHealth {promotorFlow: AVAILABLE|UNAVAILABLE}` (integration health). Class-only (flow=false) is NOT an outage. `platform-core` owns `normalizePhone` (E.164 `+628...`) and `formatPhone`.
>
> **MockStateStore.** localStorage key `promotorclass:m0:state:v1`; seeds deterministic state if absent, persists across refresh, exposes `resetDemo()`, recovers corrupt state to the deterministic seed, versioned. `"use client"` only for MockStateStore/localStorage/interactive state/demo mutation/scenario switching/forms.
>
> **Acquisition demo path (M0).** Flow lifecycle limited to create/request + show reference + "Open in PromotorFlow"; `completeNextAction`/`rescheduleNextAction` forbidden in M0. Scenarios: `CLASS_ONLY` (flow=false), `BUNDLE_AVAILABLE` (flow=true, AVAILABLE — default), `BUNDLE_FLOW_UNAVAILABLE` (flow=true, UNAVAILABLE). Video: YouTube Unlisted + official embed + manual completion; `lib/video` only `parse-youtube-url.ts`, `youtube-id.ts`, `youtube-embed.ts`.
>
> **Mobile sharing boundary.** Share with future mobile: `contracts`, `platform-core`, `api-client`. Do NOT share: Next.js components, CSS, DOM code, web router, Server Components, web overlay implementations.

## Technical Architecture Blueprint

**Product:** PromotorClass  
**Version:** V0.1  
**Status:** Architecture baseline  
**Architecture style:** Modular Monolith  
**Primary platform:** Responsive Web App / PWA  
**Companion product:** PromotorFlow  
**Primary references:**
- `PromotorClass_PRD_V0.1.md`
- `PromotorClass_Implementation_Plan_V0.1.md`
- `PromotorClass_Design_Plan_Anti_AI_Slop.md`
- `dc.html`
- `INTEGRATION_CONTRACT.md`

---

# 1. Architecture Goals

Architecture PromotorClass harus mendukung kebutuhan berikut:

1. cepat dibangun dan diubah selama fase validasi,
2. cukup terstruktur untuk berkembang ke production,
3. tidak over-engineered,
4. multi-tenant sejak awal,
5. satu contact identity untuk PromotorClass dan PromotorFlow,
6. event-driven untuk learning activity,
7. AI bukan dependency core,
8. YouTube menangani video playback,
9. PromotorClass tidak menyimpan biometric/fingerprint data,
10. integrasi PromotorFlow dapat dipisah lewat adapter tanpa coupling UI.

Core architectural loop:

```text
Learner Action
    ↓
Domain Mutation
    ↓
Learning Event
    ↓
Progress / Intent / Signal Evaluation
    ↓
Next Action
    ↓
Promotor Workflow
```

---

# 2. Architecture Style

Gunakan:

```text
Modular Monolith
```

Bukan:

```text
Microservices
```

Alasan:

- domain masih berkembang,
- jumlah tim/dev kecil,
- butuh iteration cepat,
- transaction boundary sederhana,
- deployment lebih mudah,
- debugging lebih mudah,
- latency antar-module minimal,
- menghindari distributed system complexity.

Module boundaries tetap harus jelas agar suatu hari dapat diekstrak jika diperlukan.

---

# 3. High-Level System Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                           │
│                                                              │
│  Promotor App        Learner App        Public Registration │
│  Desktop / Mobile    Mobile-first       Landing / Enroll     │
└──────────────┬───────────────┬───────────────────┬────────────┘
               │               │                   │
               └───────────────┼───────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│                                                              │
│  Auth / Session                                              │
│  Program Application Services                               │
│  Enrollment Services                                       │
│  Progress Services                                         │
│  Reflection Services                                       │
│  CTA Services                                              │
│  Signal / Next Action Services                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      DOMAIN MODULES                          │
│                                                              │
│ Shared Core Adapter │ Programs │ Lessons                    │
│ Enrollments         │ Progress │ Reflections │ Events        │
│ Signals             │ Templates │ PromotorFlow Adapter       │
└───────────────┬───────────────────────────┬───────────────────┘
                │                           │
                ▼                           ▼
┌─────────────────────────────┐   ┌────────────────────────────┐
│        PostgreSQL           │   │      External Systems      │
│                             │   │                            │
│ Transactional Data          │   │ YouTube                    │
│ Event Log                   │   │ Object Storage             │
│ Tenant Data                 │   │ PromotorFlow               │
└─────────────────────────────┘   └────────────────────────────┘
```

---

# 4. Deployment Topology

Recommended initial deployment:

```text
Browser
   ↓
Next.js Application
   ↓
PostgreSQL
   ↓
Object Storage
```

External:

```text
YouTube Embed
PromotorFlow Adapter
```

V0.1 does not require:

- message broker,
- Kafka,
- Redis cluster,
- microservices gateway,
- dedicated video server,
- video worker,
- transcoding service.

---

# 5. Recommended Technology Stack

## Application

```text
Next.js
TypeScript
React
```

Use:

```text
App Router
Server Components where appropriate
Server Actions or API routes for mutations
```

---

## Database

```text
PostgreSQL
```

ORM:

```text
Drizzle ORM
```

or:

```text
Prisma
```

Pick one.

Do not mix ORM strategies.

---

## Validation

```text
Zod
```

Every external mutation payload must be validated.

---

## Authentication

Preferred:

```text
passwordless / magic link
```

Promotor:

authenticated account.

Learner:

passwordless session/magic access.

---

## Object Storage

Use:

```text
Cloudflare R2
```

or another S3-compatible provider.

Used only for:

- images,
- PDFs,
- worksheets,
- documents.

Not for video.

---

# 6. Domain Boundary Map

```text
organizations
    ↓
users

organizations
    ↓
contacts

organizations
    ↓
programs
       ↓
     modules
       ↓
     lessons
       ↓
  resources / reflection / CTA

contacts + programs
        ↓
    enrollments
        ↓
  lesson_progress
        ↓
learning_events
        ↓
 intent / signals
        ↓
 next_actions
```

---

# 7. Core Modules

## 7.1 Shared Core Integration

PromotorClass does not own duplicate platform identity tables when deployed on the shared Promotor Platform.

Canonical Shared Core owns:

```text
organizations
users
contacts
```

PromotorClass uses shared modules/contracts.

Required capabilities:

```text
getCurrentOrganization()
assertOrganizationAccess()

getContact()
findContactByPhone()
findContactByEmail()
matchOrCreateContact()
updateContactIdentity()
```

Canonical phone normalization:

```text
E.164
+62812...
```

Learner remains a role/context of the same Contact.

```text
Enrollment.contact_id
```

If products become separate services later, the same semantic contract may be backed by HTTP without changing learner identity.

---

# 9. Programs Module

Owns:

```text
programs
modules
lessons
lesson_resources
```

Responsibility:

- create program,
- edit program,
- publish,
- archive,
- curriculum hierarchy,
- lesson ordering,
- access rules.

Program states:

```text
draft
published
archived
```

---

# 10. Program Access Model

Program access types:

```text
public
private
manual
```

Rules:

## Public

Can be reached via public slug.

```text
workspace_slug
program_slug
```

Registration required before learner access.

---

## Private

Not publicly discoverable.

Requires enrollment/access token.

---

## Manual

Promotor explicitly enrolls contact.

---

# 11. Curriculum Model

Hierarchy:

```text
Program
  ↓
Module
  ↓
Lesson
```

Lesson types:

```text
video
text
reflection
cta
```

Supporting resource types:

```text
image
PDF
document
external link
```

---

# 12. Video Architecture

V0.1 video provider is locked to:

```text
YouTube Unlisted
```

PromotorClass does not host video.

Flow:

```text
Promotor enters YouTube URL
        ↓
URL Validation
        ↓
Extract YouTube Video ID
        ↓
Store Provider + URL + External ID
        ↓
Render Official YouTube Embed
```

Stored values:

```text
video_provider = youtube
video_url
video_external_id
```

Example:

```text
video_provider:
youtube

video_url:
https://youtu.be/abc123

video_external_id:
abc123
```

---

# 13. Video Provider Abstraction

Do not spread YouTube parsing logic across UI.

Use provider abstraction.

Example:

```ts
type ParsedVideo = {
  provider: "youtube";
  externalId: string;
  originalUrl: string;
};

interface VideoProvider {
  parse(url: string): ParsedVideo;
  getEmbedUrl(externalId: string): string;
}
```

Implementation:

```text
YouTubeVideoProvider
```

Future:

```text
VimeoVideoProvider
WhiteLabelVideoProvider
```

without changing lesson domain model.

---

# 14. YouTube Embedding Rules

PromotorClass must use official YouTube embed.

Do not:

- hide YouTube branding with overlay,
- crop player,
- fake controls over iframe,
- manipulate official player beyond supported parameters.

V0.1 completion:

```text
manual
```

Learner explicitly clicks:

```text
Complete lesson
```

Do not depend on:

```text
watch percentage
video playback ended
IFrame Player API state
```

for core progress logic.

---

# 15. Enrollment Module

Owns:

```text
enrollments
lesson_progress
```

Enrollment links:

```text
contact
+
program
```

Unique rule:

```text
program_id + contact_id
```

A person cannot have duplicate enrollment for same program.

---

# 16. Enrollment Lifecycle

```text
enrolled
   ↓
started
   ↓
completed
```

Optional terminal:

```text
cancelled
```

Fields:

```text
enrolled_at
started_at
completed_at
last_activity_at
```

---

# 17. Progress Engine

Program progress derives from lesson completion.

Formula:

```text
required lessons completed
/
required lessons total
× 100
```

Do not calculate from:

- watch time,
- page duration,
- scroll position.

---

# 18. Progress Mutation Flow

```text
Complete Lesson Request
        ↓
Validate Enrollment
        ↓
Mark lesson_progress completed
        ↓
Update last_activity_at
        ↓
Recalculate program progress
        ↓
Check milestones
        ↓
Emit events
```

Must be idempotent.

Calling complete twice must not duplicate completion event.

---

# 19. Reflection Module

Reflection data structure:

```text
reflection_question
reflection_response
```

Question types:

```text
long_text
single_select
multi_select
```

Reflection responses belong to:

```text
contact
enrollment
lesson
question
```

Reflection is a learning artifact and business context.

---

# 20. Reflection Data Flow

```text
Learner submits reflection
        ↓
Validate response
        ↓
Persist response
        ↓
Emit reflection.submitted
        ↓
Append activity timeline
        ↓
Recalculate signal / next step
```

Reflection text should not be sent automatically to external AI in V0.1.

---

# 21. CTA Module

Supported CTA types:

```text
whatsapp
external_link
promotorflow_booking
enroll_program
```

CTA events:

```text
cta.viewed
cta.clicked
```

CTA clicks are treated as high-value learning signals.

---

# 22. Event Architecture

Use database-backed internal event log.

No external broker in V0.1.

Event table:

```text
learning_events
```

Event is append-only.

Each event contains:

```text
id
organization_id
contact_id
program_id
lesson_id
event_type
payload
created_at
```

---

# 23. Event Naming

Canonical event names:

```text
program.created
program.published

learner.registered
learner.enrolled

lesson.started
lesson.completed

reflection.submitted

program.progress_50
program.progress_80
program.completed

cta.viewed
cta.clicked

learner.inactive

next_action.created
next_action.completed
```

Names are contracts.

Do not casually rename event types.

---

# 24. Event Processing Strategy

V0.1 can process events synchronously inside application transaction or immediately after successful mutation.

Example:

```text
completeLesson()
    ↓
save progress
    ↓
emit event
    ↓
evaluate intent
    ↓
evaluate next action
```

If reliability demands increase later:

```text
Outbox Pattern
```

can be introduced.

---

# 25. Future Outbox Pattern

If PromotorFlow becomes separate service, use transactional outbox:

```text
Domain Transaction
    ↓
Write domain state
+
Write outbox event
    ↓
Commit
    ↓
Background dispatcher
    ↓
PromotorFlow
```

V0.1 does not need dedicated broker.

---

# 26. Intent Score Architecture

Intent score is deterministic.

Rules:

```text
Enrollment             +10
First lesson complete  +10
50% reached            +20
80% reached            +20
Program complete       +20
CTA clicked            +20
```

Maximum:

```text
100
```

Labels:

```text
0–39   cold
40–69  warm
70–100 hot
```

---

# 27. Intent Score Source of Truth

Intent score may be stored on enrollment for query speed.

But must be recomputable from domain state/events.

Function:

```text
calculateIntentScore(enrollmentId)
```

Stored score is cache-like derived state.

---

# 28. Signal Engine

Signal engine translates learner behavior into attention-worthy state.

Examples:

```text
progress >= 80
program completed
meaningful reflection
CTA clicked
inactive > 7 days
```

Signal output should include:

```text
type
priority
reason
contact_id
program_id
source_event_id
```

---

# 29. Next Step → PromotorFlow Action Request

PromotorClass owns recommendation logic, not canonical business tasks.

Signal evaluation produces:

```text
recommended_next_step
```

When recommendation should become operational work:

```text
LearningSignal
↓
LearningNextActionRequest
↓
PromotorFlowAdapter.createNextAction()
↓
PromotorFlow canonical NextAction
```

Example:

```text
IF
program.type = lead_magnet
AND progress >= 80
AND assessment_status != COMPLETED

THEN
recommended next step =
"Follow up about assessment"
```

Class persists the signal/recommendation context.

Flow persists the actual action.

---

# 30. Action Request Deduplication

Class generates deterministic idempotency:

```text
promotorclass:{source_event_id}:{rule_id}
```

PromotorFlow enforces canonical NextAction idempotency.

Class outbox also treats:

```text
destination + idempotency_key
```

as unique.

Do not create a local canonical `next_actions` table.

## Persistent Learning Signals

PromotorClass-owned:

```text
learning_signals

id
organization_id
contact_id

program_id nullable
enrollment_id nullable
source_event_id

type
priority
reason

recommended_action_type nullable
recommended_action_reason nullable

status
created_at
resolved_at nullable
```

Status:

```text
ACTIVE
RESOLVED
DISMISSED
```

## Integration Outbox

External adapter reliability:

```text
integration_outbox

id
organization_id
destination
operation
idempotency_key
payload_json
status
attempt_count
next_attempt_at
last_error_code nullable
created_at
processed_at nullable
```

Recommended unique:

```text
destination + idempotency_key
```


---

# 31. Promotor Home Query Model

Home is a work queue.

Query sources:

```text
learning_signals
learning_events
enrollments
Shared Core contacts
programs
optional PromotorFlow action reference/context
```

Priority:

```text
P1 CTA clicked
P1 program completed + opportunity
P1 hot intent

P2 meaningful reflection
P2 progress >= 80

P3 at risk
```

---

# 32. Learner Detail Query Model

Learner side panel needs aggregated view.

Example view model:

```text
LearnerDetail {
  contact
  source
  promotorFlowContext
  enrollments[]
  latestReflection
  timeline[]
  intent
  nextAction
}
```

Build server-side.

Avoid multiple client waterfalls.

---

# 33. Activity Timeline

Activity comes from:

```text
learning_events
```

Ordered:

```text
created_at DESC
```

Group only in presentation layer:

```text
Today
Yesterday
Earlier
```

---

# 34. Public Registration Architecture

Public URL:

```text
/{workspaceSlug}/{programSlug}
```

Registration request:

```text
name
phone
email optional
```

Flow:

```text
Validate published program
        ↓
Normalize phone
        ↓
Match contact
        ↓
Create contact if absent
        ↓
Create/reuse enrollment
        ↓
Emit learner.registered
        ↓
Emit learner.enrolled
        ↓
Create learner session
        ↓
Redirect to program
```

---

# 35. Contact Matching

Primary:

```text
normalized phone
```

Secondary:

```text
email
```

Indonesia normalization examples:

```text
081234567890
6281234567890
+6281234567890
```

all normalize to:

```text
+6281234567890
```

---

# 36. Learner Authentication

V0.1 preferred:

```text
passwordless learner session
```

Options:

- magic link,
- signed access link,
- OTP later.

Do not force password account for simple lead magnet enrollment.

---

# 37. Session Boundaries

Promotor session:

```text
user_id
organization_id
role
```

Learner session:

```text
contact_id
enrollment scope
```

Learner session must not expose promotor/admin APIs.

---

# 38. Multi-Tenant Architecture

Tenant key:

```text
organization_id
```

Every tenant-owned record must be tenant-scoped directly or indirectly.

Core tables with direct organization_id:

```text
users
contacts
programs
enrollments
learning_events
next_actions
```

Child tables inherit tenant through parent:

```text
modules
lessons
reflection questions
resources
```

---

# 39. Tenant Isolation Rules

Every service must:

```text
1. resolve organization from authenticated session
2. query by organization scope
3. never trust organization_id from client
```

Example:

Bad:

```text
getProgram(input.programId)
```

Better:

```text
getProgram({
  organizationId: session.organizationId,
  programId
})
```

---

# 40. Authorization

V0.1 roles:

```text
owner
```

Architecture should allow later:

```text
admin
editor
viewer
```

But do not implement full permission matrix now.

---

# 41. Storage Architecture

Object storage only for:

```text
images
PDF
documents
worksheets
```

Storage key:

```text
org/{organizationId}/program/{programId}/{resourceId}
```

File metadata table may include:

```text
id
organization_id
storage_key
mime_type
size
filename
created_at
```

---

# 42. File Upload Flow

```text
Request upload
    ↓
Validate organization/program
    ↓
Generate signed upload URL
    ↓
Browser uploads direct to object storage
    ↓
Confirm upload
    ↓
Create resource record
```

Avoid routing large files through app server where possible.

---

# 43. Media Security

Validate:

```text
MIME type
extension
size
organization scope
```

Never allow arbitrary executable uploads.

Suggested V0.1 allowed types:

```text
image/jpeg
image/png
image/webp
application/pdf
```

Expand only if needed.

---

# 44. API Architecture

Use either:

```text
Server Actions
```

or:

```text
REST-like API routes
```

but maintain domain service layer underneath.

UI must not contain business logic.

Example:

```text
UI
 ↓
Application Action
 ↓
Domain Service
 ↓
Repository
 ↓
Database
```

---

# 45. Domain Service Example

Bad:

```text
route handler
→ direct ORM mutation
→ direct intent calculation
→ direct UI-specific behavior
```

Preferred:

```text
CompleteLessonAction
    ↓
EnrollmentService.completeLesson()
    ↓
ProgressService.recalculate()
    ↓
EventService.emit()
    ↓
SignalService.evaluate()
```

---

# 46. Repository Pattern

Do not over-engineer generic repositories.

Use domain-specific repositories.

Example:

```text
ProgramRepository
EnrollmentRepository
EventRepository
```

Avoid:

```text
BaseRepository<T>
GenericCRUDRepository
```

unless clear value exists.

---

# 47. Transaction Boundaries

Use database transaction for operations that must stay consistent.

Example lesson completion:

```text
BEGIN

update lesson_progress
update enrollment
insert milestone event

COMMIT
```

Signal/next-action evaluation can be:

- inside transaction if simple,
- immediately after commit if safer.

---

# 48. Idempotency

Critical mutations must be idempotent:

```text
completeLesson
completeProgram
progress milestone events
createNextAction
public enrollment
```

Example:

```text
complete same lesson twice
```

must not create:

```text
two lesson.completed events
```

---

# 49. Scheduled Jobs

V0.1 needs only a small number of jobs.

Required:

```text
at-risk learner evaluation
```

Frequency:

```text
daily
```

Rule:

```text
last_activity_at <= now - 7 days
progress < 50
status != completed
```

Then:

```text
learning_status = at_risk
emit learner.inactive
evaluate next action
```

---

# 50. Reactivation

If at-risk learner becomes active:

```text
lesson.started
lesson.completed
reflection.submitted
```

then:

```text
learning_status = active
```

Do not permanently mark user at-risk.

---

# 51. PromotorFlow Integration Boundary

Binding contract:

```text
INTEGRATION_CONTRACT.md
```

PromotorClass must not directly manipulate PromotorFlow internal tables or UI state.

Class → Flow:

```ts
interface PromotorFlowAdapter {
  getContactContext(contactId: string): Promise<FlowContactContext>;
  getAssessmentStatus(contactId: string): Promise<AssessmentStatus>;
  createNextAction(input: LearningNextActionRequest): Promise<NextActionRef>;
  appendLearningActivity(input: LearningActivityProjection): Promise<void>;
}
```

Flow → Class:

```ts
interface PromotorClassAdapter {
  getLearningContext(contactId: string): Promise<LearningContext>;
  listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]>;
  enrollContact(input: EnrollContactInput): Promise<EnrollmentRef>;
  getEnrollmentStatus(contactId: string, programId: string): Promise<EnrollmentStatus | null>;
}
```

---

# 52. Integration Modes

## Mode A — Shared Platform / Local Adapters

Recommended initially.

Shared Core owns:

```text
organizations
users
contacts
```

Use:

```text
LocalPromotorFlowAdapter
LocalPromotorClassAdapter
```

Adapters call application services.

Do not directly insert cross-product domain rows merely because one DB is shared.

## Mode B — Separate Services

Use versioned HTTP/service adapters.

Require:

- runtime validation,
- service auth,
- idempotency,
- timeout,
- integration outbox/retry.

No broker is required for V0.1.

---

# 53. Shared Identity Contract

Canonical:

```text
organization_id
user_id
contact_id
phone_e164
```

Phone storage:

```text
+62812...
```

Do not create:

```text
promotorclass_contact_id
promotorflow_contact_id
learner_person_id
```

for one person.

---

# 54. Failure Handling — PromotorFlow

PromotorClass remains usable if Flow is unavailable.

Learning transaction may persist:

```text
learning state
learning_event
learning_signal
integration_outbox request
```

then commit.

Sync retries later.

Do not create a fake local canonical NextAction while waiting.

Class Home can still display local learning signal / recommended next step.

# 55. Error Model

Canonical application errors:

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

Domain-specific examples:

```text
PROGRAM_NOT_PUBLISHED
ALREADY_ENROLLED
LESSON_NOT_AVAILABLE
REFLECTION_REQUIRED
INVALID_YOUTUBE_URL
```

---

# 56. YouTube URL Validation

Accept common formats:

```text
https://youtube.com/watch?v=VIDEO_ID
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://youtube.com/embed/VIDEO_ID
```

Reject:

- non-YouTube host,
- missing video ID,
- malformed URL.

Normalize into:

```text
provider
externalId
originalUrl
```

---

# 57. Caching Strategy

V0.1 should keep caching conservative.

Good candidates:

```text
public published program
program curriculum
template definitions
```

Do not aggressively cache:

```text
learner progress
next actions
activity
intent
```

unless invalidation is correct.

---

# 58. Search Architecture

V0.1 search:

```text
ILIKE / trigram optional
```

Searchable:

```text
contacts.name
contacts.phone
programs.title
```

No Elasticsearch required.

---

# 59. Analytics Architecture

Use PostgreSQL aggregate queries.

Metrics:

```text
enrolled
started
50%
80%
completed
CTA clicked
average progress
```

Avoid loading raw rows into browser to aggregate.

---

# 60. Analytics Query Example

```text
program_id
  ↓
enrollments
  ↓
COUNT / FILTER
```

Example conceptual:

```sql
COUNT(*) FILTER (WHERE status = 'completed')
```

No external analytics warehouse required.

---

# 61. Product Analytics vs Domain Events

Separate concepts.

## Domain Events

Business truth:

```text
lesson.completed
program.completed
cta.clicked
```

Stored in:

```text
learning_events
```

## Product Analytics

UI usage:

```text
promotor.program_created
promotor.followup_opened
learner.registration_completed
```

Use separate analytics system/event stream.

Do not use product analytics as business source of truth.

---

# 62. Security Architecture

Minimum:

```text
HTTPS
secure cookies
server-side authorization
input validation
tenant isolation
rate limiting
signed uploads
secret management
```

---

# 63. CSRF

If using cookie-based mutation endpoints:

use framework-supported CSRF protection / same-site strategy.

Do not expose mutation APIs without origin/session protection.

---

# 64. XSS

Reflection and lesson content may contain user input.

Rules:

- escape learner responses,
- sanitize rich text,
- never render untrusted HTML directly,
- validate external links.

---

# 65. Rate Limiting

Apply to:

```text
public registration
login
magic-link request
CTA abuse-sensitive endpoint
file upload URL generation
```

---

# 66. Privacy Architecture

Do not store:

```text
fingerprints
raw biometric scans
biometric templates
```

PromotorClass does not process assessment fingerprint data.

Allowed business context may include:

```text
assessment_status
assessment_date
result_category optional
```

only if required and properly permissioned.

---

# 67. Sensitive Reflection Data

Reflection may contain personal context.

Do not:

- expose cross-tenant,
- log full reflection body in server logs,
- send automatically to AI provider,
- include in error telemetry.

---

# 68. Data Deletion

Contact deletion workflow should remove/anonymize:

```text
enrollments
lesson progress
reflection responses
next actions
personal learning events
```

Aggregate anonymized analytics may remain if no personal identifier remains.

---

# 69. Observability

Minimum production observability:

```text
application errors
failed DB queries
API latency
failed scheduled jobs
failed file upload confirmations
failed PromotorFlow sync
```

---

# 70. Logging

Structured logs:

```text
request_id
organization_id
operation
entity_id
result
duration
```

Never log:

```text
auth tokens
magic links
passwords
full reflection content
secrets
```

---

# 71. Health Checks

Provide basic endpoints:

```text
/health
```

Checks:

```text
application up
database reachable
```

External provider failure should not fail whole health endpoint unless critical.

---

# 72. Performance Architecture

Primary optimization target:

```text
mid-range Android
ordinary mobile connection
```

Guidelines:

- Server-render first useful content,
- lazy-load YouTube iframe where possible,
- paginate learner lists,
- paginate activity,
- avoid heavy chart libraries,
- avoid large client bundles.

---

# 73. YouTube Lazy Loading

Do not load all YouTube iframes on page load.

Learner lesson contains one main player.

Editor preview can use:

```text
thumbnail / placeholder
```

then instantiate iframe only when needed.

This reduces:

- page weight,
- external scripts,
- network usage.

---

# 74. Frontend Architecture

Promotor and learner experiences should share foundations but not identical composition.

Shared:

```text
Button
Input
Textarea
ProgressBar
Modal
SidePanel
Divider
```

Promotor-specific:

```text
AppShell
ProgramRow
LearnerRow
ActivityRow
NextStepBlock
LearningTimeline
```

Learner-specific:

```text
LessonReader
ReflectionBlock
CourseProgress
CompletionView
```

---

# 75. Avoid Generic Card Architecture

Do not create UI architecture around:

```text
DashboardCard
StatCard
FeatureCard
GradientCard
```

Prefer semantic components.

Example:

```text
LearnerRow
NextStepBlock
CurriculumSection
```

---

# 76. State Management

Prefer server state from framework/data fetching.

Do not introduce global client state library unless justified.

Use local state for:

- drawer open/close,
- modal,
- form state,
- optimistic minor interactions.

Core domain state belongs server-side.

---

# 77. Form Strategy

Use:

```text
server-side validation
+
client-side usability validation
```

Zod schemas should be reusable between boundaries where practical.

---

# 78. Optimistic UI

Safe candidates:

```text
toggle lesson complete
minor settings
```

But ensure server rollback/error state.

Avoid optimistic:

```text
program publish
contact deletion
critical next action sync
```

unless carefully handled.

---

# 79. Route Architecture

Suggested routes:

```text
/login

/app
/app/programs
/app/programs/new
/app/programs/[programId]
/app/programs/[programId]/lessons/[lessonId]
/app/learners
/app/activity
/app/templates
/app/settings

/[workspaceSlug]/[programSlug]

/learn
/learn/programs/[enrollmentId]
/learn/programs/[enrollmentId]/lessons/[lessonId]
```

---

# 80. Public vs Authenticated Routes

Public:

```text
workspace/program landing
registration
login
magic-link verification
```

Promotor protected:

```text
/app/*
```

Learner protected/session-scoped:

```text
/learn/*
```

---

# 81. Database Index Strategy

Required indexes:

## Contacts

```text
organization_id
organization_id + phone_normalized
organization_id + email
```

## Programs

```text
organization_id
organization_id + slug UNIQUE
organization_id + status
```

## Enrollments

```text
organization_id
program_id
contact_id
program_id + contact_id UNIQUE
last_activity_at
intent_score
learning_status
```

## Events

```text
organization_id + created_at
contact_id + created_at
program_id + created_at
event_type
```

## Next Actions

```text
organization_id + status + due_at
contact_id + status
```

---

# 82. Database Constraints

Use DB constraints, not only app validation.

Examples:

```text
progress_percent BETWEEN 0 AND 100
intent_score BETWEEN 0 AND 100
unique program/contact enrollment
unique org/program slug
```

---

# 83. Soft Delete Strategy

V0.1:

Prefer explicit archive for programs.

For personal data deletion:

use actual delete/anonymization path.

Do not introduce universal `deleted_at` everywhere without need.

---

# 84. Template Architecture

V0.1 templates can live as versioned JSON/code.

Example:

```text
templates/
  parenting-lead-magnet.v1.json
  aftersales-30-days.v1.json
```

Using template:

```text
load definition
    ↓
deep copy
    ↓
create draft program
```

No template marketplace infrastructure.

---

# 85. Template Versioning

Template updates must not mutate previously copied programs.

Template identifier:

```text
template_key
template_version
```

Optional metadata on created program:

```text
source_template_key
source_template_version
```

---

# 86. Testing Architecture

Layers:

```text
Unit
Integration
E2E
```

---

# 87. Unit Test Targets

```text
normalizePhone()
parseYouTubeUrl()
calculateProgress()
calculateIntentScore()
evaluateNextStep()
evaluateAtRisk()
generateSlug()
```

---

# 88. Integration Test Targets

```text
registration → contact match → enrollment
complete lesson → progress → events
reflection → event → signal
CTA click → score → action
program complete → next action
```

---

# 89. Cross-Tenant Tests

Mandatory.

Create:

```text
Org A
Org B
```

Ensure:

```text
Org A cannot read Org B contacts
Org A cannot read Org B programs
Org A cannot mutate Org B enrollments
```

---

# 90. E2E Critical Path

```text
Promotor creates program
    ↓
Adds lesson
    ↓
Publishes
    ↓
Learner registers
    ↓
Learner completes lesson
    ↓
Learner submits reflection
    ↓
Program completes
    ↓
Promotor sees signal
    ↓
Promotor opens follow-up
```

This is the primary E2E scenario.

---

# 91. CI Pipeline

Minimum:

```text
install
typecheck
lint
unit tests
integration tests
build
```

Optional preview deploy after build.

E2E can run:

- on PR,
- before release,
- or against preview environment.

---

# 92. Migration Policy

Rules:

- one logical schema change per migration,
- no destructive production migration without explicit migration plan,
- migrations committed to repo,
- seed separate from migration.

---

# 93. Environment Configuration

Suggested variables:

```text
DATABASE_URL

APP_URL
AUTH_SECRET

STORAGE_ENDPOINT
STORAGE_BUCKET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY

PROMOTORFLOW_BASE_URL optional
PROMOTORFLOW_API_KEY optional

ANALYTICS_KEY optional
ERROR_TRACKING_DSN optional
```

Validate environment at startup.

---

# 94. Local Development

Local environment should support:

```text
PostgreSQL
seed data
mock PromotorFlow adapter
local or dev object storage
```

Developer should be able to:

```text
clone
install
migrate
seed
run
```

without external manual DB setup beyond documented env.

---

# 95. Seed Architecture

Seed should create:

```text
Organization:
Rina Learning Studio

Promotor:
Rina Maharani

Programs:
7 Hari Mengenal Cara Belajar Anak
30 Hari Setelah Tes
Parenting Growth Program
7 Hari Memahami Potensi Remaja

Contacts:
Ayu Rahma
Nina Wulandari
Dimas Pratama
Nadia Putri
Hendra Saputra
```

And realistic:

- progress,
- reflections,
- learning events,
- next actions.

---

# 96. PromotorFlow Adapter — Local Implementation

Initial:

```text
LocalPromotorFlowAdapter
```

Methods:

```text
getContactContext()
getAssessmentStatus()
createNextAction()
appendLearningActivity()
```

It calls PromotorFlow application services.

It does not make PromotorClass an owner of Flow `next_actions`.

Reverse integration:

```text
LocalPromotorClassAdapter
```

Methods:

```text
getLearningContext()
listEligiblePrograms()
enrollContact()
getEnrollmentStatus()
```

Later both may be replaced with HTTP implementations without changing caller modules.

---

# 97. Integration Outbox

Required for external/HTTP adapter reliability.

```text
integration_outbox

id
organization_id
destination
operation
idempotency_key
payload
status
attempt_count
next_attempt_at
last_error_code nullable
created_at
processed_at nullable
```

Status:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

Shared local-adapter mode may use synchronous calls; external mode requires durable retry.

# 98. Future Scalability

Modular monolith can scale vertically/horizontally before services are split.

Likely first pressure points:

```text
public program traffic
activity queries
event volume
file uploads
analytics
```

Mitigations:

- indexes,
- pagination,
- caching published curriculum,
- background jobs.

Do not split services prematurely.

---

# 99. Future Extraction Candidates

Only if justified:

```text
Notification Service
Analytics Service
Media Service
PromotorFlow Integration Service
```

Not candidates initially:

```text
Lessons Service
Contacts Service
Programs Service
```

unless scale demands it.

---

# 100. Architecture Decision Records

Important decisions should be documented as ADRs.

Recommended ADRs:

```text
ADR-001 Modular Monolith
ADR-002 Shared Contact Identity
ADR-003 Database-backed Learning Events
ADR-004 YouTube Unlisted Video Provider
ADR-005 Manual Video Lesson Completion
ADR-006 PromotorFlow Adapter Boundary
ADR-007 No AI Dependency in Core Workflow
```

---

# 101. ADR-001 — Modular Monolith

Decision:

```text
Use modular monolith for V0.1.
```

Reason:

- fastest iteration,
- simpler deployment,
- clear transaction boundaries,
- current scale does not justify microservices.

---

# 102. ADR-002 — Shared Contact Identity

Decision:

```text
Contact is canonical Shared Core customer identity across learning and business workflows.
```

Reason:

avoid duplicate lead/learner/client records.

---

# 103. ADR-003 — Database Event Log

Decision:

```text
Use PostgreSQL learning_events table for internal domain event history.
```

Reason:

- simple,
- transactional,
- queryable,
- sufficient for V0.1.

---

# 104. ADR-004 — YouTube Unlisted

Decision:

```text
YouTube Unlisted is the only V0.1 video provider.
```

Reason:

eliminates:

- video upload infrastructure,
- transcoding,
- streaming CDN,
- playback backend,
- storage cost complexity.

Accepted trade-off:

YouTube branding/player UI may appear.

---

# 105. ADR-005 — Manual Completion

Decision:

```text
Video lesson completion is manual.
```

Reason:

- predictable,
- no dependence on IFrame Player API,
- no playback edge cases,
- easier cross-device behavior.

---

# 106. ADR-006 — PromotorFlow Adapter

Decision:

```text
PromotorClass communicates with business workflow through adapter boundary.
```

Reason:

allows:

- Shared Core/local adapters initially,
- separate services later,
- reduced coupling,
- one canonical PromotorFlow NextAction owner.

---

# 107. ADR-007 — AI Optional

Decision:

```text
Core workflow must function without AI.
```

Core features remain deterministic:

- intent score,
- progress,
- at-risk,
- next step rules,
- timeline.

AI may later assist:

- draft message,
- reflection summary,
- course drafting.

---

# 108. Failure Scenario Matrix

## Database unavailable

Result:

```text
app unavailable
```

Return controlled error.

---

## YouTube unavailable

Result:

lesson still loads text/resources.

Video area shows playback error.

Do not lose learner progress state.

---

## Object storage unavailable

Result:

document/image resource unavailable.

Core lesson text remains usable.

---

## PromotorFlow unavailable

Result:

learning continues.

Next action sync queued/retried.

PromotorClass remains operational.

---

# 109. Data Consistency Priority

Highest consistency:

```text
enrollment
lesson progress
reflection
program completion
contact identity
```

Eventually consistent allowed:

```text
analytics
PromotorFlow external sync
notifications
```

---

# 110. Architecture Definition of Done

Architecture V0.1 is correctly implemented when:

- [ ] multi-tenant isolation is enforced,
- [ ] contact identity is shared/canonical,
- [ ] program/curriculum domain is modular,
- [ ] YouTube logic is behind provider abstraction,
- [ ] lesson progress is server-authoritative,
- [ ] events are append-only,
- [ ] intent scoring is deterministic,
- [ ] next action rules are idempotent,
- [ ] PromotorFlow is behind adapter boundary,
- [ ] learner flow does not depend on CRM availability,
- [ ] biometric data is not stored,
- [ ] public/private route boundaries are enforced,
- [ ] mobile learner experience remains lightweight,
- [ ] critical path passes E2E.

---

# 111. Critical Architecture Path

The most important architecture path is:

```text
Contact
   ↓
Enrollment
   ↓
Lesson Progress
   ↓
Learning Event
   ↓
Intent / Signal
   ↓
Next Action
   ↓
Promotor
```

Everything else exists to support this loop.

If architectural complexity does not improve this loop, it should probably not exist in V0.1.

---

# 112. Final Architecture Rule

Before introducing any new:

- service,
- table,
- queue,
- cache,
- dependency,
- event,
- integration,

ask:

> Does this solve a validated V0.1 requirement, or are we designing for an imagined future?

If it is only for an imagined future:

```text
do not build it yet.
```
