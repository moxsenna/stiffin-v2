# PromotorClass V0.1 — Implementation Plan
## Detailed, Structured, Execution-Ready

**Product:** PromotorClass  
**Version:** V0.1  
**Status:** Ready for engineering planning  
**Primary references:**  
- `PromotorClass_PRD_V0.1.md`
- `PromotorClass_Design_Plan_Anti_AI_Slop.md`
- `dc.html` prototype

---

# 1. Objective

Dokumen ini menerjemahkan PRD dan design plan menjadi urutan implementasi yang dapat dieksekusi oleh coding agent atau tim engineering tanpa kehilangan arah.

Target V0.1:

```text
Promotor dapat:
Create Program
→ Build Curriculum
→ Publish
→ Enroll / Receive Learner
→ See Progress
→ See Reflection
→ Receive Learning Signal
→ Create Next Action
→ Follow Up

Learner dapat:
Register
→ Access Program
→ Learn
→ Submit Reflection
→ Complete Program
→ Click CTA
```

Core product loop:

```text
Learning Activity
      ↓
Learning Signal
      ↓
Context
      ↓
Next Step
      ↓
Human Action
```

---

# 2. Scope Lock

## In Scope V0.1

### Promotor
- authentication
- workspace / organization
- programs
- modules
- lessons
- resources
- public/private access
- learner registration
- enrollment
- progress
- reflections
- CTA
- learner detail
- learning timeline
- activity log
- intent score
- next step rules
- basic PromotorFlow integration surface
- templates
- program analytics
- account/settings
- responsive mobile

### Learner
- public registration
- passwordless/session access
- learner home
- program overview
- lesson reader
- reflection
- lesson completion
- progress
- completion state
- CTA

---

## Explicitly Out of Scope

Do not implement:

- SCORM
- community
- forum
- chat
- gamification
- badge
- point
- certificate builder
- quiz engine kompleks
- live streaming
- Zoom integration
- native WhatsApp API automation
- payment gateway
- subscriptions
- team roles kompleks
- multi-branch admin
- affiliate
- marketplace
- AI autonomous agent
- AI course generator
- biometric processing
- fingerprint storage

Any coding agent that introduces these should be considered out of scope.

---

# 3. Recommended Architecture

Use a **modular monolith**.

Avoid microservices in V0.1.

Suggested high-level architecture:

```text
Web App
│
├── Promotor App
├── Learner App
├── Public Registration
│
└── API / Server Actions
      │
      ├── Auth Module
      ├── Organization Module
      ├── Contact Module
      ├── Program Module
      ├── Lesson Module
      ├── Enrollment Module
      ├── Reflection Module
      ├── Event Module
      ├── Signal Module
      └── PromotorFlow Adapter
             │
             └── Shared / future external integration

PostgreSQL

Object Storage
```

---

# 4. Suggested Stack

Recommended but not mandatory:

```text
Framework:
Next.js 15+ / App Router

Language:
TypeScript

Database:
PostgreSQL

ORM:
Drizzle ORM
or Prisma

Auth:
Magic link / managed auth
or custom passwordless flow

Storage:
Cloudflare R2 / S3-compatible

Validation:
Zod

UI:
custom components
strict CSS tokens
or Tailwind with hard design constraints

Testing:
Vitest
Playwright

Deployment:
Vercel / Cloudflare-compatible
```

Priority:

```text
maintainability
predictability
clear types
simple deployment
```

over framework novelty.

---

# 5. Repository Structure

Suggested:

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── verify/
│   │
│   ├── (promotor)/
│   │   ├── home/
│   │   ├── programs/
│   │   ├── learners/
│   │   ├── activity/
│   │   ├── templates/
│   │   └── settings/
│   │
│   ├── (learner)/
│   │   ├── learn/
│   │   └── programs/
│   │
│   ├── public/
│   │   └── [workspaceSlug]/
│   │       └── [programSlug]/
│   │
│   └── api/
│
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── contacts/
│   ├── programs/
│   ├── lessons/
│   ├── enrollments/
│   ├── reflections/
│   ├── ctas/
│   ├── events/
│   ├── signals/
│   ├── templates/
│   └── promotorflow/
│
├── components/
│   ├── foundation/
│   ├── controls/
│   ├── data/
│   ├── overlays/
│   └── learning/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
│
├── lib/
│   ├── auth/
│   ├── validation/
│   ├── permissions/
│   ├── phone/
│   ├── storage/
│   └── events/
│
└── styles/
    ├── tokens.css
    └── globals.css
```

---

# 6. Core Engineering Principles

## 6.1 Organization Isolation

Every tenant-owned table must contain:

```text
organization_id
```

or be reachable through a tenant-owned parent.

Every read/write must validate organization ownership.

Never trust client-supplied organization IDs.

---

## 6.2 Shared Contact Identity

One person must have one canonical `contact`.

Learner should reference:

```text
contact_id
```

not duplicate:

```text
learner_name
learner_phone
learner_email
```

inside enrollment records.

---

## 6.3 Event-Driven Domain Updates

Any meaningful learner action should emit a learning event.

Example:

```text
lesson.completed
```

then:

```text
progress recalculation
intent scoring
signal evaluation
activity timeline
next action rules
```

should derive from that event.

---

## 6.4 Deterministic Before AI

V0.1 logic must be rule-based.

No AI should be required for:

- intent score
- next step
- at-risk status
- program completion
- learner timeline

---

## 6.5 Server Authority

Important state transitions must be server-side:

- publish program
- enroll learner
- complete lesson
- update progress
- submit reflection
- score intent
- create next action

Client is not source of truth.

---

# 7. Database Schema — Phase 1

Implement these core tables first.

---

## organizations

```text
id UUID PK
name TEXT
slug TEXT UNIQUE
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## users

