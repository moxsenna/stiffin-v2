# PromotorFlow V0.1 — Architecture

**Version:** 0.1  
**Status:** Architecture baseline  
**Architecture style:** Modular Monolith  
**Primary client:** Mobile-first PWA  
**Primary product loop:** Contact → Next Action → WhatsApp / Booking → Completion → Aftercare  
**Source of truth:** `PRD.md`, `promotorflow_design_plan.md`, `IMPLEMENTATION_PLAN.md`
**Cross-product source of truth:** `INTEGRATION_CONTRACT.md`

---

# 1. Architecture Goals

Arsitektur PromotorFlow V0.1 harus memenuhi lima tujuan utama:

1. **Simple enough to build quickly** dengan coding agent.
2. **Reliable enough for production pilot.**
3. **Domain boundaries clear** agar agent tidak mencampur business logic.
4. **Ready for future LMS integration** tanpa mengganti customer identity.
5. **Avoid premature infrastructure complexity.**

Prinsip utama:

> Build one well-structured application before considering distributed services.

---

# 2. Architecture Decision Summary

PromotorFlow V0.1 menggunakan:

# Modular Monolith

Artinya:

- satu application backend,
- satu primary database,
- satu authentication system,
- satu deployable product,
- tetapi kode dipisahkan berdasarkan domain/module.

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

---

# 3. Why Modular Monolith

Microservices tidak digunakan karena V0.1 belum membutuhkan:

- independent scaling antar-domain,
- multiple engineering teams,
- isolated deployment cadence,
- distributed event infrastructure,
- independent databases,
- complex failure isolation.

Microservices pada tahap ini justru meningkatkan:

- deployment complexity,
- auth complexity,
- debugging cost,
- network failure modes,
- coding-agent hallucination surface.

Modular monolith memberi:

```text
fast iteration
+
clear boundaries
+
single transaction support
+
future extractability
```

---

# 4. High-Level System Architecture

```text
┌──────────────────────────────────────┐
│              Mobile PWA              │
│                                      │
│ Today                                │
│ Contacts                             │
│ Calendar                             │
│ More                                 │
│ Public Booking                       │
└─────────────────┬────────────────────┘
                  │
                  │ HTTPS
                  ▼
┌──────────────────────────────────────┐
│         Application / Backend        │
│                                      │
│ Auth                                 │
│ Organization Context                 │
│ Contacts                             │
│ Next Actions                         │
│ Bookings                             │
│ Activities                           │
│ Messaging                            │
│ Public Booking                       │
│ Notifications                        │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│             PostgreSQL               │
│                                      │
│ organizations                        │
│ users                                │
│ contacts                             │
│ services                             │
│ bookings                             │
│ next_actions                         │
│ activities                           │
│ message_templates                    │
│ availability_rules                   │
└──────────────────────────────────────┘
```

Optional infrastructure:

```text
Error tracking
Analytics
Scheduled jobs
Object storage (future)
```

---

# 5. Recommended Concrete Stack

This architecture does not require one specific vendor, but the recommended implementation for V0.1 is:

## Frontend / Full-stack App

```text
Next.js
TypeScript
React
```

Reason:

- one codebase,
- server and client flows can coexist,
- good mobile PWA support,
- straightforward route model,
- mature ecosystem,
- coding-agent friendly.

---

## Styling

```text
CSS Modules
or
Tailwind with strict design tokens
```

If Tailwind is used:

> Tailwind must not become permission to invent visual styles.

All spacing, color, radius, typography, and shadows must follow `promotorflow_design_plan.md`.

---

## Database

```text
PostgreSQL
```

Reason:

- strong relational model,
- transactions,
- constraints,
- indexing,
- future analytics,
- stable support for multi-tenant organization scoping.

---

## ORM / Query Layer

Recommended:

```text
Drizzle ORM
```

Alternative:

```text
Prisma
```

Priority:

- schema clarity,
- migrations,
- typed queries,
- ability to write explicit SQL when required.

---

## Validation

```text
Zod
```

Use shared schemas where appropriate.

Do not rely only on TypeScript types for runtime validation.

---

## Authentication

Use a maintained auth provider/library rather than custom password/session cryptography.

Requirements:

- server-side session validation,
- secure cookies,
- organization context,
- sign-in/out,
- session refresh,
- future multi-user support.

