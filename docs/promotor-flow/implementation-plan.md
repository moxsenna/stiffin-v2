# PromotorFlow V0.1 — Implementation Plan

**Version:** 0.1  
**Status:** Ready for implementation  
**Primary platform:** Mobile-first PWA  
**Architecture style:** Modular monolith  
**Source of truth:** `PRD.md` + `promotorflow_design_plan.md`  
**Cross-product source of truth:** `INTEGRATION_CONTRACT.md`  
**Primary product loop:** Contact → Next Action → WhatsApp / Booking → Completion → Aftercare

---

# 1. Implementation Objective

Membangun PromotorFlow V0.1 sebagai aplikasi production-ready yang:

1. cepat dipakai melalui smartphone,
2. mempunyai satu shared contact identity,
3. mempunyai deterministic Next Action Engine,
4. dapat melacak lead lifecycle,
5. dapat membuka WhatsApp dengan contextual message,
6. dapat mengelola booking dan status DP,
7. dapat mengubah completed booking menjadi client lifecycle,
8. dapat membuat aftercare D+7 secara otomatis,
9. menyediakan public booking page,
10. mempunyai fondasi data/event yang siap diintegrasikan dengan LMS di kemudian hari.

V0.1 harus tetap kecil.

Target bukan membuat CRM lengkap, melainkan membuat workflow berikut benar-benar reliable:

```text
Prospek masuk
↓
Dicatat
↓
Next Action
↓
Follow-up
↓
Booking
↓
DP
↓
Tes / layanan selesai
↓
Client
↓
Aftercare
```

---

# 2. Locked Product Boundaries

## V0.1 Includes

- authentication
- organization/workspace
- contacts
- lifecycle stages
- contact notes
- Next Action Engine
- Today
- WhatsApp deep-link flow
- message templates
- booking
- manual DP status
- agenda/calendar
- service completion
- aftercare D+7
- activity history
- public booking
- services
- weekly availability
- minimal notification preference
- audit-safe server-side mutations
- product analytics events

## Explicitly Excluded

- WhatsApp API
- automatic WhatsApp sending
- chatbot automation
- Meta API
- fingerprint
- biometric storage
- official assessment execution
- payment gateway
- invoice/accounting
- multi-user team workflow
- branch dashboard
- referral engine
- institutional pipeline
- LMS
- AI content
- autonomous AI
- advanced analytics
- campaign builder
- Google Calendar sync

---

# 3. Architecture Decision

Use a:

# Modular Monolith

Do not build microservices for V0.1.

Logical modules:

```text
auth
organizations
contacts
services
bookings
next-actions
activities
messaging
public-booking
notifications
analytics
```

Future modules:

```text
learning
referrals
campaigns
institutions
teams
billing
```

All modules can live in one deployable backend/application during V0.1.

Important rule:

> Module boundaries should exist in code even if deployment is monolithic.

---

# 4. Core Architectural Invariants

These rules are non-negotiable.

## INV-001 — One Contact Identity

Lead dan client tidak boleh menjadi dua entity berbeda.

```text
contact_id
```

tetap sama sepanjang lifecycle.

---

## INV-002 — Organization Isolation

Every business record must belong to:

```text
organization_id
```

Server must derive organization from authenticated context.

Client is never trusted to choose arbitrary organization access.

---

## INV-003 — No Biometric Data

Do not create:

```text
fingerprint
fingerprint_image
fingerprint_template
biometric_data
```

in schema, object storage, logs, analytics, or temporary uploads.

---

## INV-004 — Domain Rules Server-Side

Lifecycle transitions, booking completion, payment marking, and Next Action creation must not depend only on frontend logic.

Frontend requests commands.

Backend owns business rules.

---

## INV-005 — Activity Is Append-Oriented

Important business mutations create activity records.

Activity history should not be manually rewritten by normal product flows.

---

## INV-006 — Critical Commands Are Idempotent

At minimum:

```text
create public booking
complete booking
mark payment
create aftercare
complete next action
```

must tolerate retry / double tap.

---

## INV-007 — UTC Storage, Local Display

Store timestamps in UTC.

Organization has timezone.

Initial default:

```text
Asia/Jakarta
```

All Today/reminder calculations use organization timezone.

---

## INV-008 — Human-in-the-Loop WhatsApp

Backend/app may generate and prepare messages.

It must not auto-send WhatsApp in V0.1.

---

# 5. Suggested Repository Structure

```text
/
├── apps/
│   └── web/
│
├── packages/
│   ├── domain/
│   ├── database/
│   ├── ui/
│   ├── validation/
│   └── config/
│
├── docs/
│   ├── PRD.md
│   ├── design.md
│   ├── implementation-plan.md
│   └── decisions/
│
├── tests/
│   └── e2e/
│
└── scripts/
```

If using a single application repository, preserve equivalent boundaries:

```text
src/
├── app/
├── modules/
│   ├── contacts/
│   ├── bookings/
│   ├── next-actions/
│   ├── activities/
│   └── ...
├── components/
├── db/
├── lib/
└── tests/
```

---

# 6. Domain Model

## 6.1 Organization

```text
Organization
- id
- name
- slug
- timezone
- created_at
- updated_at
```

Initial state:

```text
1 organization = 1 promoter workspace
```

Do not hard-code this assumption deeply because future:

```text
organization
└── multiple users/promoters
```

---

## 6.2 User

```text
User
- id
- organization_id
- name
- phone
- email
- city
- role
- created_at
- updated_at
```

V0.1 role:

```text
OWNER
```

---