```text
id UUID PK
organization_id UUID FK
name TEXT
email TEXT
phone TEXT nullable
role TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

V0.1 role:

```text
owner
```

Future-ready:

```text
admin
editor
```

---

## contacts

```text
id UUID PK
organization_id UUID FK
name TEXT
phone TEXT
phone_normalized TEXT
email TEXT nullable
source TEXT nullable
metadata JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

Indexes:

```text
organization_id
organization_id + phone_normalized
organization_id + email
```

---

## programs

```text
id UUID PK
organization_id UUID FK
title TEXT
slug TEXT
description TEXT
type TEXT
status TEXT
access_type TEXT
instructor_user_id UUID FK
cover_asset_id UUID nullable
created_at TIMESTAMP
updated_at TIMESTAMP
published_at TIMESTAMP nullable
```

Enums:

```text
type:
lead_magnet
aftersales
paid
private

status:
draft
published
archived

access_type:
public
private
manual
```

Unique:

```text
organization_id + slug
```

---

## modules

```text
id UUID PK
program_id UUID FK
title TEXT
position INT
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## lessons

```text
id UUID PK
module_id UUID FK
title TEXT
type TEXT
body TEXT nullable
video_provider TEXT nullable
video_url TEXT nullable
video_external_id TEXT nullable
estimated_duration INT nullable
completion_rule TEXT
position INT
is_required BOOLEAN
status TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

Enums:

```text
type:
video
text
reflection
cta

completion_rule:
manual
content_viewed
video_completed

V0.1 runtime support:
manual only

status:
draft
published
```

---

## lesson_resources

```text
id UUID PK
lesson_id UUID FK
type TEXT
title TEXT
asset_url TEXT
position INT
created_at TIMESTAMP
```

---

## enrollments

```text
id UUID PK
organization_id UUID FK
program_id UUID FK
contact_id UUID FK
status TEXT
progress_percent INT
intent_score INT
intent_label TEXT
learning_status TEXT
enrolled_at TIMESTAMP
started_at TIMESTAMP nullable
completed_at TIMESTAMP nullable
last_activity_at TIMESTAMP nullable
created_at TIMESTAMP
updated_at TIMESTAMP
```

Unique:

```text
program_id + contact_id
```

Enums:

```text
status:
enrolled
started
completed
cancelled

learning_status:
active
completed
inactive
at_risk

intent_label:
cold
warm
hot
```

---

## lesson_progress

```text
id UUID PK
enrollment_id UUID FK
lesson_id UUID FK
status TEXT
started_at TIMESTAMP nullable
completed_at TIMESTAMP nullable
updated_at TIMESTAMP
```

Unique:

```text
enrollment_id + lesson_id
```

---

## reflection_questions

```text
id UUID PK
lesson_id UUID FK
question TEXT
input_type TEXT
options JSONB nullable
is_required BOOLEAN
position INT
```

---

## reflection_responses

```text
id UUID PK
enrollment_id UUID FK
lesson_id UUID FK
question_id UUID FK
response JSONB
submitted_at TIMESTAMP
```

---

## ctas

```text
id UUID PK
lesson_id UUID FK
label TEXT
type TEXT
destination TEXT
created_at TIMESTAMP
```

Enums:

```text
whatsapp
book_session
promotorflow_booking
external_link
enroll_program
```

---

## learning_events

```text
id UUID PK
organization_id UUID FK
contact_id UUID FK
program_id UUID nullable
lesson_id UUID nullable
event_type TEXT
payload JSONB
created_at TIMESTAMP
```

Indexes:

```text
organization_id + created_at
contact_id + created_at
program_id + created_at
```

---

## next_actions

For V0.1 shared locally if PromotorFlow is not yet fully connected.

```text
id UUID PK
organization_id UUID FK
contact_id UUID FK
source TEXT
source_event_id UUID nullable
title TEXT
reason TEXT
status TEXT
due_at TIMESTAMP nullable
created_at TIMESTAMP
completed_at TIMESTAMP nullable
```

Enums:

```text
pending
completed
dismissed
```

---

# 8. Migration Order

Migrations must be done in this order:

```text
001 organizations
002 users
003 contacts
004 programs
005 modules
006 lessons
007 lesson_resources
008 enrollments
009 lesson_progress
010 reflection_questions
011 reflection_responses
012 ctas
013 learning_events
014 next_actions
015 indexes
```

Do not mix large schema changes into one migration.

---

# 9. Seed Data

Create deterministic seed script.

Workspace:

```text
Rina Maharani
organization: Rina Learning Studio
slug: rina
```

Programs:

```text
7 Hari Mengenal Cara Belajar Anak
30 Hari Setelah Tes
Parenting Growth Program
7 Hari Memahami Potensi Remaja
```

Learners:

```text
Ayu Rahma
Nina Wulandari
Dimas Pratama
Nadia Putri
Hendra Saputra
```

Seed must include:

- programs
- modules
- lessons
- enrollment progress
- reflection responses
- learning events
- next actions

So every core screen has realistic data immediately.

---

# 10. Implementation Phases Overview

Recommended sequence:

```text
M0 Foundation
M1 Auth + Tenant
M2 Contacts
M3 Program Core
M4 Curriculum
M5 Learner Registration
M6 Enrollment + Progress
M7 Reflection + CTA
M8 Events + Signals
M9 Promotor Home
M10 Learners + Timeline
M11 Analytics
M12 Templates
M13 PromotorFlow Adapter
M14 Responsive + Accessibility
M15 QA + Hardening
M16 Pilot Release
```

Do not start advanced frontend before schema and domain contracts stabilize.

---

# 11. M0 — Foundation

## Objective

Build project skeleton and lock design system.

---

## Tasks

### Project setup

- initialize Next.js
- TypeScript strict mode
- linting
- formatting
- environment validation
- database connection
- migration runner
- test setup

### Styling

Create:

```text
tokens.css
globals.css
```

Lock tokens from design plan:

```text
colors
spacing
radius
font sizes
line heights
focus ring
```

### Base components

Implement only:

```text
AppShell
Sidebar
MobileBottomNav
TopBar
PageHeader
SectionHeader
Divider
Button
Input
Textarea
Select
RadioGroup
Checkbox
Switch
DataRow
ProgressBar
SidePanel
Modal
Toast
```

Do not create generic `Card`.

---

## Acceptance Criteria

- [ ] App boots.
- [ ] TypeScript strict passes.
- [ ] DB connection works.
- [ ] Design tokens available.
- [ ] Base components match `dc.html`.
- [ ] No gradient / glass / giant radius.
- [ ] Mobile shell works at 360px.

---

# 12. M1 — Auth + Tenant

## Objective

Promotor can securely access one organization.

---

## Tasks

- implement login
- implement passwordless/magic-link or managed auth
- create organization on first user
- organization membership lookup
- protect promotor routes
- server-side organization context helper

Helper:

```text
requireUser()
requireOrganization()
```

Never accept raw org id from browser without verification.

---

## Acceptance Criteria

- [ ] Anonymous cannot access promotor app.
- [ ] Logged-in user resolves organization.
- [ ] Cross-org access tests fail correctly.
- [ ] Session is secure.

---

# 13. M2 — Contacts

## Objective

Create canonical contact layer before enrollment.

---

## Tasks

Create contact service:

```text
createContact
findContactByPhone
findContactByEmail
matchOrCreateContact
updateContact
```

Implement phone normalization.

Indonesia example:

```text
0812...
+62812...
62812...
```

should normalize to one canonical representation.

Suggested:

```text
+62812...
```

---

## Acceptance Criteria

- [ ] Same phone does not duplicate contact.
- [ ] Email fallback can match.
- [ ] Organization isolation enforced.
- [ ] Contact source stored.

---

# 14. M3 — Program Core

## Objective

Promotor can create, edit, publish, archive programs.

---

## Backend

Implement:

```text
createProgram
updateProgram
publishProgram
archiveProgram
getProgram
listPrograms
```

Validation:

```text
title required
type valid
status valid
slug unique per org
```

---

## Frontend

Build:

```text
Programs list
New Program
Program header
Program Settings
```

Programs list desktop:

table/list.

Mobile:

stacked rows.

---

## Acceptance Criteria

- [ ] User can create program.
- [ ] New program defaults to draft.
- [ ] Slug generated safely.
- [ ] Duplicate slug handled.
- [ ] User can publish.
- [ ] User can archive.
- [ ] No card-grid admin design.

---

# 15. M4 — Curriculum

## Objective

Promotor can build structured learning content.

---

## Backend

Implement:

```text
createModule
updateModule
deleteModule
reorderModules

createLesson
updateLesson
deleteLesson
reorderLessons
```

Ensure reorder is transactional.

---

## Frontend

Build curriculum UI:

```text
section hierarchy
lesson rows
inline metadata
hover controls
add lesson
open lesson editor
```

Lesson editor:

```text
title
type
body
YouTube Unlisted URL
video preview
duration
required
completion rule
visibility
resources
```

For video lesson:

```text
video_provider = youtube
```

Server must validate the URL and extract the YouTube video ID.

---

## Acceptance Criteria

- [ ] Create module.
- [ ] Create lesson.
- [ ] Edit lesson.
- [ ] Delete lesson with confirmation.
- [ ] Reorder persists.
- [ ] Published program cannot expose draft lesson.
- [ ] Curriculum hierarchy matches design plan.

---

# 16. M5 — Public Program + Registration

## Objective

Lead can register from a public program.

---

## Routes

Example:

```text
/[workspaceSlug]/[programSlug]
```

Page contains:

```text
program title
description
instructor
registration form
```

No page builder.

---

## Registration Flow

```text
Submit
→ normalize phone
→ match contact
→ create contact if needed
→ create enrollment
→ create learner.registered event
→ create learner.enrolled event
→ create session/access token
→ redirect to learner program
```