Architecture must not bind domain logic directly to one vendor-specific user ID.

Use internal:

```text
users.id
```

and optionally store:

```text
auth_provider_id
```

---

# 6. Runtime Boundaries

Application code should conceptually follow:

```text
Presentation
↓
Application Services
↓
Domain Rules
↓
Repositories
↓
Database
```

Do not use:

```text
React component
↓
direct database mutation
↓
random side effects
```

for core business flows.

---

# 7. Module Structure

Suggested:

```text
src/
├── app/
│
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── contacts/
│   ├── services/
│   ├── bookings/
│   ├── next-actions/
│   ├── activities/
│   ├── messaging/
│   ├── public-booking/
│   ├── notifications/
│   └── analytics/
│
├── ui/
│   ├── components/
│   ├── tokens/
│   └── icons/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── client/
│
├── lib/
│   ├── validation/
│   ├── time/
│   ├── phone/
│   └── errors/
│
└── tests/
```

Each module should contain its own:

```text
domain
service/application
repository/query
validation
API/server actions
tests
```

where practical.

---

# 8. Module Dependency Rule

Allowed direction:

```text
UI
↓
Application service
↓
Domain
↓
Repository
```

Cross-module dependencies must use explicit module APIs.

Example:

Booking completion may call:

```text
Bookings
↓
Contacts.transitionStage()
↓
NextActions.createAftercare()
↓
Activities.record()
```

It should not directly mutate another module's tables from arbitrary UI code.

---

# 9. Organization / Tenant Architecture

PromotorFlow V0.1 is single-promoter from a product perspective.

Architecture should still be organization-scoped.

```text
Organization
│
└── User
    └── Owner
```

Future:

```text
Organization
├── Owner
├── Promoter A
├── Promoter B
└── Admin
```

Every business entity contains:

```text
organization_id
```

---

# 10. Authorization Model

Authenticated request:

```text
Session
↓
User
↓
Organization Context
↓
Authorized Query / Mutation
```

Never trust:

```text
organization_id
```

provided by browser form/API request.

Server derives organization from session.

All repositories should require organization context.

Bad:

```text
getContact(contactId)
```

Preferred:

```text
getContact({
  organizationId,
  contactId
})
```

---

# 11. Core Domain Entities

```text
Organization
User
Contact
Service
Booking
NextAction
Activity
MessageTemplate
AvailabilityRule
```

Relationship:

```text
Organization
│
├── Users
├── Contacts
│   ├── Bookings
│   ├── NextActions
│   └── Activities
│
├── Services
├── MessageTemplates
└── AvailabilityRules
```

---

# 12. Contact Identity Architecture

The most important data invariant:

```text
Contact = person identity
```

Not:

```text
Lead
Client
Student
```

as separate tables.

Lifecycle:

```text
Contact
│
├── stage = NEW
├── stage = FOLLOW_UP
├── stage = BOOKED
└── stage = COMPLETED
```

Future LMS:

```text
Contact
└── Enrollment
```

Same contact ID.

---

# 13. Contact Schema

```text
contacts

id
organization_id

name

phone
phone_normalized

email nullable

interest
source
stage

notes nullable
result_type nullable

created_at
updated_at
deleted_at nullable
```

Recommended uniqueness:

```text
UNIQUE (
  organization_id,
  phone_normalized
)
```

when phone is not null.

---

# 14. Contact Lifecycle

State:

```text
NEW
CONTACTED
INTERESTED
FOLLOW_UP
BOOKED
COMPLETED
LOST
```

Lifecycle transitions go through:

```text
ContactLifecycleService
```

Example:

```text
transitionStage({
  contact,
  targetStage,
  actor,
  reason
})
```

Responsibilities:

- validate transition,
- persist change,
- record Activity,
- invoke relevant Next Action rule.

---

# 15. Contact Classification

User-facing:

```text
Prospect
Client
```

Do not persist a separate `type` unless future requirements demand it.

Suggested derived rule:

```text
Client:
contact.stage == COMPLETED
OR
completed booking exists
```

Canonical classification logic must live in one place.

---

# 16. Activity Architecture

Activity is the unified human-readable history layer.

Example:

```text
12 Aug
Follow-up dijadwalkan

10 Aug
WhatsApp dikirim

8 Aug
Prospek ditambahkan
```