## 6.3 Contact

```text
Contact
- id
- organization_id
- name
- phone
- phone_normalized
- email nullable
- interest
- source
- stage
- notes nullable
- result_type nullable
- created_at
- updated_at
- deleted_at nullable
```

Stage enum:

```text
NEW
CONTACTED
INTERESTED
FOLLOW_UP
BOOKED
COMPLETED
LOST
```

---

## 6.4 Service

```text
Service
- id
- organization_id
- name
- description nullable
- price nullable
- duration_minutes
- deposit_amount nullable
- is_active
- created_at
- updated_at
```

---

## 6.5 Booking

```text
Booking
- id
- organization_id
- contact_id
- service_id
- start_at
- end_at nullable
- location_type
- location_text nullable
- status
- payment_status
- notes nullable
- completed_at nullable
- idempotency_key nullable
- created_at
- updated_at
```

Booking status:

```text
PENDING
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
```

Payment status:

```text
UNPAID
PAID
WAIVED
```

---

## 6.6 NextAction

```text
NextAction
- id
- organization_id
- contact_id
- booking_id nullable
- source_event_id nullable
- type
- title
- description nullable
- due_at
- priority
- status
- completed_at nullable
- created_at
- updated_at
```

Action type:

```text
CONTACT_LEAD
FOLLOW_UP
REMIND_PAYMENT
CONFIRM_BOOKING
REMIND_BOOKING
AFTERCARE
MANUAL
```

Action status:

```text
PENDING
COMPLETED
CANCELLED
```

---

## 6.7 Activity

```text
Activity
- id
- organization_id
- contact_id
- booking_id nullable
- event_type
- actor_user_id nullable
- metadata_json
- occurred_at
- created_at
```

---

## 6.8 MessageTemplate

```text
MessageTemplate
- id
- organization_id
- type
- name
- body
- is_default
- created_at
- updated_at
```

Types:

```text
FIRST_CONTACT
FOLLOW_UP
PAYMENT_REMINDER
BOOKING_REMINDER
AFTERCARE
```

---

## 6.9 AvailabilityRule

```text
AvailabilityRule
- id
- organization_id
- day_of_week
- start_time
- end_time
- is_active
```

V0.1 does not need complex recurrence exceptions unless discovered during pilot.

---

# 7. Database Constraints and Indexes

Required constraints:

## Contact

Unique partial concept:

```text
organization_id + phone_normalized
```

when phone exists.

Indexes:

```text
organization_id, stage
organization_id, created_at
organization_id, phone_normalized
```

---

## Booking

Indexes:

```text
organization_id, start_at
organization_id, status, start_at
contact_id, start_at
```

---

## NextAction

Indexes:

```text
organization_id, status, due_at
organization_id, contact_id, status
booking_id, status
```

Today query must remain cheap.

---

## Activity

Indexes:

```text
contact_id, occurred_at DESC
organization_id, occurred_at DESC
```

---

# 8. Phone Normalization

Implement one shared normalization function.

Input examples:

```text
0812 3456 7890
0812-3456-7890
+62 812 3456 7890
6281234567890
```

Canonical:

```text
6281234567890
```

Rules:

1. trim
2. strip whitespace and punctuation
3. remove `+`
4. Indonesian leading `0` → `62`
5. validate minimum/maximum reasonable length
6. store original/display formatting separately only if necessary

Never implement normalization independently in several screens.

---

# 9. Lifecycle Transition Rules

Create a central domain function:

```text
transitionContactStage(contact, targetStage, context)
```

Allowed normal transitions:

```text
NEW → CONTACTED
CONTACTED → INTERESTED
INTERESTED → FOLLOW_UP
FOLLOW_UP → INTERESTED
INTERESTED/FOLLOW_UP → BOOKED
BOOKED → COMPLETED
NEW/CONTACTED/INTERESTED/FOLLOW_UP → LOST
```

Manual admin correction may allow additional transitions, but must:

- record Activity,
- run cleanup rules,
- preserve history.

---

# 10. Next Action Engine

This is the most important implementation area.

Do not scatter rules across UI files.

Create a dedicated module:

```text
modules/next-actions/
```

Suggested functions:

```text
createContactLeadAction()
scheduleFollowUp()
createPaymentReminder()
createBookingReminder()
createAftercare()
completeAction()
cancelObsoleteActions()
getPrimaryNextAction()
getTodayActions()
```

---

# 11. Next Action Rule Matrix

## NA-001 Contact Created

Trigger:

```text
CONTACT_CREATED
```

Create:

```text
CONTACT_LEAD
due = now + 2 hours
priority = 75
```

---

## NA-002 Contacted

When:

```text
NEW → CONTACTED
```

Frontend asks user:

```text
Follow-up kapan?
```

No automatic follow-up unless user chooses.

---

## NA-003 Interested

When:

```text
stage = INTERESTED
```

If no active follow-up:

```text
FOLLOW_UP
due = next local day at 10:00
priority = 70
```

---

## NA-004 Follow-up Sent

When WhatsApp is confirmed sent:

```text
current action = COMPLETED
```

Prompt user to schedule next follow-up.

---

## NA-005 Booking Created + Unpaid

Create:

```text
REMIND_PAYMENT
priority = 85
```

Due date recommendation:

```text
min(now + 2h, booking_start - 1 day)
```

If booking is near, never schedule reminder after booking time.

---

## NA-006 Booking Reminder

For confirmed booking:

```text
REMIND_BOOKING
due = booking_start - 1 day
priority = 90
```

If booking is created less than 24 hours before start:

```text
due = now
```

---

## NA-007 Payment Marked Paid

Cancel/complete pending:

```text
REMIND_PAYMENT
```

for that booking.

---

## NA-008 Booking Completed

1. mark booking COMPLETED
2. set `completed_at`
3. contact stage → COMPLETED
4. cancel pending booking-specific actions
5. create Activity
6. create AFTERCARE

---

## NA-009 Aftercare

Create:

```text
AFTERCARE
due = completed_at + 7 days
priority = 50
```

Must be idempotent per booking completion.

---

# 12. Primary Next Action Selection

Frontend should not calculate priority independently.

Backend/application service returns:

```text
primary_next_action
```

Recommended ordering:

```text
1. highest computed priority
2. earliest due_at
3. oldest created_at
```

Computed priority:

```text
base priority
+ overdue modifier
```

Modifiers:

```text
+10 overdue > 1 day
+20 overdue > 3 days
```

Do not over-engineer scoring in V0.1.

---

# 13. Today Query

Create one use case/API:

```text
GET /today
```

Returns:

```text
date
action_count
overdue_count
groups:
  overdue[]
  today[]
  upcoming[]
```

Each item should include enough information to render without N+1 requests:

```text
action
contact summary
booking summary nullable
service summary nullable
```

Avoid frontend assembling Today by loading all contacts + all bookings + all actions.

---

# 14. Contacts Module

## Required Operations

```text
create contact
list contacts
search contacts
filter contacts
get detail
update contact
change stage
update notes
mark lost
```

---

## Contact List Query

Support:

```text
q
classification
stage optional
cursor/page
```

Classification:

```text
ALL
PROSPECT
CLIENT
```

Rule:

```text
CLIENT = stage == COMPLETED or completed booking exists
```

Prefer one canonical rule and reuse it everywhere.

---

# 15. Contact Detail Read Model

Return:

```text
contact
primary_next_action
recent_bookings
recent_activities
```

Do not require several screen-blocking sequential requests if avoidable.

---

# 16. WhatsApp Flow Implementation

## Step 1 — Select Template

Map action type:

```text
CONTACT_LEAD → FIRST_CONTACT
FOLLOW_UP → FOLLOW_UP
REMIND_PAYMENT → PAYMENT_REMINDER
REMIND_BOOKING → BOOKING_REMINDER
AFTERCARE → AFTERCARE
```

---

## Step 2 — Render Variables

Supported:

```text
{{first_name}}
{{service_name}}
{{booking_date}}
{{booking_time}}
{{promoter_name}}
{{city}}
```

Rendering should happen through one shared template function.

---

## Step 3 — Preview

Frontend presents editable message.

Do not persist edited message body by default unless product decision changes.

---

## Step 4 — Deep Link

Generate:

```text
https://wa.me/{phone}?text={url_encoded_message}
```

Record:

```text
WHATSAPP_OPENED
```

---

## Step 5 — Return Confirmation

Ask:

```text
Pesan sudah dikirim?

Belum
Sudah
```

If `Sudah`:

```text
WHATSAPP_SENT
action completed
```

Never claim delivery/read status.

---

# 17. Booking Module

## Booking Create Command

Input:

```text
contact_id
service_id
date/time
location
payment_status
notes
```

Transaction:

1. verify contact belongs to organization
2. verify service belongs to organization
3. create booking
4. change contact stage to BOOKED
5. cancel obsolete lead follow-up actions if required
6. create payment reminder if unpaid
7. create H-1 reminder
8. create Activity
9. return booking

Perform atomically where practical.

---

# 18. Mark Payment Paid Command

```text
POST /bookings/:id/mark-paid
```

Transaction:

1. ensure booking belongs to org
2. if already PAID, return success
3. mark PAID
4. close pending payment reminder
5. create Activity

This operation must be idempotent.

---

# 19. Complete Booking Command

```text
POST /bookings/:id/complete
```

Transaction:

1. lock/read booking
2. if already completed, return existing state
3. set COMPLETED
4. set completed_at
5. set contact stage COMPLETED
6. cancel booking-specific pending actions
7. create BOOKING_COMPLETED Activity
8. create AFTERCARE action if absent
9. create AFTERCARE_CREATED Activity
10. commit

Do not create duplicate aftercare on retry.

---

# 20. Cancel Booking Command

Transaction:

1. mark CANCELLED
2. close booking-specific actions
3. record Activity
4. optionally return contact to FOLLOW_UP
5. create follow-up only if product rule explicitly requests it

For V0.1:

```text
cancel booking
→ contact FOLLOW_UP
→ follow-up due +2 days
```

---

# 21. Reschedule Booking

When date/time changes:

1. update booking
2. cancel stale H-1 reminder
3. generate new H-1 reminder
4. recalculate payment reminder only if necessary
5. create Activity

---

# 22. Calendar / Agenda

V0.1 API/query should support:

```text
date_from
date_to
status
```

Default UI:

```text
Agenda
```

Grouping should be done by organization-local date.

---

# 23. Aftercare Module

Aftercare is implemented through `NextAction`, not a separate complex subsystem.

Completion flow:

```text
AFTERCARE action
↓
WhatsApp
↓
mark sent
↓
capture outcome
```

Outcomes:

```text
NO_NEED
HAS_QUESTION
INTERESTED_NEXT_SESSION
CONTACT_LATER
```

Store outcome in:

```text
Activity metadata
```

For `CONTACT_LATER`:

create MANUAL/FOLLOW_UP action.

---

# 24. Public Booking

Public route:

```text
/p/{slug}
```

Backend resolves organization via slug.

---

## Public Booking Read

Return only public-safe information:

```text
promoter display name
city
active services
public price
duration
available slots
```

Never expose:

- internal IDs unnecessarily
- internal notes
- customer data
- private user metadata

---

## Public Booking Submit

Input:

```text
service
slot
name
phone
participant_count
notes
idempotency token
```

Flow:

1. validate public organization/service
2. validate slot
3. normalize phone
4. find existing contact in organization
5. create/reuse contact
6. create booking
7. create relevant action
8. record Activity
9. return confirmation

---

# 25. Public Booking Abuse Protection

Minimum:

- server-side validation
- rate limit by IP/session
- honeypot or equivalent low-friction bot protection
- maximum notes length
- maximum name length
- phone validation
- idempotency token
- no arbitrary HTML

Captcha can be added only if abuse appears.

---

# 26. Availability

V0.1 supports weekly rules.

Example:

```text
Mon–Fri 09:00–17:00
Sat 09:00–14:00
Sun closed
```

Slot generation:

```text
service duration
+ availability rule
+ existing booking conflicts
```

Prevent double booking.

Minimum buffer can remain:

```text
0 minutes
```

until pilot requires configurable buffers.

---

# 27. Message Templates

Seed default templates on organization creation.

Required:

```text
FIRST_CONTACT
FOLLOW_UP
PAYMENT_REMINDER
BOOKING_REMINDER
AFTERCARE
```

User can edit.

Validation:

- reasonable max body length
- allowed variables only
- preview unknown variables as error

---

# 28. Frontend Architecture

Primary routes:

```text
/today
/contacts
/contacts/:id
/calendar
/bookings/:id
/more
/more/services
/more/templates
/more/booking-page
```

Public:

```text
/p/:slug
/p/:slug/schedule
/p/:slug/details
/p/:slug/success
```

---

# 29. Frontend Design Rules

Must obey `promotorflow_design_plan.md`.

Critical implementation constraints:

- row/list first
- no card soup
- no gradient
- no decorative emoji
- no normal-content shadows
- neutral surface
- dense information
- maximum one dominant CTA per decision context
- 44px touch target
- proper SVG icon set
- no giant dashboard greeting
- no metric-card summary

---

# 30. Shared UI Components

Build these before screen duplication appears:

```text
PageHeader
BackHeader
BottomNavigation
SectionLabel

ActionRow
ContactRow
AgendaRow
ActivityRow

PrimaryButton
TextButton
IconButton

TextField
PhoneField
SelectField
TextArea
DateField
TimeField

SearchField
SegmentedFilter

StatusText
StatusDot

BottomSheet
ConfirmSheet
Toast

EmptyState
SkeletonRow
InlineError
```

Avoid building an over-general component library.

Create abstractions only after at least 2 real use cases or when already clearly shared.

---

# 31. State Management

Separate:

```text
server state
UI state
form state
```

Do not duplicate server entities into several custom global stores.

Examples of local UI state:

```text
selected filter
bottom-sheet visibility
message draft
form disclosure state
```

Server is source of truth for:

```text
contacts
bookings
actions
activities
```

---

# 32. Optimistic UI

Safe optimistic candidates:

```text
mark action complete
update simple notes
mark payment paid
```

Do not blindly optimistic-update complex lifecycle transitions unless rollback is implemented.

When server fails:

- restore prior state
- preserve user input
- show concise error

---

# 33. Loading UX

Use skeleton rows.

Do not use:

- giant spinner
- blocking full-screen loading for small mutations

Today should render shell immediately.

---

# 34. Error UX

Examples:

```text
Belum berhasil menyimpan.
Perubahan Anda masih ada.
Coba lagi.
```

Field:

```text
Nomor WhatsApp belum valid.
```

Never display raw backend messages directly.

---

# 35. Authentication

V0.1 requires:

- sign in
- sign out
- authenticated app routes
- session refresh
- server authorization

On first signup:

1. create User
2. create Organization
3. set timezone
4. seed services if desired
5. seed message templates
6. onboarding status

---

# 36. Authorization

Every private query must enforce:

```text
record.organization_id == session.organization_id
```

Do not rely on UI hiding.

Test cross-organization access explicitly.

---

# 37. Soft Delete

Recommended:

Contact:

```text
deleted_at
```

Avoid hard delete during early production unless privacy deletion is explicitly requested.

Normal UI can use:

```text
archive / remove
```

Future privacy delete can implement irreversible cleanup separately.

---

# 38. Activity Event Catalog

Locked initial events:

```text
CONTACT_CREATED
CONTACT_UPDATED
STAGE_CHANGED
NOTE_UPDATED

WHATSAPP_OPENED
WHATSAPP_SENT

FOLLOWUP_CREATED
FOLLOWUP_COMPLETED

BOOKING_CREATED
BOOKING_UPDATED
BOOKING_CANCELLED
BOOKING_COMPLETED

PAYMENT_MARKED

AFTERCARE_CREATED
AFTERCARE_COMPLETED
```

Future LMS:

```text
PROGRAM_ENROLLED
LESSON_COMPLETED
PROGRAM_COMPLETED
```

---

# 39. PromotorClass Integration Seam

Integration baseline is mandatory even if deep PromotorClass UI ships later.

## Shared Core

Do now:

```text
canonical organization_id
canonical user_id
canonical contact_id
shared E.164 phone normalization
shared organization authorization context
```

## Ownership

```text
PromotorFlow owns canonical next_actions.
PromotorClass owns learning_events and learning_signals.
```

