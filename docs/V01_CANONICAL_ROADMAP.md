# Promotor Platform V0.1 — Canonical Roadmap

> **Status:** CANONICAL V0.1 SCOPE / LAUNCH ROADMAP  
> **Repository:** `moxsenna/stiffin-v2`  
> **Authored from master baseline:** `d6a11a7ffd7f2b80298a9fac5a0c1db6c87ab790`  
> **Date:** 2026-08-20  
> **Purpose:** Reconcile the original product roadmap, the original backend B0–B8 roadmap, the later B0–B6.1 implementation sequence, and the current repository state into one release plan for V0.1.

---

# 1. Why This Document Exists

The project accumulated several valid roadmaps at different stages:

1. an original backend sequence ending at **B8 Production Hardening**;
2. a detailed PromotorClass product sequence ending at **M17 PromotorFlow + Reverse Adapter → QA/Pilot**;
3. an implementation sequence that later used **B0, B1, B2, B3, B4, B5, B6, B6.1**;
4. release-hardening PRs that absorbed work previously described as B7/B8.

This created an incorrect impression that completing `B6.1` meant V0.1 was automatically ready for production.

That interpretation is no longer canonical.

**V0.1 is complete only when the core product loop works end-to-end and the launch-readiness gates in this document are satisfied.**

---

# 2. Source-of-Truth Precedence

Use the following precedence when documents disagree.

## 2.1 V0.1 scope and launch timing

This file is authoritative for:

- what must ship in V0.1;
- what is allowed to move post-launch;
- what blocks Pilot/Production GO;
- the sequence `L0 → L1 → L2 → L3`.

## 2.2 Domain semantics and architecture

This roadmap **does not silently rewrite frozen domain invariants**.

Detailed semantics remain governed by the relevant frozen architecture/domain documents, including but not limited to:

- Shared Core identity rules;
- Better Auth / tenant authorization rules;
- PromotorClass content and learning rules;
- PromotorFlow lifecycle, booking, NextAction, aftercare and messaging rules;
- integration contracts;
- migration history and security rules.

If this roadmap changes *when* a feature ships, that does not authorize an agent to mutate frozen semantics of already accepted domains.

## 2.3 Code and tests

Current code, migrations, contracts and tests are the implementation truth.

PR descriptions, agent reports and historical milestone labels are evidence only. They must not override actual source state.

---

# 3. Canonical Product Definition for V0.1

Promotor Platform V0.1 is two integrated products sharing one platform core.

## 3.1 PromotorClass

PromotorClass is not merely a course/content uploader.

Its V0.1 job is:

```text
learner does something meaningful
        ↓
system records and understands the event
        ↓
system derives learning state / intent / signal
        ↓
promotor sees why it matters
        ↓
promotor can take the next action
```

## 3.2 PromotorFlow

PromotorFlow is the operational CRM/workflow layer that owns canonical business follow-up.

Its V0.1 loop is:

```text
Contact
→ Next Action
→ WhatsApp / Booking
→ Completion
→ Aftercare
```

## 3.3 Combined platform loop

The V0.1 value loop is:

```text
Contact
→ Program
→ Enrollment
→ Lesson Progress
→ Learning Event
→ Intent / Signal
→ Canonical Next Action
→ Promotor action
→ Booking / service outcome
→ Aftercare / next learning opportunity
```

If this loop works reliably, the product has V0.1 value.

Everything else is secondary.

---

# 4. Roadmap Reconciliation

## 4.1 Original backend roadmap

The original backend sequence was:

```text
B0 backend architecture scaffold
↓
B1 database + migrations
↓
B2 Better Auth + Organization mapping
↓
B3 Shared Core contacts / tenant context
↓
B4 PromotorClass domain persistence
↓
B5 public registration / enrollment
↓
B6 learning progress / events / signals
↓
B7 PromotorFlow integration
↓
B8 production hardening
```

B7 and B8 were **not cancelled**.

Their responsibilities were later absorbed into newer milestone numbering.

## 4.2 Later implementation numbering

The repository later implemented:

```text
B0   Platform API Foundation
B1   Shared Core
B2   Better Auth / Authorization
B3   PromotorClass Content
B4   Registration / Enrollment
B5   Learning Engine / Intelligence
B6   PromotorFlow Core Domain
B6.1 Public Booking / Availability
```

Approximate reconciliation:

| Original responsibility | Later implementation |
|---|---|
| B0 architecture scaffold | B0 Platform API Foundation |
| B1 database/migrations | B1 + following additive migrations |
| B2 auth/org | B2 |
| B3 Shared Core contacts | B1 Shared Core |
| B4 Class persistence | B3 |
| B5 registration/enrollment | B4 |
| B6 learning/events/signals | B5 |
| **B7 Flow integration** | **B6 + B6.1 + integration seams/outbox** |
| **B8 production hardening** | **release-hardening work, CI/security/rehearsal closure, plus remaining launch-readiness work below** |

Therefore:

> **B6.1 completion does not by itself equal V0.1 production completion.**

---

# 5. Detailed Product Milestone Reconciliation — M0 to M17

The detailed product roadmap is treated as the final functional product sequence:

```text
M0  Foundation
M1  Auth / Tenant
M2  Contacts
M3  Programs
M4  Curriculum
M5  Registration
M6  Enrollment / Progress
M7  Reflection / CTA
M8  Events
M9  Intent
M10 Next Step
M11 Promotor Home
M12 Learners / Learner Detail
M13 Learner Experience
M14 Activity
M15 Analytics
M16 Program Templates
M17 PromotorFlow + Reverse Adapter
↓
QA / Pilot
```

## 5.1 Canonical V0.1 disposition

| Milestone | Capability | V0.1 disposition |
|---|---|---|
| M0 | Foundation | **MUST** |
| M1 | Auth / Tenant | **MUST** |
| M2 | Contacts | **MUST** |
| M3 | Programs | **MUST** |
| M4 | Curriculum | **MUST** |
| M5 | Registration | **MUST** |
| M6 | Enrollment / Progress | **MUST** |
| M7 | Reflection / CTA | **MUST** |
| M8 | Learning Events | **MUST** |
| M9 | Intent | **MUST** |
| M10 | Next Step | **MUST** |
| M11 | Promotor Home | **MUST** |
| M12 | Learners / Detail | **MUST** |
| M13 | Learner Experience | **MUST** |
| M14 | Activity | **MINIMAL V0.1 ONLY** |
| M15 | Analytics | **MINIMAL PILOT METRICS ONLY** |
| M16 | Program Templates | **POST-LAUNCH** |
| M17 | Two-way Class ↔ Flow integration | **MUST** |

---

# 6. V0.1 — MUST SHIP Product Scope

The following capabilities are launch scope.

## 6.1 Platform Core

- Better Auth based promoter authentication.
- organization / tenant isolation.
- owner/admin authorization gates where required.
- product entitlements separate from role.
- canonical Shared Core Contact identity.
- phone normalization using canonical E.164 representation.
- one person = one canonical `contact_id` per organization.
- Contact identity remains separate from authenticated User identity.
- HTTP API remains canonical for future mobile clients.

## 6.2 PromotorClass Content

- create/edit program.
- draft / publish lifecycle.
- modules.
- lessons.
- curriculum ordering.
- text lesson content.
- YouTube Unlisted video URL support using official YouTube embed.
- manual lesson completion.
- reflection configuration.
- CTA configuration.
- public storefront / public program read model.
- public/private/draft access rules.

## 6.3 Registration / Learner Access

- public learner registration.
- canonical contact match-or-create.
- enrollment creation.
- duplicate enrollment prevention.
- secure learner access/session flow.
- learner access must not create a competing identity model.

## 6.4 Learning Engine

- lesson completion.
- progress calculation.
- learning status.
- reflection submission.
- CTA interaction events required by canonical rules.
- canonical learning event vocabulary.
- milestone event generation.
- learning signals.
- intent score / label.
- next-step evaluation.
- idempotent / concurrency-safe event handling.

## 6.5 PromotorClass Operator UX

At minimum:

- Promotor Home / work queue.
- learner list.
- learner detail/context.
- progress visibility.
- learning status / intent visibility.
- high-value signal visibility.
- next recommended action.
- human follow-up path.
- useful zero/empty states.

## 6.6 Learner UX

At minimum:

- program access.
- lesson navigation.
- resume current/next lesson.
- readable 360px mobile layout.
- reflection usable on mobile.
- lesson completion updates progress.
- completion CTA works.

## 6.7 PromotorFlow Core

- contact lifecycle.
- contact interest/profile.
- canonical NextAction ownership.
- Today queue.
- action prioritization.
- services.
- bookings.
- payment-status tracking only as V0.1 domain state; no payment gateway required.
- availability rules.
- public booking.
- booking lifecycle.
- assessment status sync where applicable.
- aftercare D+7.
- aftercare outcomes.
- activity timeline.
- message templates for Flow follow-up actions.
- WhatsApp deep link flow.
- explicit user confirmation before recording `WHATSAPP_SENT`.

## 6.8 M17 Two-way Integration

### Class → Flow

Required contract:

```text
getContactContext(contactId)
getAssessmentStatus(contactId)
createNextAction(input)
appendLearningActivity(input)
```

Required behavior:

```text
learning event
→ learning signal
→ durable outbox when needed
→ Flow adapter
→ one canonical Flow NextAction
```

Class must never own a second canonical `next_actions` persistence model.

### Flow → Class

Required contract:

```text
getLearningContext(contactId)
listEligiblePrograms(input)
enrollContact(input)
getEnrollmentStatus(contactId, programId)
```

Required golden flow:

```text
Flow contact / completed service context
→ inspect learning context
→ list eligible aftersales programs
→ human chooses program
→ enroll same canonical contact_id
→ duplicate enrollment prevented
```

### Integration reliability

- adapter mockability.
- Class continues functioning when Flow is unavailable.
- signal survives integration outage.
- durable retry/outbox behavior.
- retry produces one canonical Flow action.
- raw private reflection content does not leak into Flow.

---

# 7. V0.1 Launch-Readiness Scope

These are not optional polish items. They are required before Pilot/Production GO.

## 7.1 Canonical event closure

The final event system must prove:

- canonical event names only;
- milestone events emitted at the correct threshold crossing;
- no duplicate milestone events on repeated writes/retries;
- downstream signals/actions reference the correct source event;
- canonical event provenance remains auditable.

Any unresolved P0/P1 here blocks release.

## 7.2 Inactivity / At-Risk Scheduled Job

V0.1 requires a scheduled inactivity evaluator.

Canonical product rule:

```text
if last_activity_at <= now - 7 days
AND progress < 50
AND learning status is not completed

then
  learning_status = at_risk
  emit learner.inactive exactly once for the inactivity episode
  evaluate next step
```

Required properties:

- runs on a real schedule in the production architecture;
- idempotent;
- completed learner never becomes at risk;
- repeated runs do not spam `learner.inactive`;
- learner activity can return the learner to active/in-progress state according to frozen domain semantics;
- failures are observable.

## 7.3 Contact Privacy / Data Deletion Capability

V0.1 must have backend capability to perform a privacy-safe contact deletion/anonymization flow.

Minimum requirement:

```text
delete/anonymize contact identity as policy permits
→ remove/anonymize enrollment data
→ remove reflection responses
→ remove or anonymize learning-event personal linkage according to policy
→ remove/cancel personal next actions where required
→ preserve only non-identifiable aggregate analytics
```

A polished self-service UI is not required for V0.1.

An admin/operator backend path is sufficient if safe, auditable and tested.

This requirement is distinct from:

- deleting a draft program;
- soft-deleting an authenticated promoter user.

## 7.4 Minimum Observability

Early pilot does not require an enterprise observability stack.

It does require enough signal to operate the system safely.

At minimum capture, where safe:

```text
request_id
operation
result
request duration / API latency
organization_id
user_id when appropriate
integration destination
scheduled job failures
outbox/dispatch failures
server errors
```

Never log:

- passwords;
- raw session tokens;
- secrets;
- database passwords/connection strings;
- full private reflection content;
- private notes unnecessarily.

## 7.5 Runtime / Framework Production Support

