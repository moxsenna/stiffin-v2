# Promotor Platform — Integration Contract
## PromotorFlow ↔ PromotorClass

**Version:** 1.0  
**Status:** Locked integration baseline before production implementation  
**Date:** 2026-08-12  
**Applies to:** PromotorFlow V0.1 + PromotorClass V0.1  
**Architecture direction:** Two product experiences, one shared platform foundation  
**Primary principle:** One person = one canonical Contact

---

# 1. Purpose

Dokumen ini adalah source of truth untuk integrasi antara **PromotorFlow** dan **PromotorClass**.

Dokumen ini mengunci:

1. shared identity,
2. domain ownership,
3. adapter contracts,
4. event semantics,
5. Next Action ownership,
6. failure/retry,
7. idempotency,
8. cross-app auth/navigation,
9. deployment modes,
10. integration acceptance tests.

Jika dokumen produk lain bertentangan dengan dokumen ini pada area lintas produk:

> **`INTEGRATION_CONTRACT.md` menang.**

---

# 2. Product Relationship

```text
                 PROMOTOR PLATFORM

                   Shared Core
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
     PromotorFlow          PromotorClass
     Business OS           Education OS
```

Dua product experience, satu identity foundation.

---

# 3. Canonical Identity

```text
ONE PERSON
=
ONE CONTACT
=
ONE contact_id
```

Satu orang boleh menjadi prospect, booked customer, completed client, learner, aftersales participant, dan paid participant tanpa membuat person record baru.

---

# 4. Recommended Repository / Platform Topology

Jika kedua produk dikembangkan bersama:

```text
repo/
├── apps/
│   ├── promotorflow/
│   └── promotorclass/
├── packages/
│   ├── platform-core/
│   ├── contracts/
│   ├── database/
│   ├── auth/
│   └── shared-config/
└── docs/
    └── INTEGRATION_CONTRACT.md
```

Jika tetap separate repositories, shared contracts harus versioned/published. Jangan maintain duplicate DTO/type secara manual.

---

# 5. Ownership Matrix

## Shared Platform Core Owns

```text
organizations
users
contacts

authentication identity
organization membership/context
contact matching
phone normalization
canonical platform IDs
timezone conventions
```

## PromotorFlow Owns

```text
contact lifecycle stage
services
bookings
payment tracking
next_actions
business activities
follow-up scheduling
aftercare
message templates
availability
business opportunity context
assessment/service completion context
```

## PromotorClass Owns

```text
programs
modules
lessons
resources
enrollments
lesson_progress
reflections
CTAs
learning_events
learning_signals
intent score
learning status
program analytics
```

**Canonical `NextAction` belongs only to PromotorFlow.**

PromotorClass owns recommendations/signals, then requests creation of Flow action.

---

# 6. Explicitly Not Shared in V0.1

Do not create a vague common table for:

```text
all events
all activities
all tags
all billing
```

unless a later explicit contract requires it.

- Class `learning_events` keep learning semantics.
- Flow `activities` keep business-timeline semantics.
- SaaS billing is a future platform concern.

Share identity first, not every domain table.

---

# 7. Shared Core Service Contract

Equivalent behavior:

```ts
interface PlatformCore {
  getCurrentOrganization(): Promise<OrganizationContext>;
  getContact(contactId: ContactId): Promise<Contact>;
  findContactByPhone(phoneE164: string): Promise<Contact | null>;
  matchOrCreateContact(input: MatchOrCreateContactInput): Promise<Contact>;
  updateContactIdentity(input: UpdateContactIdentityInput): Promise<Contact>;
  normalizePhone(input: string): PhoneE164;
}
```

Transport may differ. Semantics may not.

---

# 8. Canonical IDs

Canonical:

```text
organization_id
user_id
contact_id
```

Recommended representation:

```text
UUID
```

Do not create separate IDs such as:

```text
promotorflow_contact_id
promotorclass_contact_id
learner_person_id
client_person_id
```

for the same platform person.

---

# 9. Phone Identity Contract

Canonical storage/matching:

```text
E.164
```

Example:

```text
0812 1234 5678
+62 812 1234 5678
6281212345678

↓ normalize

+6281212345678
```

Rules:

1. trim,
2. remove visual punctuation,
3. normalize country prefix,
4. store with leading `+`,
5. validate reasonable length,
6. compare canonical E.164.

Recommended field:

```text
phone_e164
```