---

## Abuse Protection

Add:

- rate limit
- validation
- honeypot optional
- basic anti-bot protection

---

## Acceptance Criteria

- [ ] Public program accessible only if published.
- [ ] Draft program returns 404/not available.
- [ ] Registration creates/matches contact.
- [ ] Duplicate registration reuses enrollment.
- [ ] Enrollment event emitted.
- [ ] Registration works from mobile.

---

# 17. M6 — Enrollment + Progress Engine

## Objective

Learner can start and complete content reliably.

---

## Backend

Implement:

```text
getEnrollment
startEnrollment
startLesson
completeLesson
recalculateProgress
completeProgram
```

Progress formula:

```text
completed_required_lessons
/
total_required_lessons
* 100
```

Round consistently.

---

## Rules

On first lesson activity:

```text
enrollment.status = started
started_at = now
```

On lesson completion:

```text
lesson_progress.status = completed
last_activity_at = now
recalculate progress
emit lesson.completed
```

If all required lessons completed:

```text
status = completed
learning_status = completed
completed_at = now
emit program.completed
```

---

## Acceptance Criteria

- [ ] Lesson completion idempotent.
- [ ] Progress never exceeds 100.
- [ ] Optional lesson does not block completion.
- [ ] Program completion fires once.
- [ ] Last activity updates.

---

# 18. M7 — Reflection + CTA

## Objective

Capture meaningful learner intent and context.

---

## Reflection

Implement:

```text
createReflectionQuestion
updateReflectionQuestion
submitReflection
getReflectionResponses
```

Input types:

```text
long_text
single_select
multi_select
```

On submit:

```text
reflection.submitted
```

event emitted.

---

## CTA

Implement:

```text
createCTA
updateCTA
trackCTAView
trackCTAClick
```

CTA types:

```text
whatsapp
external_link
promotorflow_booking
enroll_program
```

---

## Acceptance Criteria

- [ ] Required reflection blocks completion when unanswered.
- [ ] Reflection safely rendered.
- [ ] CTA click tracked exactly once per click event.
- [ ] CTA event contains contact/program/lesson.

---

# 19. M8 — Event Layer

## Objective

Make all meaningful actions observable and reusable.

---

## Event Service

Implement:

```text
emitLearningEvent()
getContactTimeline()
getProgramEvents()
getRecentActivity()
```

Event names:

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
```

---

## Milestone Event Deduplication

Ensure:

```text
program.progress_50
program.progress_80
program.completed
```

fire once per enrollment.

Can use event existence checks or milestone fields.

---

## Acceptance Criteria

- [ ] Events are append-only.
- [ ] Event records include actor/context.
- [ ] Milestone events do not duplicate.
- [ ] Timeline ordering deterministic.

---

# 20. M9 — Intent Score Engine

## Objective

Compute transparent engagement score.

---

## V0.1 Scoring

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
0–39 Cold
40–69 Warm
70–100 Hot
```

---

## Implementation

Create:

```text
calculateIntentScore(enrollmentId)
```

Call after:

```text
enrollment
lesson completion
progress milestone
CTA click
program completion
```

Store:

```text
intent_score
intent_label
```

Do not rely solely on stored value; function should be recomputable.

---

## Acceptance Criteria

- [ ] Score deterministic.
- [ ] Score recomputable from events/state.
- [ ] UI shows label without excessive pill.
- [ ] No AI required.

---

# 21. M10 — Next Step Rules

## Objective

Convert learning state into business action.

---

## Rule Engine

Keep simple and explicit.

Implement rules as code/config, not visual builder.

Example:

```text
RULE 1

IF
program.type = lead_magnet
AND progress >= 80
AND assessment_status != completed

THEN
next action:
Follow up about assessment
```

```text
RULE 2

IF
program.type = aftersales
AND program completed
AND private_session_status = none

THEN
Offer Private Session
```

```text
RULE 3

IF
last_activity > 7 days
AND progress < 50

THEN
Send friendly reminder
```

---

## Rule Output

```text
title
reason
priority
due_at
source_event_id
```

Create only if equivalent pending action does not already exist.

---

## Acceptance Criteria

- [ ] Rule creation is idempotent.
- [ ] Reason is visible to user.
- [ ] No unexplained recommendation.
- [ ] Action can be completed/dismissed.

---

# 22. M11 — Promotor Home

## Objective

Build primary work queue.

---

## Queries

Need:

```text
getNeedsAttention()
getRecentActivity()
getSummaryMetrics()
```

Attention ranking:

```text
P1 CTA clicked
P1 program completed with opportunity
P1 intent >= 80
P2 meaningful reflection
P2 progress >= 80
P3 at risk
```

---

## UI

Must follow design plan:

```text
Home
summary line
Needs attention
Recent activity
```

No KPI cards.

---

## Acceptance Criteria

- [ ] Most relevant signals appear first.
- [ ] Each item has reason/context.
- [ ] User can open learner.
- [ ] User can act.
- [ ] Home remains useful with zero signals.

---

# 23. M12 — Learners + Learner Detail

## Objective

Give promotor clear context for each person.

---

## Learner List

Fields:

```text
name
program
progress
intent
last activity
status
```

Desktop:

table/list.

Mobile:

stacked rows.

---

## Learner Detail

Desktop:

side panel.

Mobile:

full-page.

Sections:

```text
identity
source
PromotorFlow stage
learning
reflection
timeline
next step
```

---

## Acceptance Criteria

- [ ] Side panel preserves list context.
- [ ] Timeline ordered correctly.
- [ ] Reflection visible.
- [ ] Next action visible.
- [ ] PromotorFlow link visible but secondary.

---

# 24. M13 — Learner Experience

## Objective

Build focused learning interface.

---

## Screens

```text
Learner Home
Program Overview
Lesson Reader
Reflection State
Completion State
```

---

## Requirements

Learner Home:

```text
Continue learning
Your programs
```

Lesson:

```text
content
resources
reflection
previous
complete
```

Completion:

```text
program complete
next relevant CTA
```

---

## Design Constraints

- max reading width 680–740px
- 16–18px body
- minimal chrome
- no hero gradient
- no dashboard widgets
- thin progress only

---

## Acceptance Criteria

- [ ] Learner can resume last lesson.
- [ ] Reading experience works at 360px.
- [ ] Reflection usable on mobile.
- [ ] Progress updates after completion.
- [ ] Completion CTA works.

---

# 25. M14 — Activity

## Objective

Provide compact audit/activity timeline.

---

## UI

```text
Today

03:01 Ayu completed Action Plan
02:57 Ayu completed Day 6

Yesterday

21:17 Dimas clicked Private Session
```

No avatar-heavy feed.

---

## Acceptance Criteria

- [ ] Events grouped by date.
- [ ] Pagination available.
- [ ] Old activity can load.
- [ ] No duplicate timeline records.

---

# 26. M15 — Analytics

## Objective

Provide only useful program analytics.

---

## Metrics

```text
enrolled
started
50% reached
80% reached
completed
CTA clicked
average progress
```

---

## Query Strategy

Prefer aggregated SQL queries.

Do not fetch all enrollment rows client-side.

---

## UI

Use:

```text
number strip
simple funnel
```

No chart library unless needed.

---

## Acceptance Criteria

- [ ] Numbers match raw data.
- [ ] CTA conversion calculation correct.
- [ ] Empty program shows zero-state.
- [ ] No misleading percentage.

---

# 27. M16 — Templates

## Objective

Reduce creation friction.

---

## Template Model

Option A V0.1:

store static template JSON in code.

Example:

```text
template id
title
type
modules
lessons
reflections
CTA
automation presets
```

On use:

```text
deep clone
→ new program
→ draft
```

Prefer code-based templates initially over database marketplace.

---

## Acceptance Criteria

- [ ] Using template creates independent copy.
- [ ] Editing copy does not affect source.
- [ ] Program remains draft.
- [ ] Lesson order preserved.

---

# 28. M17 — PromotorFlow Adapter

## Objective

Keep integration boundary clean.

---

## Interface

Create adapter:

```ts
interface PromotorFlowAdapter {
  getContactContext(contactId)
  getAssessmentStatus(contactId)
  createNextAction(input)
  appendLearningEvent(input)
}
```

For V0.1:

can use local/shared tables.

Later:

adapter can call external service.

---

## Important

PromotorClass must not depend on PromotorFlow UI internals.

Integration happens at domain/API level.

---

## Acceptance Criteria

- [ ] Adapter can be mocked.
- [ ] PromotorClass works if PromotorFlow service unavailable.
- [ ] Next action can queue/retry if needed.
- [ ] Duplicate action prevented.

---

# 29. Follow-Up Draft

## Objective

Support human action without automation risk.

---

## Flow

```text
Next Action
→ Follow Up
→ Draft modal
→ User edits
→ Open WhatsApp
```

Generate simple template based on action type.

V0.1:

no LLM dependency required.

Examples:

```text
high engagement
at risk
aftersales completed
CTA clicked
```

---

## Acceptance Criteria

- [ ] User can edit draft.
- [ ] No message auto-sent.
- [ ] WhatsApp deep link encodes message safely.
- [ ] Phone normalized.

---

# 30. Inactivity / At-Risk Job

## Objective

Mark learners inactive after configured period.

---

## V0.1 Rule

```text
if:
last_activity_at <= now - 7 days
AND progress < 50
AND status != completed

then:
learning_status = at_risk
emit learner.inactive
evaluate next step
```

Run:

```text
daily scheduled job
```

---

## Acceptance Criteria

- [ ] Completed learner never becomes at risk.
- [ ] Job idempotent.
- [ ] Event emitted once per inactivity episode.
- [ ] Re-activity returns status to active.

---

# 31. Media & File Handling

## V0.1 File Uploads

PromotorClass storage only handles:

```text
image
PDF
document / worksheet
```

Required controls:

- MIME validation
- size validation
- signed upload URL
- safe filename
- organization-scoped storage key

Example:

```text
/org/{orgId}/program/{programId}/resource/{uuid}.pdf
```

## V0.1 Video

Video is **not uploaded to PromotorClass**.

Only supported source:

```text
YouTube Unlisted
```

Flow:

```text
Promotor pastes YouTube URL
→ validate URL
→ extract video ID
→ store provider/url/external_id
→ render official YouTube embed
```

Accept common forms:

```text
youtube.com/watch?v=...
youtu.be/...
youtube.com/embed/...
```

Store:

```text
video_provider = "youtube"
video_url = original URL
video_external_id = extracted ID
```

## Explicitly Do Not Build

```text
video upload
video transcoding
video compression
HLS packaging
video CDN
thumbnail generation pipeline
Vimeo integration
custom player
DRM
watch percentage tracking
```

## YouTube Branding

Do not attempt to:

- cover YouTube branding,
- crop official controls,
- overlay custom UI on top of YouTube player,
- emulate a white-label player.

The official embed is treated as an external playback surface.

## Completion Rule

For all video lessons in V0.1:

```text
completion_rule = manual
```

Learner explicitly clicks:

```text
Complete lesson
```

Do not use YouTube IFrame playback state as a required dependency for progress.

## Future Abstraction

Video rendering code should depend on:

```text
video_provider
video_external_id
video_url
```

not directly on raw YouTube URL everywhere.

Create a small provider boundary such as:

```ts
interface VideoProvider {
  parse(inputUrl: string): ParsedVideo
  getEmbedUrl(externalId: string): string
}
```

V0.1 implementation:

```text
YouTubeVideoProvider
```

---

# 32. Public Access Security

Public program routes must not expose private/draft data.

Check:

```text
program.status == published
AND access_type == public
```

Private learner pages require valid session/token.

---

# 33. API / Server Action Map

Suggested endpoints/functions.

---

## Programs

```text
POST   /api/programs
GET    /api/programs
GET    /api/programs/:id
PATCH  /api/programs/:id
POST   /api/programs/:id/publish
POST   /api/programs/:id/archive
```

---

## Curriculum

```text
POST   /api/programs/:id/modules
PATCH  /api/modules/:id
POST   /api/modules/:id/lessons
PATCH  /api/lessons/:id
DELETE /api/lessons/:id
POST   /api/programs/:id/reorder
```

---

## Registration

```text
POST /api/public/:workspace/:program/register
```

---

## Learner

```text
GET  /api/learn/enrollments
GET  /api/learn/enrollments/:id
POST /api/learn/lessons/:id/start
POST /api/learn/lessons/:id/complete
POST /api/learn/reflections/:id
POST /api/learn/ctas/:id/click
```

---

## Promotor Learners

```text
GET /api/learners
GET /api/learners/:contactId
```

---

## Signals

```text
GET  /api/home/attention
GET  /api/activity
POST /api/next-actions/:id/complete
POST /api/next-actions/:id/dismiss
```

---

# 34. Validation Layer

Every mutation should use Zod schema.

Example:

```text
CreateProgramSchema
UpdateProgramSchema
CreateLessonSchema
YouTubeVideoUrlSchema
RegisterLearnerSchema
SubmitReflectionSchema
CompleteLessonSchema
```

Never trust client payload.

---

# 35. Permission Model V0.1

Only owner role.

But functions should still call:

```text
assertOrganizationAccess()
```

Future roles should not require full rewrite.

---

# 36. Error Handling

Define normalized app errors:

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

Frontend copy should remain concrete.

Example:

```text
Program could not be published.
At least one lesson must be published first.
```

---

# 37. Empty States

Must implement before pilot.

Examples:

Programs:

```text
No programs yet.
Create your first program.
```

Learners:

```text
No learners yet.
Share a program link or enroll an existing client.
```

Activity:

```text
No activity yet.
Learner activity will appear here.
```

---

# 38. Loading States

Use skeleton/list placeholders.

Avoid full-page spinner.

Critical routes should use:

```text
route-level loading
section-level loading
```

---

# 39. Design Enforcement

Create a lightweight internal review rule.

Before merging any screen:

Check:

```text
No decorative gradient
No glassmorphism
No giant radius
No default Card component
No emoji system icon
No 4 KPI card grid
No excessive pill
No static shadow
```

Search codebase for:

```text
linear-gradient
backdrop-filter
border-radius > 10px
box-shadow
```

Any occurrence requires review.

---

# 40. Responsive QA

Required breakpoints:

```text
360px
390px
768px
1024px
1440px
```

Verify:

- no horizontal scroll
- sticky nav works
- drawer becomes page/full-width
- forms remain usable
- curriculum rows do not collapse badly
- learner content readable

---

# 41. Accessibility QA

Required:

- tab through all interactive elements
- visible focus
- proper labels
- status + text, not color-only
- buttons use button semantics
- navigation uses semantic nav
- headings ordered
- drawer traps focus
- modal traps focus
- Escape closes overlay
- aria-label on icon-only buttons

---

# 42. Testing Strategy

## Unit Tests

Test:

```text
phone normalization
contact matching
YouTube URL parsing
YouTube video ID extraction
invalid video URL rejection
progress calculation
program completion
intent score
next step rules
inactivity rule
slug generation
```

---

## Integration Tests

Test:

```text
register learner
duplicate registration
complete lesson
submit reflection
program completion
CTA click
intent update
next action creation
```

---

## E2E Tests

Playwright scenarios:

### E2E 1

```text
Promotor login
→ create program
→ add module
→ add lesson
→ publish
```