Schema:

```text
activities

id
organization_id
contact_id
booking_id nullable

event_type
actor_user_id nullable
metadata_json

occurred_at
created_at
```

---

# 17. Why Activity Is Important

Activity provides:

1. Contact history.
2. Audit trail.
3. Future LMS event visibility.
4. Foundation for future analytics.
5. Context for future AI assistant.

It is not a generic event bus replacement.

It is a durable business timeline.

---

# 18. Event Naming

Initial:

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

# 19. Event Architecture V0.1

Do not implement Kafka/RabbitMQ/event broker.

Use synchronous domain/application events inside the same process.

Example:

```text
BookingCompleted
↓
handler
├── update Contact
├── cancel booking actions
├── create Activity
└── create Aftercare
```

Prefer transaction-safe orchestration.

Future:

If scale requires async processing:

```text
Outbox Pattern
↓
Worker/Event Bus
```

can be introduced later.

---

# 20. Transaction Boundaries

Critical operations should use one database transaction.

Example:

# Complete Booking

```text
BEGIN

Booking → COMPLETED
Contact → COMPLETED
Cancel obsolete actions
Create BOOKING_COMPLETED activity
Create AFTERCARE action
Create AFTERCARE_CREATED activity

COMMIT
```

If any critical mutation fails:

```text
ROLLBACK
```

Avoid partial lifecycle state.

---

# 21. Idempotency Architecture

Critical commands:

```text
complete booking
mark payment
public booking submit
create aftercare
complete action
```

must be safe if repeated.

Approaches:

- check current state first,
- unique domain constraint,
- command idempotency key where needed,
- transaction locking when appropriate.

Example:

Aftercare uniqueness concept:

```text
one active AFTERCARE
per completion source/booking
```

---

# 22. Next Action Architecture

Next Actions are stored domain objects.

Do not compute all actions only at render time.

Schema:

```text
next_actions

id
organization_id

contact_id
booking_id nullable
source_event_id nullable

type
title
description nullable

due_at
priority
status

completed_at nullable

created_at
updated_at
```

---

# 23. Next Action Engine

Create:

```text
NextActionService
```

Responsibilities:

```text
schedule
complete
cancel
deduplicate
priority
primary selection
Today query
```

Rules should be deterministic.

Do not use AI for V0.1 action generation.

---

# 24. Next Action Rule Sources

Possible trigger source:

```text
Contact created
Stage changed
Follow-up completed
Booking created
Payment changed
Booking rescheduled
Booking completed
Aftercare outcome
```

Each rule should be implemented as an explicit function.

Avoid giant generic:

```text
if eventType === ...
```

file with dozens of unrelated branches.

---

# 25. Primary Next Action

Database may contain several actions.

UI receives one primary action.

Selection:

```text
highest effective priority
↓
earliest due time
↓
oldest action
```

Effective priority:

```text
base_priority
+
overdue modifier
```

---

# 26. Today Architecture

Today is a read model.

Do not make frontend load:

```text
all contacts
+
all actions
+
all bookings
```

and join locally.

Backend query:

```text
getToday({
  organizationId,
  localDate
})
```

Returns:

```text
summary
overdue[]
today[]
upcoming[]
```

Each item includes:

```text
action
contact summary
booking summary nullable
service summary nullable
```

---

# 27. Today Query Performance

Core index:

```text
next_actions (
  organization_id,
  status,
  due_at
)
```

Today query should filter:

```text
organization_id
status = PENDING
due_at <= window_end
```

Then join contact/booking/service.

---

# 28. Booking Architecture

Booking is a first-class domain object.

Schema:

```text
bookings

id
organization_id

contact_id
service_id

start_at
end_at nullable

location_type
location_text nullable

status
payment_status

notes nullable
completed_at nullable

idempotency_key nullable

created_at
updated_at
```

---

# 29. Booking Creation Flow

```text
CreateBooking command
↓
Validate contact
↓
Validate service
↓
Validate schedule
↓
Create booking
↓
Contact stage → BOOKED
↓
Create payment reminder if unpaid
↓
Create booking reminder
↓
Create Activity
```

Run in a transaction.

---

# 30. Booking Completion Flow