V0.1 must not ship with a knowingly unsupported production framework path if the repository itself marks that path as pre-production technical debt.

Before Pilot/Production GO:

- close the pre-production Next.js/OpenNext runtime compatibility debt recorded by the repository;
- remove unsupported-version escape flags where the accepted upgrade path requires it;
- rebuild Class and Flow production artifacts;
- verify runtime behavior in staging.

## 7.6 Production HTTP Mode

Production must fail closed if frontend adapters are configured in mock mode.

Real launch QA must exercise:

```text
Web UI
→ HTTP adapter
→ API
→ auth/tenant/entitlement/resource authorization
→ application service
→ PostgreSQL
```

Passing mock UI tests is not enough for release.

## 7.7 UX Readiness

Critical V0.1 paths must pass:

- 360px mobile width.
- responsive behavior.
- keyboard focus on primary workflows.
- loading states.
- empty states.
- error states.
- no misleading success state.
- no fabricated delivery/read claims for WhatsApp.
- anti-AI-slop UI quality constraints already adopted by the project.

## 7.8 Browser E2E / Golden Paths

Before Pilot GO, maintain a minimal browser-level E2E suite over production-style HTTP mode.

Minimum golden paths should cover:

### PromotorClass

```text
promotor login
→ create/publish program
→ public registration
→ learner access
→ complete lesson
→ submit reflection / CTA event as applicable
→ progress/event/signal updates
→ promotor sees learner state / next action
```

### PromotorFlow

```text
create/match contact
→ next action
→ WhatsApp open + human sent confirmation
→ booking
→ confirm / paid status as applicable
→ complete
→ aftercare scheduled D+7
```

### Cross-product

```text
Class high-value signal
→ outbox
→ one canonical Flow NextAction
```

and:

```text
Flow context
→ eligible aftersales programs
→ enroll same contact_id
```

## 7.9 Staging / Rehearsal

Pilot must be preceded by a real staging/rehearsal environment using production-style configuration.

Required:

- isolated database from production data;
- full canonical migration history;
- runtime grants;
- real runtime role;
- real authentication flow;
- production HTTP mode;
- real integration outbox/dispatcher behavior;
- realistic seed/demo data where safe;
- smoke test after deployment;
- rollback/runbook evidence.

---

# 8. Explicit V0.1 Scope Cuts

The following are intentionally **not launch blockers**.

This section supersedes older roadmap assumptions about their V0.1 timing, but does not delete their future value.

## 8.1 M14 Activity — Minimal Only

Keep what is necessary for operational context and auditability.

V0.1 does **not** require a feature-rich social/activity feed.

Post-launch enhancements may include:

- rich filtering;
- advanced pagination UX;
- expanded activity analytics;
- feed customization.

## 8.2 M15 Analytics — Pilot Metrics Only

V0.1 should provide only enough metrics to validate the pilot.

Recommended minimum:

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

Full product analytics dashboards are post-launch.

## 8.3 M16 Program Templates — Post-Launch

The original M16 described code-based program templates that deep-clone into a new draft program.

That is **not the same thing** as PromotorFlow `message_templates`.

Program creation templates are deferred until after V0.1 pilot unless explicitly re-approved.

## 8.4 R2 File Uploads — Post-Launch

Earlier plans included image/PDF/document uploads.

Canonical V0.1 scope is now intentionally narrowed to:

```text
text lessons
+ YouTube Unlisted video
+ reflection
+ CTA
```

Do not build for V0.1:

- R2 lesson-resource upload UI/API;
- signed upload flows;
- document processing;
- complex resource management.

This is a deliberate scope reduction to avoid expanding storage/security surface before the core signal/action loop is validated.

## 8.5 Referral — Post-Launch Growth Track

The existing referral work began as an R0 prototype / B4.5 draft track.

It is not part of the original critical V0.1 learning→signal→action loop.

Therefore:

- referral production persistence is not a V0.1 launch blocker;
- existing production feature gating must remain safe;
- referral may become a **V0.1.1 Growth Experiment** after core pilot readiness;
- do not silently introduce referral tables/contracts into V0.1 closure work.

---