## NextAction Integration Fields

Add:

```text
source
source_event_id nullable
source_signal_id nullable
idempotency_key nullable
context_json nullable
```

Sources:

```text
PROMOTORFLOW
PROMOTORCLASS
MANUAL
```

Unique protection:

```text
organization_id + source + idempotency_key
```

## Assessment Contract

Service category:

```text
ASSESSMENT
SESSION
PROGRAM
OTHER
```

Expose:

```text
NOT_STARTED
SCHEDULED
COMPLETED
CANCELLED
UNKNOWN
```

## Class → Flow

```text
getContactContext()
getAssessmentStatus()
createNextAction()
appendLearningActivity()
```

## Flow → Class

```text
getLearningContext()
listEligiblePrograms()
enrollContact()
getEnrollmentStatus()
```

Flow remains functional when Class is unavailable.

See `INTEGRATION_CONTRACT.md`.

# 40. Product Analytics

Track only necessary product behavior.

Suggested events:

```text
app_opened

contact_created
contact_viewed
contact_stage_changed

next_action_viewed
next_action_completed

whatsapp_preview_opened
whatsapp_deeplink_opened
whatsapp_marked_sent

booking_created
booking_payment_marked
booking_completed
booking_cancelled

aftercare_completed

public_booking_started
public_booking_completed
```

Do not send private message bodies to analytics.

---

# 41. North-Star Metric

```text
Completed Next Actions / Promoter / Week
```

Supporting:

```text
contacts_created
followups_completed
bookings_created
bookings_completed
aftercare_completed
```

---

# 42. Observability

Production must have:

- structured application logs
- error tracking
- request correlation ID
- background/scheduled task logs if introduced
- database health visibility
- deployment version identifier

Never log:

- full sensitive notes unnecessarily
- credentials
- auth tokens
- raw customer data unless required

---

# 43. Notification Strategy

Notification can be added after core app works.

V0.1 minimal:

```text
daily summary
booking reminder
```

Potential daily reminder:

```text
09:00 local
5 aktivitas membutuhkan perhatian hari ini.
```

Notifications should link directly to relevant screen.

Do not create engagement spam.

---

# 44. Scheduled Work

If reminders need backend scheduling:

Prefer a simple scheduled job that:

1. finds due notifications
2. creates/sends only necessary reminders
3. marks notification attempt
4. prevents duplicates

Next Actions themselves should be queryable by due time and not depend on scheduler creation.

---

# 45. PWA Requirements

Minimum:

- installable manifest
- app icons
- theme/background color
- service worker
- cached application shell
- graceful offline message

V0.1 offline scope:

```text
preserve draft
show cached recent screen if feasible
avoid silent loss
```

Full offline mutation sync is not required unless pilot proves necessary.

---

# 46. Security Checklist

Before production:

- [ ] HTTPS only
- [ ] secure cookies/session
- [ ] CSRF protection where applicable
- [ ] XSS-safe rendering
- [ ] server-side schema validation
- [ ] organization authorization
- [ ] rate limiting public routes
- [ ] length limits on notes/messages
- [ ] secrets server-only
- [ ] database backups
- [ ] no biometric fields
- [ ] no sensitive body logging
- [ ] dependency/security scanning
- [ ] public booking spam protection

---

# 47. Privacy Checklist

- [ ] minimum data collection
- [ ] optional result type
- [ ] no fingerprint
- [ ] clear delete/archive behavior
- [ ] future export capability considered
- [ ] future account deletion path considered
- [ ] customer notes not used for analytics
- [ ] retention policy documented before scale

---

# 48. Testing Strategy

Testing is divided into:

```text
Domain unit tests
API/integration tests
E2E workflow tests
Visual/UX checks
Security tests
```

---

# 49. Domain Unit Tests

Must cover:

## Contacts

- phone normalization
- duplicate detection
- valid stage transitions
- lost state

## Next Actions

- contact action generation
- follow-up generation
- payment reminder
- booking reminder
- overdue priority
- primary action ordering
- aftercare idempotency

## Bookings

- create
- paid
- reschedule
- complete
- cancel
- double completion

---

# 50. Integration Tests

Must verify:

- organization isolation
- transaction behavior
- activity creation
- action cleanup
- contact lifecycle update
- duplicate public booking prevention
- conflicting booking slot rejection
- public route validation

---

# 51. E2E Critical Paths

## E2E-001 New Lead

```text
create contact
→ Today action
→ open WhatsApp
→ mark sent
→ schedule follow-up
```

---

## E2E-002 Follow-up to Booking

```text
contact
→ follow-up
→ create booking
→ stage BOOKED
→ Today updates
```

---

## E2E-003 Payment

```text
booking unpaid
→ payment reminder
→ mark paid
→ reminder disappears
```

---

## E2E-004 Completion

```text
booking
→ complete
→ contact client
→ aftercare scheduled
```

---

## E2E-005 Aftercare

```text
advance time / fixture
→ aftercare appears Today
→ WhatsApp
→ complete
```

---

## E2E-006 Public Booking

```text
public page
→ choose service
→ slot
→ customer data
→ booking
→ promoter Today
```

---

## E2E-007 Duplicate Phone

```text
existing contact
→ public booking with same phone
→ reuse contact
→ no duplicate contact
```

---

# 52. Timezone Tests

Test:

- near midnight
- due at 00:00
- booking H-1 crossing UTC date
- Today grouping
- D+7 aftercare
- timezone default Asia/Jakarta

Never calculate Today using server timezone implicitly.

---