### E2E 2

```text
Public register
→ learner opens program
→ complete lesson
→ submit reflection
→ complete program
```

### E2E 3

```text
Promotor Home
→ sees signal
→ opens learner
→ opens follow-up
```

### E2E 4

```text
Duplicate phone registration
→ same contact reused
```

---

# 43. Required Fixtures

Tests should have fixtures for:

```text
orgA
orgB

promotorA
promotorB

Ayu
Nina

published program
draft program
aftersales program

completed enrollment
at-risk enrollment
```

Cross-tenant test mandatory.

---

# 44. Logging

Structured logs for:

```text
registration
enrollment
lesson completion
program completion
event emission
next action creation
integration failure
```

Never log:

- full sensitive reflection text unnecessarily
- auth tokens
- magic links
- secrets

---

# 45. Observability

Minimum:

```text
server errors
API latency
failed event processing
failed scheduled jobs
failed file uploads
```

For early pilot:

simple error tracking is enough.

---

# 46. Security Review Checklist

Before pilot:

- [ ] tenant isolation tested
- [ ] auth routes protected
- [ ] public/private program separation
- [ ] file validation
- [ ] rate limits
- [ ] CSRF strategy
- [ ] secure cookies
- [ ] no secrets in browser
- [ ] reflection output escaped
- [ ] no biometric data stored
- [ ] deletion path exists

---

# 47. Data Deletion

Implement:

```text
delete contact
```

behavior should:

- remove or anonymize enrollment
- remove reflection responses
- remove learning events if policy requires
- remove next actions
- preserve aggregate analytics only if non-identifiable

At minimum, V0.1 must have backend capability even if UI is admin-only.

---

# 48. Analytics Event Tracking

Product analytics events:

```text
promotor.program_created
promotor.program_published
promotor.learner_opened
promotor.followup_opened

learner.registration_completed
learner.lesson_completed
learner.reflection_submitted
learner.program_completed
learner.cta_clicked
```

Do not mix product analytics with domain `learning_events`.

They serve different purposes.

---

# 49. Pilot Metrics Dashboard

Internal only initially.

Track:

```text
active promotors
programs published
learners enrolled
start rate
completion rate
reflection rate
CTA rate
next actions created
next actions completed
```

Key:

```text
Learning Signals → Completed Next Actions
```

---

# 50. Definition of Ready for Pilot

All conditions:

## Product

- [ ] create program
- [ ] edit curriculum
- [ ] publish
- [ ] registration
- [ ] learner access
- [ ] lesson completion
- [ ] reflection
- [ ] CTA
- [ ] progress
- [ ] learner timeline
- [ ] intent
- [ ] next action
- [ ] follow-up draft
- [ ] templates
- [ ] analytics

## UX

- [ ] anti-AI-slop checklist passes
- [ ] mobile 360px works
- [ ] empty/loading/error states
- [ ] keyboard focus works

## Engineering

- [ ] automated tests pass
- [ ] cross-tenant isolation tests pass
- [ ] migrations clean
- [ ] seed script works
- [ ] error tracking active
- [ ] scheduled inactivity job works

---

# 51. Milestone Dependencies

```text
M0 Foundation
   ↓
M1 Auth/Tenant
   ↓
M2 Contacts
   ↓
M3 Programs
   ↓
M4 Curriculum
   ↓
M5 Registration
   ↓
M6 Enrollment/Progress
   ↓
M7 Reflection/CTA
   ↓
M8 Events
   ↓
M9 Intent
   ↓
M10 Next Step
   ↓
M11 Home
   ↓
M12 Learners
   ↓
M13 Learner UX
   ↓
M14 Activity
   ↓
M15 Analytics
   ↓
M16 Templates
   ↓
M17 PromotorFlow Adapter
   ↓
QA / Pilot
```

Some UI work can run in parallel only after data contracts are stable.

---

# 52. Recommended Agent Task Breakdown

For coding agent, each task should be small and independently verifiable.

Example:

```text
T01 Initialize repository
T02 Add design tokens
T03 Build AppShell
T04 Add database
T05 Add organizations
T06 Add users/auth
T07 Add contacts
T08 Add phone normalization
T09 Add programs schema
T10 Add program service
T11 Add program list
T12 Add create program
T13 Add modules schema
T14 Add lessons schema
T15 Build curriculum list
T16 Build lesson editor
...
```

Avoid prompts such as:

> "Build the LMS."

Each agent task should ideally touch one domain or one screen.

---

# 53. Coding Agent Guardrails

Every task prompt should include:

```text
1. Exact scope
2. Files allowed to edit
3. Required tests
4. Acceptance criteria
5. Non-goals
6. Design constraints
7. Data contract
```

Agent must not:

- introduce new libraries without reason
- refactor unrelated modules
- redesign UI
- add features not requested
- change event names
- change schema silently

---

# 54. PR Review Checklist

Every PR:

## Scope

- [ ] only requested feature
- [ ] no unrelated refactor

## Data

- [ ] migration included if needed
- [ ] organization isolation
- [ ] validation

## UX

- [ ] design plan respected
- [ ] mobile checked
- [ ] empty/loading/error state

## Tests