# 9. V0.2 / Later Candidates

Do not build these merely because they sound useful.

Promote them only after repeated user demand or explicit product re-prioritization.

Known candidates:

```text
scheduled content release
payment / payment gateway integration
certificate
quiz engine
team member / team collaboration
automated WhatsApp notification
cohort features
```

Additional later candidates:

- production referral system;
- program template library;
- rich analytics;
- richer activity views;
- R2 file/resource uploads;
- native mobile apps;
- native video upload/transcoding;
- watch-percentage tracking;
- custom video player / white-label video;
- complex billing/SaaS administration.

Avoid roadmap-by-imagination.

---

# 10. Explicit Video Decision — V0.1

V0.1 video remains:

```text
Provider        YouTube Unlisted
Player          official YouTube embed
Video storage   none
Transcoding     none
Watch tracking  none
Completion      manual
White-label     not supported
```

Do not introduce:

- native video uploads;
- video processing workers;
- transcoding queues;
- HLS packaging;
- video CDN;
- custom player;
- DRM;
- attempts to hide/remove YouTube identity beyond what the official embed supports.

---

# 11. Canonical Release Ledger

Do not keep inventing new B-numbers for remaining launch work.

Use two ledgers.

## 11.1 Backend Implementation Ledger

```text
B0–B6.1   Core implementation             implemented / hardened
B7-old    PromotorFlow integration        absorbed into B6/B6.1 + seams/outbox
B8-old    Production hardening            absorbed into release-hardening + remaining L0/L1/L2 work
```

## 11.2 Product / Launch Ledger

```text
M0–M13    Core product loop               V0.1
M14       Activity                        minimal V0.1
M15       Analytics                       minimal pilot metrics
M16       Program templates               post-launch
M17       two-way Class ↔ Flow            V0.1

L0        Core Semantic Closure
L1        Operational Readiness
L2        Staging Release Candidate
L3        Controlled Production Pilot
```

---

# 12. L0 — Core Semantic Closure

L0 is complete only when all core semantics are proven on current master.

Required:

```text
canonical learning events
exactly-once milestone events
correct signal/source-event provenance
one canonical Flow NextAction per idempotency key
M17 Class → Flow acceptance
M17 Flow → Class acceptance
no raw reflection leakage across product boundary
```

## L0 GO criteria

- P0 = 0.
- P1 semantic correctness defects = 0.
- tests cover retries/concurrency/idempotency.
- integration contracts match frozen contract definitions.

---

# 13. L1 — Operational Readiness

Required:

```text
scheduled inactivity / at-risk job
privacy/data deletion backend capability
minimum observability/error tracking
framework/runtime production-support closure
production HTTP mode verification
critical mobile/accessibility pass
loading/empty/error-state pass
minimal browser E2E golden flows
security checklist closure
```

## L1 GO criteria

- no known P0/P1 operational release blockers;
- scheduled jobs are real, not documentation-only;
- failure paths are observable;
- no mock-only dependency on production critical paths;
- core browser workflows pass.

---

# 14. L2 — Staging Release Candidate

Build a release candidate from canonical master.

Required:

```text
fresh isolated staging/rehearsal database
full migrations from canonical history
least-privilege runtime grants
real auth
real tenant + entitlement checks
production HTTP adapters
real outbox dispatch path
production-style Worker/frontend deployment
smoke tests
browser E2E
live acceptance
rollback/runbook rehearsal
```

## L2 GO criteria

- all L0 and L1 gates green;
- migration rehearsal green;
- runtime privilege checks green;
- canonical live-acceptance suite green;
- browser critical paths green;
- no secret leakage;
- no production data used in staging;
- rollback path documented and rehearsed sufficiently for pilot.

---

# 15. L3 — Controlled Production Pilot

Only after L2 GO.

Production pilot sequence:

```text
final production migration/grants plan
→ explicit human approval
→ production secrets/bindings verification
→ manual production deploy
→ smoke test
→ onboard 5–10 promotors
→ observe behavior
→ collect pilot metrics/interviews
→ Go / No-Go for expansion
```

Do not immediately onboard hundreds of users.

---