# 53. Accessibility Tests

Check:

- keyboard navigation
- focus visible
- correct labels
- buttons have accessible names
- 44px targets
- contrast
- zoom/text scaling
- no color-only state

---

# 54. Visual QA

Every main screen must pass anti-slop checklist:

- [ ] no card soup
- [ ] no gradient
- [ ] no decorative emoji
- [ ] no excessive badge
- [ ] no multiple competing CTA
- [ ] no arbitrary shadow
- [ ] row density acceptable
- [ ] grayscale hierarchy still clear
- [ ] typography consistent
- [ ] real empty/loading/error states designed

---

# 55. Development Environments

Use:

```text
local
staging
production
```

Staging should use:

- separate database
- separate auth/config
- test public booking URL
- seeded demo organization

Never use production customer data for development.

---

# 56. CI Pipeline

Every PR should run:

```text
format/lint
type check
unit tests
integration tests
build
```

Main/release pipeline adds:

```text
database migration validation
deploy staging
smoke test
deploy production
post-deploy smoke test
```

E2E can be run on staging or preview deployments.

---

# 57. Database Migration Rules

- migration files committed
- never edit already-applied production migration
- backward-compatible changes preferred
- destructive changes require explicit review
- seed data separate from schema migration
- migration verified on staging first

---

# 58. Backup and Recovery

Before pilot production:

- automatic database backup
- documented restore procedure
- tested restore at least once
- backup retention defined

No need for elaborate disaster-recovery architecture at V0.1, but restore must be possible.

---

# 59. Demo Data

Maintain a deterministic demo seed:

```text
Ayu Rahma
Dimas Prakoso
Reni Wulandari
Fajar Nugraha
Sari & Hendra
Nadia Putri
Arief Santoso
```

Demo mode should create:

- overdue
- new lead
- unpaid booking
- paid booking
- completed client
- aftercare
- lost prospect

Development-only helpers may include:

```text
+1 day
+7 days
reset demo
```

Never expose these in production.

---

# 60. Milestone Plan

---

## M0 — Foundation Lock

### Goal

Repository and architectural guardrails ready.

### Tasks

```text
PF-001 Repository structure
PF-002 Environment config
PF-003 Code quality tooling
PF-004 CI baseline
PF-005 Docs source-of-truth
PF-006 Design tokens / UI primitives baseline
```

### Exit Criteria

- app builds
- tests can run
- CI passes
- design tokens exist
- no business feature yet

---

## M1 — Auth + Organization

### Goal

Secure private app context.

### Tasks

```text
PF-010 User authentication
PF-011 Organization creation
PF-012 Session organization context
PF-013 Organization authorization helper
PF-014 Onboarding state
PF-015 Seed default templates/services
```

### Exit Criteria

- user can sign in
- one workspace exists
- private route protected
- org isolation test exists

Dependencies:

```text
M0
```

---

## M2 — Contacts + Activity Foundation

### Goal

Create reliable shared customer identity.

### Tasks

```text
PF-020 Contact schema
PF-021 Phone normalization
PF-022 Duplicate constraint
PF-023 Create contact
PF-024 Contact list/search
PF-025 Contact detail
PF-026 Update notes
PF-027 Stage transition service
PF-028 Mark lost
PF-029 Activity schema/service
PF-030 Activity timeline UI
```

### Exit Criteria

Core contacts can be managed end-to-end.

Dependencies:

```text
M1
```

---

## M3 — Next Action Engine + Today

### Goal

Deliver primary product value.

### Tasks

```text
PF-040 NextAction schema
PF-041 Action creation service
PF-042 Contact-created rule
PF-043 Follow-up scheduling
PF-044 Priority computation
PF-045 Primary action selector
PF-046 Today query/read model
PF-047 Today UI
PF-048 Overdue grouping
PF-049 Complete/cancel action
PF-050 Next Action contact detail integration
```

### Exit Criteria

A new contact creates an action and appears correctly in Today.

Dependencies:

```text
M2
```

This milestone should be considered the first real product checkpoint.

---

## M4 — WhatsApp Workflow

### Goal

Connect PromotorFlow workflow to real communication.

### Tasks

```text
PF-060 MessageTemplate schema
PF-061 Seed default templates
PF-062 Template variable renderer
PF-063 WhatsApp preview sheet
PF-064 Deep-link generator
PF-065 WHATSAPP_OPENED activity
PF-066 Sent confirmation
PF-067 WHATSAPP_SENT activity
PF-068 Follow-up-after-send flow
PF-069 Template management UI
```

### Exit Criteria

User can go Today → WhatsApp → confirm sent → schedule next follow-up.

Dependencies:

```text
M3
```

---

## M5 — Services + Booking

### Goal

Convert interested contact into scheduled business.

### Tasks

```text
PF-080 Service schema/API
PF-081 Service management UI
PF-082 Booking schema
PF-083 Create booking command
PF-084 Booking lifecycle actions
PF-085 Payment reminder rule
PF-086 H-1 reminder rule
PF-087 Mark payment paid
PF-088 Reschedule
PF-089 Cancel booking
PF-090 Booking detail UI
```

### Exit Criteria

Contact can become BOOKED and correct actions are generated.

Dependencies:

```text
M3
```

M4 and some M5 tasks can be developed in parallel after M3 is stable.

---

## M6 — Calendar / Agenda

### Goal

Provide reliable schedule overview.

### Tasks

```text
PF-100 Agenda query
PF-101 Date grouping
PF-102 Calendar UI
PF-103 Upcoming booking state
PF-104 Booking → detail navigation
```