- [ ] unit/integration added
- [ ] E2E updated if workflow changed

## Security

- [ ] authorization
- [ ] no secret leakage

---

# 55. Branch Strategy

Simple:

```text
main
```

feature branches:

```text
feat/program-core
feat/curriculum
feat/learner-registration
feat/progress-engine
feat/reflections
feat/signals
```

Avoid long-running megabranches.

---

# 56. Commit Strategy

Prefer small commits:

```text
feat(programs): add program schema
feat(programs): add create program service
feat(programs): add program list UI
test(programs): add create program coverage
```

Do not combine schema + unrelated UI + refactor in one commit.

---

# 57. Development Environments

Recommended:

```text
local
preview/staging
production
```

Preview DB should not share production data.

Seed staging with realistic demo data.

---

# 58. Deployment Sequence

## Staging

Deploy after:

```text
M8 Events
```

so end-to-end learning works.

## Pilot

Deploy after:

```text
M17 + QA
```

---

# 59. Pilot Strategy

Start:

```text
5–10 promotors
```

Do not onboard hundreds.

Observe:

```text
Can they create program?
Do they understand Home?
Do they check learner signals?
Do they act on next steps?
Do they return?
```

---

# 60. Pilot Interview Questions

Ask behavior, not opinion.

Examples:

```text
Tunjukkan program terakhir yang Anda buat.
Learner mana yang terakhir Anda follow-up?
Kenapa Anda follow-up orang itu?
Bagaimana Anda tahu peserta berhenti belajar?
Apa yang Anda lakukan setelah peserta selesai program?
Bagian mana yang masih membuat Anda kembali ke WhatsApp/Excel?
```

---

# 61. Metrics for Go / No-Go

Proceed to V0.2 only if pilot shows:

```text
program publication
learner enrollment
repeated activity checks
next action usage
follow-up completion
```

Strong signal:

> promotors return specifically to see who needs attention.

Weak signal:

> promotors only create content but ignore learner signals.

If weak:

do not expand LMS features.

Fix signal/action loop first.

---

# 62. V0.2 Gate

Do not build V0.2 until at least one of these becomes repeated user demand:

```text
scheduled release
payment
certificate
quiz
team member
WhatsApp notification
cohort
```

Avoid roadmap-by-imagination.

---


# 62A. Locked Video Implementation Decision

Decision date:

```text
12 August 2026
```

V0.1 video implementation:

```text
Provider           YouTube Unlisted
Player             Official YouTube embed
Video storage      None
Transcoding        None
Watch tracking     None
Completion         Manual
White-label        Not supported
```

Engineering consequence:

PromotorClass does **not** need:

```text
video upload API
video processing worker
transcoding queue
video CDN
video storage bucket strategy
streaming manifest generation
```

This significantly reduces V0.1 infrastructure scope.

Do not reintroduce those systems unless the product decision is explicitly changed.

---

# 63. Highest-Risk Areas

## Risk 1 — Contact duplication

Mitigation:

```text
phone normalization
unique matching rules
```

## Risk 2 — Event duplication

Mitigation:

```text
idempotent event generation
milestone dedupe
```

## Risk 3 — Next Action spam

Mitigation:

```text
dedupe same contact/action/source
priority rules
```

## Risk 4 — LMS scope creep

Mitigation:

```text
strict non-goals
```

## Risk 5 — AI-slop UI regression

Mitigation:

```text
design tokens
no Card abstraction
screen review checklist
```

## Risk 6 — PromotorFlow coupling

Mitigation:

```text
adapter interface
shared domain contracts
```

---

# 64. Critical Path

The true critical path is:

```text
Contact
→ Program
→ Enrollment
→ Lesson Progress
→ Event
→ Intent
→ Next Action
→ Promotor Home
```

If this loop works, product value exists.

Everything else is secondary.

---

# 65. Minimal Production Cut

If schedule becomes constrained, preserve:

```text
Programs
Curriculum
Registration
Enrollment
Lesson completion
Reflection
Learning events
Intent
Next Action
Home
Learner detail
Follow-up
```

Cut first:

```text
analytics
templates
advanced settings
multiple CTA types
complex resources
```

Never cut the signal/action loop.

---

# 66. Implementation Order — Practical Sprint View

## Sprint 1

```text
Foundation
Auth
Organization
Contacts
Program core
```

## Sprint 2

```text
Modules
Lessons
Curriculum
Lesson editor
```

## Sprint 3

```text
Public registration
Enrollment
Learner access
Progress
```

## Sprint 4

```text
Reflection
CTA
Events
Intent scoring
```

## Sprint 5

```text
Next actions
Home
Learners
Learner drawer
```

## Sprint 6

```text
Activity
Analytics
Templates
PromotorFlow adapter
```

## Sprint 7

```text
responsive polish
accessibility
security
tests
pilot hardening
```

Sprint duration is intentionally not fixed here; task completion should be judged by acceptance criteria, not arbitrary time boxes.

---

# 67. Final Engineering Definition

PromotorClass V0.1 is not complete when:

> course content can be uploaded.

It is complete when:

```text
a learner does something meaningful
      ↓
the system understands that event
      ↓
the promotor sees why it matters
      ↓
the promotor can take the next action
```

That is the implementation priority above all else.