# 16. Pilot Success Criteria

The pilot exists to validate the product loop, not to prove feature breadth.

Observe whether promotors can:

- create and publish a useful program;
- get learners enrolled;
- understand learner state;
- see who needs attention;
- act on next steps;
- use booking/follow-up/aftercare naturally;
- return repeatedly because the system helps them decide what to do next.

Strong signal:

> Promotors return specifically to see who needs attention and what action to take.

Weak signal:

> Promotors only create content but ignore learner signals and next actions.

If the signal/action loop is weak, do not expand LMS feature breadth first.

Fix the core loop.

---

# 17. Pilot Go / No-Go Metrics

At minimum review:

```text
program publication
learner enrollment
learner start rate
lesson completion
reflection usage
CTA usage
learning-signal generation
next-action creation
next-action completion
repeat promoter activity
booking completion
follow-up / aftercare usage
```

The key business/product chain is:

```text
Learning Signal
→ Promotor attention
→ Completed Next Action
```

---

# 18. Security Release Checklist

Before Pilot GO verify at least:

- tenant isolation.
- authenticated routes protected.
- entitlement gates.
- resource organization ownership.
- public/private/draft content separation.
- learner session/token security.
- raw tokens absent from JSON/logs.
- secure cookies/session behavior.
- rate limiting for sensitive auth/public routes.
- CSRF strategy appropriate to runtime/auth implementation.
- user-generated reflection output safely rendered.
- no biometric data storage.
- secrets absent from client bundles/logs/repository.
- data deletion path exists.
- runtime database role has no DDL capability.
- production frontend cannot run in mock mode.

---

# 19. Frozen PromotorFlow V0.1 Rules

Do not change these as part of roadmap closure unless a new explicit product decision is approved.

## Contact lifecycle

```text
NEW
CONTACTED
INTERESTED
FOLLOW_UP
BOOKED
COMPLETED
LOST
```

`CLIENT` classification is sticky after completion.

## Booking completion

- canonical lifecycle respected.
- completion promotes contact/client state according to frozen rule.
- stale booking actions cancelled.
- exactly one aftercare record/action created.
- aftercare due D+7.

## Aftercare outcomes

```text
NO_NEED
HAS_QUESTION
INTERESTED_NEXT_SESSION
CONTACT_LATER
```

## WhatsApp

V0.1 remains human-driven:

```text
template/draft
→ editable preview
→ wa.me
→ record WHATSAPP_OPENED
→ user returns
→ explicit "sent?" confirmation
→ WHATSAPP_SENT only if user confirms
```

Never claim delivered/read status.

---

# 20. Agent Operating Instructions

Every coding agent working on V0.1 must read this file before planning new work.

## 20.1 Required startup sequence

```text
1. git checkout master
2. git pull --ff-only
3. read docs/V01_CANONICAL_ROADMAP.md completely
4. inspect relevant frozen domain/architecture documents
5. inspect current code/tests before assuming a capability is missing
6. classify the requested work under L0, L1, L2, L3, or post-launch
7. do not implement post-launch scope during V0.1 closure unless explicitly instructed
```

## 20.2 Do not trust stale milestone names

Do not infer that:

```text
"B6.1 done" = production done
```

Do not reopen already frozen domains simply because original milestone numbering differs.

## 20.3 Work in meaningful batches

Prefer coherent, independently verifiable batches rather than endless micro-PR churn.

A batch may include all code/tests/docs needed to close one real launch gate, provided unrelated domains are not refactored.

## 20.4 Stop conditions

Stop and request a human decision only for a real blocker such as:

- architecture conflict with frozen contracts;
- security model change;
- destructive migration ambiguity;
- product decision that changes canonical V0.1 scope;
- production deployment / production mutation requiring explicit approval.

Do not stop merely because a task is large.

---

# 21. Agent Status Reporting Format

Use this format when returning work:

```text
V0.1 CANONICAL ROADMAP STATUS

Canonical master base:
Current branch/head:
Roadmap gate worked: L0 | L1 | L2 | L3

Implemented:
- ...

Verified existing / no change needed:
- ...

Remaining blockers:
P0:
- ...
P1:
- ...

Post-launch items intentionally not touched:
- ...

Tests/builds:
- typecheck
- lint
- unit
- integration
- production builds
- E2E where relevant

Migration/schema changes:
- yes/no

Production mutation/deploy:
- MUST be NO unless explicitly authorized

Recommended next gate:
- ...
```

---

# 22. Current Planning State at Publication

At the time this document is published:

```text
Core B0–B6.1 implementation          substantially implemented / hardened
PR #35 acceptance tooling            merged / frozen
Canonical master baseline            d6a11a7ffd7f2b80298a9fac5a0c1db6c87ab790 before this doc commit
Production deployment                NOT implied by core completion
```

The next agent must **re-audit current master** and must not blindly assume every item below is still open or already closed.

Priority reconciliation targets are:

```text
L0
- canonical milestone-event exactly-once/provenance closure
- complete two-way M17 acceptance evidence

L1
- inactivity/at-risk scheduled job
- privacy/data-deletion backend capability
- minimum observability
- framework/runtime pre-production debt
- production HTTP UI QA
- critical mobile/accessibility/error-state closure
- minimal browser E2E

L2
- full production-style staging/rehearsal
- migrations/grants/runtime-role verification
- end-to-end acceptance
- rollback/runbook verification
```

If current code proves any item is already correctly implemented, mark it **VERIFIED EXISTING** rather than rebuilding it.

---

# 23. Explicitly Out of Scope for V0.1 Closure

Unless the user explicitly changes this roadmap, agents must not spend V0.1 closure time on:

```text
production referral backend
referral rewards automation
program template marketplace/library
full analytics suite
rich social/activity feed
R2 lesson-resource uploads
payment gateway
subscription billing
certificates
quiz engine
team collaboration
cohorts
automated WhatsApp sending
native Android/iOS apps
native video upload/transcoding
watch percentage tracking
custom video player
DRM
white-label removal of YouTube identity
microservice extraction
```

---

# 24. Definition of V0.1 Complete

V0.1 is **not complete** merely because:

- migrations exist;
- APIs compile;
- content can be uploaded;
- B6.1 is merged;
- unit/integration tests are green in isolation;
- a backend rehearsal passes without browser/operator workflows.

V0.1 is complete when:

```text
A learner can enter a real program
→ progress through it
→ produce canonical learning events
→ create meaningful learning state/signals
→ the promoter sees what matters
→ the promoter can take a real canonical action
→ PromotorFlow can carry that action through follow-up/booking/aftercare
→ Flow and Class can exchange context in both directions
→ the system survives retries, outages and normal operator mistakes
→ critical production-style browser paths pass
→ security/observability/operations gates are ready
→ staging release candidate passes
→ human gives explicit Pilot/Production GO
```

That is the canonical V0.1 release definition.

---

# 25. Change Control

This file should remain stable during V0.1 closure.

Change it only when there is an explicit product/release decision to:

- move a feature into or out of V0.1;
- change a launch gate;
- change Pilot strategy;
- change the definition of release readiness.

Do not modify this roadmap merely to make implementation appear complete.

If implementation and this roadmap disagree, surface the discrepancy and decide deliberately.

---

# 26. Final Canonical Summary

```text
V0.1 CORE
────────────────────────────────────────
Shared platform identity/auth/tenant
PromotorClass content + learner journey
Learning progress/events/signals/intent
Promotor Home + Learner context
PromotorFlow CRM/NextAction/booking/aftercare
Two-way Class ↔ Flow integration
Human-driven WhatsApp workflow

V0.1 LAUNCH READINESS
────────────────────────────────────────
semantic event correctness
scheduled inactivity detection
privacy deletion capability
minimum observability
supported production runtime
real HTTP production-mode QA
mobile/accessibility/error states
minimal browser E2E
security closure
staging/rehearsal/rollback evidence

POST-LAUNCH
────────────────────────────────────────
Referral production system
Program templates
Rich analytics/activity
R2 resource uploads
Payment/certificates/quizzes/teams/cohorts
WhatsApp automation
Native mobile/video infrastructure
```

**Protect the learning → signal → action loop above all else.**