### Exit Criteria

All booking states are visible through agenda.

Dependencies:

```text
M5
```

---

## M7 — Completion + Aftercare

### Goal

Close the main lifecycle loop.

### Tasks

```text
PF-110 Complete booking command
PF-111 Idempotent completion
PF-112 Contact → COMPLETED
PF-113 Cleanup booking actions
PF-114 Create aftercare D+7
PF-115 Aftercare Today state
PF-116 Aftercare message template
PF-117 Aftercare completion
PF-118 Aftercare outcome capture
PF-119 Contact-later next action
```

### Exit Criteria

```text
Booking → Completed → Client → D+7 Aftercare
```

works end-to-end.

Dependencies:

```text
M5
M3
M4
```

This milestone completes the core PromotorFlow loop.

---

## M8 — Public Booking

### Goal

Allow customer self-booking.

### Tasks

```text
PF-130 Public promoter/service read model
PF-131 Availability schema
PF-132 Slot generator
PF-133 Conflict detection
PF-134 Public service screen
PF-135 Public schedule screen
PF-136 Public customer form
PF-137 Public booking submit
PF-138 Existing-contact reuse
PF-139 Idempotency
PF-140 Rate limiting
PF-141 Bot/honeypot protection
PF-142 Success screen
PF-143 Promoter Today integration
```

### Exit Criteria

Public booking safely creates/reuses a contact and appears in promoter workflow.

Dependencies:

```text
M5
M2
M3
```

---

## M8A — PromotorClass Contract Integration

### Goal

Implement minimum two-way integration without embedding PromotorClass product scope into Flow.

### Tasks

```text
PF-144 Shared contracts wiring
PF-145 Shared E.164 normalization verification
PF-146 NextAction source/idempotency fields
PF-147 Service category
PF-148 AssessmentStatus query
PF-149 Class → Flow adapter service
PF-150A Flow → Class adapter/port
PF-150B Learning context in Contact Detail
PF-150C Enroll-contact integration
PF-150D Cross-app integration E2E
```

### Exit Criteria

- Class-originated action appears once in Flow Today.
- Reprocessing same event does not duplicate action.
- Flow can read Class learning context.
- Flow can enroll same `contact_id`.
- Flow stays correct if Class is unavailable.

Dependencies:

```text
M3
M5
M7
Shared Core contract
```

---

## M9 — PWA + Notification Baseline

### Goal

Make product convenient as daily mobile tool.

### Tasks

```text
PF-150 Web app manifest
PF-151 App icons
PF-152 Service worker/app shell
PF-153 Offline/error state
PF-154 Draft preservation
PF-155 Notification preferences
PF-156 Daily summary infrastructure
PF-157 Booking reminder notification
```

### Exit Criteria

App can be installed and behaves safely during weak connectivity.

Dependencies:

```text
M3
M6
```

Full offline sync is not required.

---

## M10 — Analytics + Observability

### Goal

Measure real product usage and diagnose problems.

### Tasks

```text
PF-160 Product analytics events
PF-161 Error tracking
PF-162 Structured logs
PF-163 Request correlation
PF-164 Version/build identifier
PF-165 Basic internal health checks
PF-166 Pilot metrics query/dashboard
```

### Exit Criteria

Core behavior and production failures are visible without inspecting database manually.

Dependencies:

Can start early, finalise after core flows.

---

## M11 — Security + Hardening

### Goal

Prepare for pilot production.

### Tasks

```text
PF-170 Authorization audit
PF-171 Cross-org tests
PF-172 Public rate-limit tests
PF-173 XSS/input sanitation audit
PF-174 Session security review
PF-175 Sensitive logging review
PF-176 Database backup
PF-177 Restore test
PF-178 Production env audit
PF-179 Accessibility QA
PF-180 Performance QA
```

### Exit Criteria

No known high-risk blocker for pilot.

Dependencies:

```text
M1–M10 core paths
```

---

## M12 — Pilot Release

### Goal

Release to 5–10 promoters.

### Tasks

```text
PF-190 Seed pilot accounts
PF-191 Onboarding checklist
PF-192 Pilot feedback channel
PF-193 Usage instrumentation review
PF-194 Bug triage process
PF-195 Weekly retention review
PF-196 Friction log
```

### Pilot Focus

Observe:

```text
contact capture
Today usage
next actions
WhatsApp flow
booking
aftercare
```

Do not add large features during first pilot cycle unless they block core usage.

---

# 61. Critical Dependency Graph

```text
M0 Foundation
    ↓
M1 Auth/Organization
    ↓
M2 Contacts/Activity
    ↓
M3 Next Action + Today
    ├──────────────┐
    ↓              ↓
M4 WhatsApp       M5 Booking
                    ↓
                   M6 Calendar
                    ↓
                   M7 Completion/Aftercare
                    ↓
                   M8 Public Booking

M9 PWA
M10 Observability
M11 Hardening
        ↓
M12 Pilot
```

Do not expand PromotorClass product scope inside Flow before pilot; preserve and test only the locked integration seam.

---

# 62. Recommended Coding Order Inside a Milestone

For each feature:

```text
1. Domain types
2. Database migration
3. Validation schema
4. Repository/data access
5. Application/domain service
6. API/action handler
7. Unit/integration tests
8. UI read state
9. UI mutation
10. E2E path
11. Error/loading/empty state
12. Accessibility check
```

Do not build UI first and then invent backend behavior to match it.

---

# 63. Task Template for Coding Agents

Every implementation task should contain:

```text
Task ID
Goal
User-visible behavior
Files/modules allowed
Dependencies
Domain invariants
Acceptance criteria
Tests required
Non-goals
Design constraints
```

Example:

```text
PF-042 — Contact-created Next Action

Goal:
Create CONTACT_LEAD action whenever a new contact is created.

Invariants:
- one action only
- due now + 2h
- priority 75
- same organization/contact
- retry must not duplicate

Acceptance:
- manual contact creation creates action
- public booking path does not incorrectly create duplicate action
- Today returns action
- unit + integration tests pass

Non-goals:
- notifications
- AI messaging
```

---

# 64. Agent Guardrails

Coding agent must not:

- invent new lifecycle states
- add WhatsApp auto-send
- add AI unless task explicitly asks
- add biometric fields
- split leads and clients into separate entities
- create microservices
- create arbitrary design styles
- bypass organization authorization
- implement business rules only in frontend
- silently broaden scope
- rewrite unrelated modules
- delete Activity history

---

# 65. PR / Change Size

Prefer small, reviewable changes.

Recommended:

```text
one domain behavior
or
one screen + supporting API
or
one infrastructure concern
```

per PR/change batch.

Avoid giant:

```text
"implement entire CRM"
```

changes.

---

# 66. Definition of Done — Per Task

A task is done only when:

- [ ] behavior implemented
- [ ] types/schema updated
- [ ] authorization enforced
- [ ] validation present
- [ ] errors handled
- [ ] tests added
- [ ] tests pass
- [ ] no lint/type errors
- [ ] mobile UI checked
- [ ] design rules checked
- [ ] no unrelated changes
- [ ] docs updated if contract changed

---

# 67. Definition of Done — V0.1

V0.1 is production-pilot ready when all are true:

## Product

- [ ] contact created
- [ ] duplicate phone protected
- [ ] Today works
- [ ] next actions correct
- [ ] follow-up schedulable
- [ ] WhatsApp deep link works
- [ ] message send confirmation works
- [ ] booking works
- [ ] DP status works
- [ ] agenda works
- [ ] completion works
- [ ] client classification works
- [ ] aftercare D+7 works
- [ ] public booking works

## Reliability

- [ ] critical mutations idempotent
- [ ] timezone tested
- [ ] no duplicate aftercare
- [ ] cross-org access blocked
- [ ] public booking rate-limited
- [ ] backups configured

## UX

- [ ] mobile-first
- [ ] anti-AI-slop design checklist passes
- [ ] no broken empty/loading/error states
- [ ] 44px touch targets
- [ ] key flows <= target tap budget

## Observability

- [ ] error tracking
- [ ] logs
- [ ] product events
- [ ] release/version traceability

---

# 68. Pilot Metrics

Primary:

```text
Completed Next Actions / Promoter / Week
```

Secondary:

```text
weekly returning promoters
contacts created / promoter
follow-ups completed
WhatsApp opens
bookings created
bookings completed
aftercare completed
```

Funnel:

```text
Contact → Booking
Booking → Completed
Completed → Aftercare
```

---

# 69. Pilot Decision Rules

## Continue / Expand

Signals:

- users return repeatedly
- Today becomes daily entry point
- contacts continue being added
- next actions are completed
- WhatsApp launcher is used
- booking lifecycle is trusted
- aftercare gets used

---

## Fix Before Expanding

Signals:

- contacts not being entered
- users ignore Today
- reminder noise
- stage changes confusing
- public booking used but CRM not used
- users still rely on spreadsheet for status

---

## Do Not Build LMS Yet If

Core PromotorFlow has poor retention.

LMS should not be used to hide failure of the core workflow.

---

# 70. PromotorClass Expansion Readiness Gate

Before expanding deep PromotorClass integration beyond the baseline contract, confirm:

- [ ] shared contact identity stable
- [ ] Activity model stable
- [ ] organization model stable
- [ ] event naming stable
- [ ] Next Action Engine accepts event-based triggers
- [ ] product pilot shows real aftercare/education demand

PromotorClass may then expand:

```text
programs
modules
lessons
enrollments
progress
learning events
```

without replacing contact or organization identity.

---

# 71. First Implementation Slice

The smallest useful production slice should be:

```text
Auth
↓
Organization
↓
Create Contact
↓
CONTACT_LEAD Action
↓
Today
↓
Contact Detail
↓
Follow-up Scheduling
```

Do not wait for Booking/Public Booking before testing this slice.

If this slice is not valuable, adding more modules will not solve the core problem.

---

# 72. Second Implementation Slice

```text
Message Templates
↓
WhatsApp Preview
↓
Deep Link
↓
Mark Sent
↓
Schedule Next Follow-up
```

At this point the core daily behavior can already be piloted internally.

---

# 73. Third Implementation Slice

```text
Services
↓
Booking
↓
DP
↓
Calendar
↓
Completion
↓
Aftercare
```

This closes the revenue/client lifecycle.

---

# 74. Fourth Implementation Slice

```text
Public Booking
↓
PWA
↓
Notifications
↓
Hardening
↓
Pilot
```

---

# 75. Final Implementation Principle

When choosing between:

```text
more features
```

and:

```text
more reliable core workflow
```

choose the reliable workflow.

PromotorFlow V0.1 succeeds when this sequence is boringly dependable:

```text
Saya mencatat orang
↓
PromotorFlow mengingatkan saya
↓
Saya menghubungi mereka
↓
Saya membuat booking
↓
Saya menyelesaikan layanan
↓
PromotorFlow mengingatkan aftercare
```

That loop is the product.