If legacy `phone_normalized` remains, its value must still be E.164.

Database uniqueness:

```text
organization_id + phone_e164
```

Both apps import the same normalizer from Shared Core.

---

# 10. Contact Matching

```text
normalize phone
↓
match organization_id + phone_e164
↓
optional normalized-email fallback
↓
reuse contact_id if matched
↓
otherwise create canonical Contact
```

Database constraint remains the final duplicate protection.

---

# 11. Time Contract

Store timestamps in UTC.

Organization owns timezone.

Initial default:

```text
Asia/Jakarta
```

Integration timestamps use ISO 8601 UTC.

---

# 12. Class → Flow Adapter

```ts
interface PromotorFlowAdapter {
  getContactContext(
    contactId: ContactId
  ): Promise<FlowContactContext>;

  getAssessmentStatus(
    contactId: ContactId
  ): Promise<AssessmentStatus>;

  createNextAction(
    input: LearningNextActionRequest
  ): Promise<NextActionRef>;

  appendLearningActivity(
    input: LearningActivityProjection
  ): Promise<ActivityRef | void>;
}
```

Class callers may not depend on Flow React components, route internals, or private DB implementation.

---

# 13. Flow → Class Reverse Adapter

```ts
interface PromotorClassAdapter {
  getLearningContext(
    contactId: ContactId
  ): Promise<LearningContext>;

  listEligiblePrograms(
    input: EligibleProgramsInput
  ): Promise<ProgramSummary[]>;

  enrollContact(
    input: EnrollContactInput
  ): Promise<EnrollmentRef>;

  getEnrollmentStatus(
    contactId: ContactId,
    programId: ProgramId
  ): Promise<EnrollmentStatus | null>;
}
```

Required for:

```text
service completed
↓
eligible aftersales program
↓
human chooses
↓
same contact_id enrolled
```

---

# 14. Flow Contact Context

Minimum contract:

```ts
type FlowContactContext = {
  contactId: string;
  stage:
    | "NEW"
    | "CONTACTED"
    | "INTERESTED"
    | "FOLLOW_UP"
    | "BOOKED"
    | "COMPLETED"
    | "LOST";
  classification: "PROSPECT" | "CLIENT";
  primaryNextAction?: {
    id: string;
    type: string;
    dueAt: string | null;
  };
  activeBooking?: {
    id: string;
    serviceId: string;
    startAt: string;
    status: string;
  };
};
```

---

# 15. Assessment Status

Generalized contract:

```ts
type AssessmentStatus =
  | "NOT_STARTED"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";
```

Flow is source of truth.

Recommended derivation:

```text
Service.category = ASSESSMENT
+
relevant Booking.status
```

Mapping:

```text
no assessment booking         → NOT_STARTED
pending/confirmed booking     → SCHEDULED
completed assessment booking  → COMPLETED
cancelled assessment booking  → CANCELLED
cannot determine              → UNKNOWN
```

No biometric data is part of this contract.

---

# 16. Service Category

PromotorFlow Service supports:

```text
ASSESSMENT
SESSION
PROGRAM
OTHER
```

This keeps Class rules generic instead of hard-coding assessment brands/mechanics.

---

# 17. Learning Context

Minimum:

```ts
type LearningContext = {
  contactId: string;
  activeEnrollments: Array<{
    enrollmentId: string;
    programId: string;
    programTitle: string;
    progressPercent: number;
    learningStatus: string;
    intentLabel: "cold" | "warm" | "hot";
    lastActivityAt: string | null;
  }>;
  recentSignals: Array<{
    type: string;
    reason: string;
    priority: number;
    createdAt: string;
  }>;
};
```

Flow does not need full curriculum internals.

---

# 18. Canonical Learning Events