```text
CompleteBooking
↓
Booking COMPLETED
↓
Contact COMPLETED
↓
Cancel stale booking actions
↓
Create Activity
↓
Create AFTERCARE D+7
```

This command is a critical architecture seam.

It must be thoroughly tested.

---

# 31. Booking Reschedule Architecture

```text
Update start_at
↓
Cancel old REMIND_BOOKING
↓
Create new REMIND_BOOKING
↓
Re-evaluate payment reminder
↓
Activity
```

Do not leave reminders pointing to old schedules.

---

# 32. Service Architecture

Service:

```text
services

id
organization_id

name
description nullable

price nullable
duration_minutes
deposit_amount nullable

is_active

created_at
updated_at
```

Do not hard-code STIFIn-specific package names into business logic.

Default seed may contain suggested service names.

---

# 33. WhatsApp Architecture

PromotorFlow does not integrate directly with WhatsApp API in V0.1.

Flow:

```text
Next Action
↓
MessageTemplate
↓
Template Renderer
↓
Editable Preview
↓
wa.me deep link
↓
WhatsApp
↓
User returns
↓
Confirm sent
```

---

# 34. Template Renderer

One centralized renderer.

Input:

```text
template
contact
booking nullable
service nullable
promoter
```

Supported variables:

```text
{{first_name}}
{{service_name}}
{{booking_date}}
{{booking_time}}
{{promoter_name}}
{{city}}
```

Unknown variables must fail validation when template is saved.

---

# 35. WhatsApp Activity Semantics

When user clicks:

```text
Open WhatsApp
```

record:

```text
WHATSAPP_OPENED
```

When user confirms:

```text
Sudah dikirim
```

record:

```text
WHATSAPP_SENT
```

Never create false states:

```text
DELIVERED
READ
REPLIED
```

because the application cannot know these.

---

# 36. Public Booking Architecture

Public page:

```text
/p/{organization_slug}
```

Public request does not require authentication.

Public endpoints must be isolated from private application APIs.

---

# 37. Public Read Model

Expose only:

```text
promoter display name
city
active services
duration
public price
available slots
```

Do not expose:

```text
organization internal settings
private user email
customer records
notes
activities
internal IDs unless necessary
```

---

# 38. Slot Generation

Inputs:

```text
organization timezone
availability rules
service duration
requested date
existing bookings
```

Output:

```text
available slots
```

Basic V0.1 algorithm:

```text
availability window
↓
generate slot starts
↓
remove conflicting intervals
↓
return remaining slots
```

---

# 39. Double Booking Prevention

UI availability is not authoritative.

At booking submission:

```text
re-check slot on server
```

before commit.

If conflict:

```text
409 / domain conflict
```

User-facing:

> Jadwal ini baru saja terisi. Pilih jam lain.

---

# 40. Public Booking Transaction

```text
BEGIN

resolve organization
validate service
validate slot
normalize phone
find/create contact
create booking
create actions
create activities

COMMIT
```

Use idempotency protection.

---

# 41. Public Booking Abuse Protection

Apply:

```text
rate limiting
input limits
server validation
honeypot
idempotency token
```

Potential future:

```text
CAPTCHA
```

only if necessary.

---

# 42. Availability Architecture

Table:

```text
availability_rules

id
organization_id
day_of_week
start_time
end_time
is_active
```

V0.1 intentionally does not support:

- calendar exception engine,
- recurring holiday rules,
- multiple complex intervals per location,
- external calendar sync.

Can be expanded later.

---

# 43. Notification Architecture

Notifications are not the source of truth.

Next Actions are.

```text
NextAction
↓
Notification worker
↓
Push notification
```

If notification fails:

Today still works.

---

# 44. Scheduled Job Strategy

Simple scheduled process:

```text
every N minutes
↓
find notification candidates
↓
send
↓
record delivery attempt
```

Do not create a worker architecture unless required.

Can initially use:

- platform cron,
- scheduled function,
- simple queue/worker.

---

# 45. Notification Deduplication

Store notification attempt/delivery reference.

Prevent:

```text
same reminder
sent repeatedly every cron execution
```

---

# 46. PWA Architecture

PWA layer contains:

```text
manifest
service worker
app shell cache
installability
basic offline handling
```

Do not make domain truth depend on offline local state.

Server remains authoritative.

---

# 47. Offline V0.1

Required:

- preserve unsaved form draft where reasonable,
- show offline status,
- cached app shell,
- avoid data loss.

Not required:

```text
full offline-first database replication
conflict resolution engine
background mutation replay
```

---

# 48. Frontend Data Architecture

Separate:

## Server State

```text
contacts
bookings
next actions
activities
services
```

## UI State

```text
filters
bottom sheet
selected item
message draft
form disclosure
```

Do not mirror entire backend in custom global state.

---

# 49. API / Command Architecture

The exact transport can be:

- route handlers,
- server actions,
- typed API layer.

Domain contracts should remain explicit.

Example commands:

```text
createContact
transitionContactStage
scheduleFollowUp
completeNextAction

createBooking
markBookingPaid
rescheduleBooking
completeBooking
cancelBooking
```

---

# 50. Suggested Endpoint Surface

Illustrative:

```text
GET    /api/today

GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id
PATCH  /api/contacts/:id

POST   /api/contacts/:id/stage
POST   /api/contacts/:id/follow-ups

POST   /api/next-actions/:id/complete

GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id

POST   /api/bookings/:id/mark-paid
POST   /api/bookings/:id/complete
POST   /api/bookings/:id/cancel
POST   /api/bookings/:id/reschedule

GET    /api/services

GET    /p/:slug
GET    /api/public/:slug/slots
POST   /api/public/:slug/bookings
```

Do not treat endpoint paths as immutable architecture.

Domain contracts are more important.

---

# 51. Validation Architecture

All external inputs validated server-side.

Validation layers:

```text
request schema
↓
domain validation
↓
database constraints
```

Example:

Phone:

```text
runtime schema
↓
normalize
↓
domain validation
↓
unique database constraint
```

---

# 52. Error Architecture

Define domain errors:

```text
NotFound
Unauthorized
Forbidden
ValidationError
ConflictError
DuplicateContact
SlotUnavailable
InvalidTransition
```

Map to user-safe responses.

Do not return stack trace or raw database error.

---

# 53. Audit and Logging

Use structured logs.

Each request can contain:

```text
request_id
user_id
organization_id
route/action
result
duration
```

Do not log:

- authentication tokens,
- full contact notes,
- raw WhatsApp message body by default,
- sensitive personal content unnecessarily.

---

# 54. Observability

Minimum production:

```text
error tracking
structured logs
deployment version
database health
basic uptime
```

Useful metrics:

```text
request error rate
public booking failures
booking completion failures
notification failures
```

---

# 55. Analytics Architecture

Product analytics is separate from Activity.

Activity:

> durable business record.

Analytics:

> aggregate product behavior.

Example analytics:

```text
contact_created
next_action_completed
whatsapp_deeplink_opened
booking_created
booking_completed
aftercare_completed
```

Never use analytics as system-of-record.

---

# 56. Security Architecture

Required:

```text
HTTPS
secure session
server-side authorization
input validation
output escaping
rate limiting
database backups
dependency scanning
```

Cross-organization access is a critical test category.

---

# 57. Privacy Architecture

Default data minimization:

```text
name
phone
optional email
interest
notes
booking
service interaction
optional result category
```

Explicitly forbidden:

```text
fingerprint
biometric scan
fingerprint image
biometric template
```

---

# 58. Data Retention / Deletion

V0.1 can use soft delete for normal operations:

```text
deleted_at
```

Future privacy deletion flow should support:

```text
export
hard delete/anonymization
```

based on policy.

Do not make soft-delete the only possible future mechanism.

---

# 59. Database Backup

Before pilot:

```text
automated backups
restore instructions
restore test
```

Backup reliability matters more than advanced replication at V0.1.

---

# 60. Deployment Architecture

Recommended environments:

```text
local
staging
production
```

Staging:

- separate database,
- separate auth configuration,
- demo organization,
- no production customer data.

---

# 61. Deployment Topology

Simple production topology:

```text
Browser / PWA
      │
      ▼
Application Runtime
      │
      ▼
PostgreSQL
```

Supplementary:

```text
Application Runtime
├── Error Tracking
├── Analytics
└── Scheduled Jobs
```

Avoid multi-region architecture until there is a proven need.

---

# 62. CI/CD Architecture

PR:

```text
lint
typecheck
unit test
integration test
build
```

Main/release:

```text
migration check
deploy staging
smoke test
deploy production
post-deploy smoke test
```

---

# 63. Migration Strategy

Database migrations are version-controlled.

Rules:

- do not edit applied migration,
- staging before production,
- backward-compatible changes preferred,
- destructive migration requires explicit review,
- business seeds separate from structural migration.

---

# 64. Testing Architecture

Test layers:

```text
Unit
Integration
E2E
Security
Accessibility
Visual QA
```

Unit tests emphasize:

```text
phone normalization
lifecycle
Next Action rules
priority
booking completion
aftercare idempotency
```

---

# 65. Critical Integration Tests

Must cover:

```text
organization isolation
duplicate contact
create booking transaction
mark paid
reschedule reminders
complete booking
aftercare uniqueness
public booking contact reuse
slot conflict
```

---

# 66. Critical E2E Paths

## Flow A

```text
Create Contact
↓
Today
↓
WhatsApp
↓
Confirm Sent
↓
Follow-up
```

## Flow B

```text
Follow-up
↓
Booking
↓
DP
↓
Calendar
```

## Flow C

```text
Booking
↓
Complete
↓
Client
↓
Aftercare
```

## Flow D

```text
Public Booking
↓
Contact Reuse/Create
↓
Promotor Today
```

---

# 67. Time Architecture

Organization:

```text
timezone = Asia/Jakarta
```

Internal timestamps:

```text
UTC
```

Display:

```text
organization local time
```

Today grouping and reminder calculation must never use server timezone implicitly.

---

# 68. Concurrency Considerations

V0.1 has low expected concurrency, but critical mutations should still handle races.

Examples:

## Public Booking

Two users select same slot.

Solution:

```text
server recheck
+
transaction
+
conflict handling
```

## Booking Complete

User double taps.

Solution:

```text
idempotent state check
```

## Duplicate Contact

Two submissions same phone.

Solution:

```text
database unique constraint
+
safe conflict handling
```

---

# 69. PromotorClass Architecture Seam

PromotorClass is the companion learning application.

Platform:

```text
                 Shared Core
         organizations / users / contacts
                    │
         ┌──────────┴──────────┐
         │                     │
 PromotorFlow             PromotorClass
```

Shared Core owns canonical identity.

---

# 70. Class → Flow Action Flow

```text
learning event
↓
learning signal
↓
LearningNextActionRequest
↓
PromotorFlowAdapter
↓
NextActionService
↓
canonical next_actions
```

Flow `NextAction` supports:

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

Unique technical idempotency:

```text
organization_id + source + idempotency_key
```

when key exists.

---

# 71. Flow → PromotorClass Reverse Integration

Use:

```ts
interface PromotorClassAdapter {
  getLearningContext(contactId)
  listEligiblePrograms(input)
  enrollContact(input)
  getEnrollmentStatus(contactId, programId)
}
```

Example:

```text
assessment booking completed
↓
Flow lifecycle transaction commits
↓
query eligible aftersales program
↓
human chooses
↓
same contact_id enrolled in Class
```

Class failure never rolls back already-valid Flow business state.

---

# 72A. Shared Platform Ownership

```text
Shared Core:
organizations
users
contacts
phone normalization
organization/auth context

PromotorFlow:
services
bookings
next_actions
activities
aftercare
message_templates
availability

PromotorClass:
programs
modules
lessons
enrollments
progress
reflections
learning_events
learning_signals
```

Do not create one vague shared `events` table.

Class learning events remain canonical in Class; selected business-relevant events may be projected into Flow Activity.

## Assessment Status Contract

```text
NOT_STARTED
SCHEDULED
COMPLETED
CANCELLED
UNKNOWN
```

Derived from:

```text
Service.category = ASSESSMENT
+
Booking.status
```

Service category:

```text
ASSESSMENT
SESSION
PROGRAM
OTHER
```

No biometric data is part of this contract.

## Adapter Modes

Initial:

```text
LocalPromotorFlowAdapter
LocalPromotorClassAdapter
```

call application services, not arbitrary cross-table writes.

Future:

```text
HttpPromotorFlowAdapter
HttpPromotorClassAdapter
```

use versioned validation, service auth, idempotency, and outbox/retry.

# 72. Future Team / Branch Seam

Do now:

```text
organization_id
user_id
actor_user_id
```

Future:

```text
organization
├── owner
├── admin
└── promoters
```

Potential future additions:

```text
contact_owner_user_id
booking_owner_user_id
```

Do not add these until multi-user work begins unless needed.

---

# 73. Future Billing Seam

Billing should belong to Organization.

Future:

```text
Organization
└── Subscription
```

Not:

```text
Contact
└── SaaS subscription
```

Customer-facing payments for services are a separate domain from SaaS billing.

Keep these concepts distinct.

---

# 74. Future AI Seam

AI should consume structured context.

Example:

```text
Contact
Activities
Bookings
Next Action
Templates
```

AI may later provide:

```text
message suggestions
summary
next-best-action recommendation
```

But AI must not own canonical lifecycle state.

---

# 75. Architecture Anti-Patterns

Do not implement:

## 75.1 Separate Lead and Client Tables

Bad:

```text
leads
clients
```

Why:

breaks lifecycle identity and future LMS integration.

---

## 75.2 Business Logic in React Components

Bad:

```text
if booking completed:
  set contact completed
  create aftercare
```

inside UI.

Backend/domain owns this.

---

## 75.3 Generic Event Bus Too Early

Do not introduce distributed brokers before needed.

---

## 75.4 Microservices

Not justified for V0.1.

---

## 75.5 NoSQL as Primary Database

Core domain is relational.

Use PostgreSQL.

---

## 75.6 Storing Fingerprint

Explicitly forbidden.

---

## 75.7 Frontend Organization ID Trust

Never.

---

## 75.8 Cron as Source of Next Actions

Next Actions should already exist as durable domain records.

Cron is only for notification delivery.

---

## 75.9 Analytics as Activity History

Do not use third-party analytics as business audit trail.

---

# 76. Architecture Decision Records

Important future deviations should create ADR files:

```text
docs/decisions/
```

Example:

```text
ADR-001-modular-monolith.md
ADR-002-contact-identity.md
ADR-003-next-action-persistence.md
ADR-004-public-booking-idempotency.md
```

Each ADR:

```text
Context
Decision
Alternatives
Consequences
Status
```

---

# 77. Coding Agent Architecture Guardrail

Provide this instruction to coding agents:

> PromotorFlow uses a modular monolith on a shared Promotor Platform foundation. Shared Core owns canonical Organization/User/Contact identity and E.164 phone normalization. PromotorFlow is the only owner of canonical NextAction records. PromotorClass owns learning events/signals and requests Flow actions through the versioned adapter contract. Preserve organization isolation and do not introduce microservices, biometric data, WhatsApp auto-send, duplicate contact tables, or a second NextAction source of truth.

---

# 78. Architecture Review Checklist

Before merging a new domain feature:

## Boundaries

- [ ] Correct module owns behavior
- [ ] No circular dependency
- [ ] Cross-module call uses explicit service contract

## Data

- [ ] organization_id present
- [ ] indexes considered
- [ ] uniqueness enforced where needed
- [ ] no duplicate source of truth

## Business Logic

- [ ] server/domain owns rule
- [ ] Activity recorded
- [ ] Next Action updated if relevant
- [ ] idempotency considered

## Security

- [ ] authorization
- [ ] validation
- [ ] no sensitive logs
- [ ] public routes rate-limited if relevant

## Future Seam

- [ ] contact identity preserved
- [ ] LMS integration not blocked
- [ ] no unnecessary hard-coding of STIFIn-specific mechanics

---

# 79. Architecture Definition of Done

Architecture baseline is considered respected when:

```text
one codebase
one database
clear modules
organization isolation
shared contact identity
persistent Next Actions
durable Activity timeline
transaction-safe booking lifecycle
human-in-the-loop WhatsApp
public booking isolated
UTC timestamps + local timezone
no biometric storage
LMS-ready identity/event seam
```

---

# 80. Final Architecture Principle

PromotorFlow should be architected around:

```text
People
↓
State
↓
Events
↓
Next Action
```

not around screens.

Screens may change.

Future products may change.

But these primitives should remain stable:

```text
Organization
Contact
Activity
NextAction
Booking
```

That is the foundation on which PromotorFlow V0.1, future LMS, referral workflows, institutional pipeline, and branch tooling can grow without requiring a rewrite.