Class owns append-only learning events:

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
```

Names are contracts.

---

# 19. Integration Event Envelope

```ts
type IntegrationEventEnvelope<TPayload> = {
  schemaVersion: 1;
  eventId: string;
  eventType: string;
  sourceApp: "PROMOTORCLASS" | "PROMOTORFLOW";
  organizationId: string;
  contactId: string;
  occurredAt: string;
  subject?: {
    programId?: string;
    enrollmentId?: string;
    lessonId?: string;
    bookingId?: string;
    serviceId?: string;
  };
  payload: TPayload;
};
```

Rules:

- globally unique event ID,
- UTC ISO timestamp,
- runtime validation,
- consumers ignore unknown optional fields,
- breaking semantics require version bump.

---

# 20. Learning Event vs Flow Activity

Do not copy every learning event to Flow.

Project only meaningful business context such as:

```text
program.completed
cta.clicked
learner.inactive
high-intent milestone
selected meaningful reflection insight
```

Normally do not project:

```text
every lesson.started
every page view
every minor progress mutation
```

Class retains canonical learning history.

---

# 21. Reflection Privacy

Raw reflections remain Class-owned.

By default Flow receives:

```text
reflection_response_id
program context
signal type
reason
```

Do not automatically copy full reflection text into Flow or external AI.

---

# 22. Learning Signal

PromotorClass owns persistent learning signals:

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

This allows Class Home to remain useful even if Flow is temporarily unavailable.

---

# 23. Next Action Ownership

Canonical:

```text
PromotorFlow.next_actions
```

Flow:

- persists,
- prioritizes,
- completes,
- cancels,
- displays in Today,
- owns action lifecycle.

Class:

```text
learning event
↓
learning signal
↓
recommended next step
↓
LearningNextActionRequest
```

It does not own a second canonical action table.

---

# 24. Learning Next Action Request

```ts
type LearningNextActionRequest = {
  organizationId: string;
  contactId: string;

  source: "PROMOTORCLASS";
  sourceEventId: string;
  sourceSignalId?: string;

  actionType: "FOLLOW_UP" | "MANUAL";

  title: string;
  reason: string;
  dueAt?: string;

  context: {
    programId?: string;
    programTitle?: string;
    enrollmentId?: string;
    signalType?: string;
    intentLabel?: "cold" | "warm" | "hot";
  };

  idempotencyKey: string;
};
```

Flow translates it into canonical action fields.

---

# 25. Flow NextAction Integration Fields

Flow `next_actions` supports:

```text
source
source_event_id nullable
source_signal_id nullable
idempotency_key nullable
context_json nullable
```

Source:

```text
PROMOTORFLOW
PROMOTORCLASS
MANUAL
```

Technical unique protection:

```text
organization_id + source + idempotency_key
```

when a key exists.

---

# 26. Idempotency

Recommended key:

```text
promotorclass:{source_event_id}:{rule_id}
```

Example:

```text
promotorclass:evt_123:lead_magnet_progress_80
```

Repeated processing returns/reuses one semantic Flow action.

---

# 27. Signal → Action Examples

## Lead Magnet 80%

```text
program.progress_80
+
assessmentStatus != COMPLETED
↓
HIGH_LEARNING_INTENT
↓
Flow FOLLOW_UP
```

## Program Completed

```text
program.completed
↓
PROGRAM_COMPLETED signal
↓
Flow FOLLOW_UP when program rule requires it
```

## CTA Clicked

```text
cta.clicked
↓
HIGH_INTENT_CTA
↓
high-priority Flow FOLLOW_UP
```

## Inactive

```text
learner.inactive
+
progress < 50
↓
AT_RISK
↓
Flow FOLLOW_UP / light reminder
```

---

# 28. Flow → Class Aftersales Example

```text
Flow assessment/service completed
↓
listEligiblePrograms()
↓
promotor chooses "30 Hari Setelah Tes"
↓
enrollContact(contact_id)
↓
same contact identity
```

Enrollment is human-triggered by default.

---

# 29. Class Registration Example

```text
Instagram
↓
Class public program
↓
registration
↓
Shared Core.matchOrCreateContact()
↓
Enrollment(contact_id)
↓
learning events/signals
↓
Flow Next Action when relevant
```

---

# 30. Activity Projection

```ts
type LearningActivityProjection = {
  organizationId: string;
  contactId: string;
  source: "PROMOTORCLASS";
  sourceEventId: string;
  eventType:
    | "PROGRAM_COMPLETED"
    | "CTA_CLICKED"
    | "LEARNER_INACTIVE"
    | "LEARNING_SIGNAL";
  summary: string;
  context: Record<string, unknown>;
  idempotencyKey: string;
};
```

Flow maps this to its Activity model.

It is a projection, not canonical learning history.

---

# 31. Integration Outbox

For HTTP/external mode, Class uses:

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

Status:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

---

# 32. Outbox Transaction Semantics

```text
write learning state
+
write learning event
+
write signal
+
write outbox request
↓
COMMIT
```

Dispatcher later calls Flow.

This prevents successful learning behavior from silently losing its business-action request.

---

# 33. Local Adapter Mode

Recommended initial mode:

```text
PromotorClass
↓
LocalPromotorFlowAdapter
↓
Flow application service
```

and reverse:

```text
PromotorFlow
↓
LocalPromotorClassAdapter
↓
Class application service
```

Even with one DB, modules call application/domain services. Do not directly mutate another product's tables from arbitrary repositories.

---

# 34. HTTP Adapter Mode

Future:

```text
HttpPromotorFlowAdapter
HttpPromotorClassAdapter
```

Use:

- service auth,
- idempotency,
- timeout,
- retry/outbox,
- versioned validation.

No broker is required for V0.1.

---

# 35. Consistency

Strong consistency:

```text
shared contact identity
enrollment uniqueness
booking completion
lesson progress
reflection persistence
```

Eventual consistency allowed:

```text
external Class→Flow action sync
Flow activity projection
notifications
analytics
```

---

# 36. Failure Behavior

## Flow unavailable

Class continues:

- registration,
- learning,
- progress,
- reflection,
- signal creation.

Integration request queues.

Do not falsely display "Flow action created" before confirmation.

## Class unavailable

Flow continues:

- contact workflow,
- booking,
- completion,
- aftercare.

Learning context/enrollment can fail independently and retry later.

---

# 37. Authentication

Recommended:

```text
same identity provider
same internal users.id
same organization membership
```

If separate subdomains/apps are used, each validates session server-side.

Do not pass long-lived auth tokens through URLs.

---

# 38. Authorization

Every cross-app call validates:

```text
requesting identity/service
organization ownership
contact organization
target resource organization
```

A contact ID alone never grants access.

---

# 39. Cross-App Navigation

Class:

```text
Open in PromotorFlow ↗
```

Flow:

```text
View learning
Enroll in program
```

Conceptual links:

```text
Flow /contacts/{contact_id}
Class /learners/{contact_id}
```

Exact route path is not contractual.

---

# 40. UI Ownership

Class does not recreate:

- pipeline editor,
- booking manager,
- payment tracker,
- Flow task lifecycle.

Flow does not recreate:

- curriculum builder,
- lesson reader,
- reflection management,
- full learning analytics.

Cross-app UI:

> contextual, actionable, secondary.

---

# 41. Class Learner Detail Integration

May show:

```text
PromotorFlow

Stage
Interested

Assessment
Not started

Next action
Follow up about assessment.

Open in PromotorFlow ↗
```

Pending sync should say:

```text
Follow-up request queued
```

not pretend an action already exists.

---

# 42. Flow Contact Detail Integration

When Class is enabled:

```text
LEARNING

Parenting Mini Class
80% · Hot · active 2h ago

View learning

Recommended
Enroll in 30 Hari Setelah Tes
```

Do not embed full learning admin.

---

# 43. Flow Today Integration

Class-originated actions use normal Flow visual grammar.

```text
Ayu Rahma
Parenting Mini Class · 80%

Belum pernah assessment.
Follow-up tentang assessment.      WA
```

`PromotorClass` can appear as secondary metadata, not a dominant badge.

---

# 44. Service Completion Integration

```text
BookingCompleted
↓
Flow commits lifecycle + aftercare
↓
optional Class eligible-program query
```

Class unavailability must not roll back valid Flow completion.

Enrollment is not automatic by default.

---

# 45. Enroll Contact Contract

```ts
type EnrollContactInput = {
  organizationId: string;
  contactId: string;
  programId: string;
  source:
    | "PROMOTORFLOW_AFTERSALES"
    | "PROMOTORFLOW_MANUAL";
  idempotencyKey: string;
};
```

Class guarantees:

```text
program_id + contact_id
```

uniqueness.

Repeated request returns existing enrollment.

---

# 46. Deletion

One app must not independently hard-delete Shared Core Contact.

Normal user operations use archive/soft-delete.

Privacy hard-delete requires coordinated deletion/anonymization across product-owned records according to retention policy.

---

# 47. Security / Privacy

Cross-product calls transfer only necessary data.

Platform-wide forbidden:

```text
fingerprint image
biometric template
raw biometric data
```

Keep reflection content and business notes scoped to their owning domains.

---

# 48. Observability

Integration logs:

```text
request_id
organization_id
source_app
destination_app
operation
idempotency_key
result
duration
```

Do not log auth tokens, full reflections, full private notes, or full WhatsApp bodies by default.

---

# 49. Contract Versioning

Start:

```text
schemaVersion = 1
```

Backward-compatible:

- add optional fields,
- add ignorable event types,
- add adapter methods.

Breaking:

- rename required field,
- change semantics,
- remove contract event,
- change identity semantics.

Breaking change requires version bump.

---

# 50. Minimum Shared Packages

Recommended:

```text
@promotor/platform-core
@promotor/contracts
```

`platform-core`:

```text
organization context
contact identity
phone normalization
shared auth mapping
```

`contracts`:

```text
adapter interfaces
event envelopes
DTO schemas
runtime validation
```

---

# 51. Runtime Validation

Use runtime schemas, e.g. Zod:

```text
LearningNextActionRequestSchema
IntegrationEventEnvelopeSchema
EnrollContactInputSchema
```

TypeScript type alone is not enough.

---

# 52. Migration Ownership

Shared Core:

```text
shared_001 organizations
shared_002 users
shared_003 contacts
```

Flow:

```text
flow_001 services
flow_002 bookings
flow_003 next_actions
flow_004 activities
flow_005 message_templates
flow_006 availability
```

Class:

```text
class_001 programs
class_002 modules
class_003 lessons
class_004 resources
class_005 enrollments
class_006 lesson_progress
class_007 reflections
class_008 ctas
class_009 learning_events
class_010 learning_signals
class_011 integration_outbox
```

Ownership matters more than exact numbering.

---

# 53. Integration E2E Tests

## INT-E2E-001 Shared Contact

```text
Flow creates contact
↓
Class enrollment uses same phone
↓
same contact_id
```

## INT-E2E-002 Class Lead Magnet → Flow

```text
Class register
↓
reach 80%
↓
signal
↓
Flow Next Action
↓
Today
```

## INT-E2E-003 Idempotency

Same learning event processed twice → one Flow action.

## INT-E2E-004 Flow Completion → Class

```text
complete assessment
↓
eligible programs
↓
manual enrollment
↓
same contact_id
```

## INT-E2E-005 Flow Outage

Signal/outbox survives and retries to one action.

## INT-E2E-006 Class Outage

Flow completion remains committed.

## INT-E2E-007 Organization Isolation

Cross-org request is forbidden.

## INT-E2E-008 Phone Variants

`0812`, `62812`, `+62812` resolve to one canonical contact.

---

# 54. Acceptance Checklist

## Shared Core

- [ ] one Organization owner,
- [ ] one User owner,
- [ ] one Contact owner,
- [ ] shared E.164 normalizer,
- [ ] cross-org tests.

## Flow

- [ ] canonical `next_actions` only in Flow,
- [ ] source/idempotency metadata,
- [ ] Service.category,
- [ ] AssessmentStatus contract,
- [ ] Class-originated action appears in Today.

## Class

- [ ] no canonical Class `next_actions`,
- [ ] `learning_signals`,
- [ ] integration outbox,
- [ ] canonical contact_id in enrollment,
- [ ] Class works through Flow outage.

## Reverse Integration

- [ ] Flow reads learning context,
- [ ] Flow lists eligible programs,
- [ ] Flow enrolls canonical contact,
- [ ] duplicate enrollment prevented.

---

# 55. Coding Agent Guardrail

> PromotorFlow and PromotorClass are separate product experiences on one shared platform foundation. Organization, User, and Contact are canonical Shared Core records. A person must never be duplicated merely because they become a learner or client. PromotorFlow is the only owner of canonical NextAction records. PromotorClass owns learning events/signals and requests Flow actions through a versioned, idempotent adapter contract. Flow uses a reverse adapter for learning context and enrollment. Do not bypass adapters, couple UI internals, or create duplicate cross-product tables.

---

# 56. Final Model

```text
                     SHARED CORE

                 Organization
                      │
                     User
                      │
                    Contact
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    PROMOTORFLOW             PROMOTORCLASS

    lifecycle                programs
    booking                  lessons
    next_actions             enrollments
    activities               progress
    aftercare                reflections
    WhatsApp                 learning_events
                             learning_signals
          │                       │
          └───────────┬───────────┘
                      │
                  CONTRACTS
                      │
         Class signal ⇄ Flow lifecycle
```

The integration is correct when learning behavior can create actionable business workflow and business lifecycle can start the right learning journey **without duplicate people or duplicate sources of truth**.
