# Promotor Platform — Backend Stack Decision

**Date:** 2026-08-12  
**Status:** LOCKED for backend planning baseline  
**Scope:** PromotorClass + PromotorFlow shared platform backend  
**Frontend architecture:** `Promotor Platform Frontend Architecture V1`  
**Integration source of truth:** `docs/INTEGRATION_CONTRACT.md`

---

# 1. Decision

Promotor Platform backend baseline is:

```text
Frontend Web
Next.js
        │
        ▼
Cloudflare Workers
        │
        ▼
Application / API Layer
        │
        ├── Better Auth
        │
        ├── Domain Services
        │
        └── Integration Adapters
        │
        ▼
Drizzle ORM
        │
        ▼
Cloudflare Hyperdrive
        │
        ▼
Neon PostgreSQL
```

Supporting services:

```text
Files / downloads
→ Cloudflare R2

Video
→ YouTube Unlisted

Async work / integration dispatch
→ Cloudflare Queues when required

Future mobile
→ Expo / React Native or TWA
→ same API/auth backend
```

No VPS is required for the baseline architecture.

---

# 2. Locked Technology Choices

## Runtime

```text
Cloudflare Workers
```

Purpose:

- web runtime / server execution where appropriate,
- canonical API backend,
- Better Auth server endpoints,
- domain application services,
- cross-product adapters,
- lightweight asynchronous dispatch.

---

## Authentication

```text
Better Auth
self-hosted in Promotor Platform backend
```

Better Auth is an implementation of the platform authentication layer.

It is **not** a second product identity model.

---

## Authorization / Tenant Membership

```text
Better Auth Organization plugin
```

Mapped into canonical Shared Core organization/user membership semantics.

Teams remain disabled for V0.1 unless explicitly added later.

---

## ORM

```text
Drizzle ORM
```

Used for:

- PostgreSQL schema,
- typed queries,
- migrations,
- Better Auth Drizzle adapter integration.

---

## Database

```text
Neon PostgreSQL
```

Neon is the managed PostgreSQL provider.

Application/domain code must remain PostgreSQL-oriented rather than Neon-proprietary where avoidable.

---

## Worker → Database Connection

```text
Cloudflare Hyperdrive
```

Hyperdrive sits between Workers and Neon PostgreSQL.

Application flow:

```text
Worker
↓
Drizzle
↓
Hyperdrive
↓
Neon Postgres
```

Do not stack provider pooling in front of Hyperdrive unless explicitly required and tested.

---

## File Storage

```text
Cloudflare R2
```

For:

- lesson PDF,
- downloadable worksheets,
- images,
- future permitted attachments.

Do not store large file binaries inside PostgreSQL.

---

## Video

```text
YouTube Unlisted
Official YouTube embed
```

No first-party:

- video upload,
- video storage,
- video transcoding,
- custom streaming infrastructure.

---

## Async

```text
Cloudflare Queues
```

Add only when durable asynchronous processing is required.

Examples:

- integration outbox dispatch,
- retrying cross-product sync,
- notifications.

Do not introduce a queue for simple synchronous CRUD.

---

# 3. Why Better Auth

Promotor Platform needs authentication that:

- is application-owned,
- supports web now,
- can support native mobile later,
- does not require Supabase Auth,
- can map into Shared Core users/organizations,
- supports PostgreSQL through Drizzle,
- keeps database provider replaceable.

Better Auth satisfies this boundary.

The platform owns:

```text
authentication policy
tenant membership policy
domain authorization
product entitlements
```

Better Auth supplies authentication/session/organization primitives.

---

# 4. Better Auth vs Shared Core

Critical rule:

> Better Auth implements Shared Core auth identity; it must not create a competing Shared Core.

Canonical platform concepts remain:

```text
User
Organization
Contact
```

But their responsibilities differ.

---

# 5. User vs Contact

## User

A `User` is an authenticated platform identity.

Examples:

```text
Rina Maharani
Promotor / owner
```

User may:

- sign in,
- hold session,
- belong to organization,
- possess organization role,
- access product entitlements.

---

## Contact

A `Contact` is a canonical person in the business/learning lifecycle.

Examples:

```text
Ayu Rahma
Learner
Prospect
Client
```

Contact may exist without an auth User.

Do not turn every learner/contact into a Better Auth user automatically.

---

## Future authenticated learner

If a learner later needs a durable authenticated account:

```text
Contact
↓
explicit link
↓
Auth User
```

The exact linking model is deferred.

Do not add the link merely because Better Auth exists.

---

# 6. Canonical Auth / Tenant Tables

Recommended database naming:

```text
users
sessions
accounts
verifications

organizations
organization_members
organization_invitations
```

Optional future Better Auth/plugin tables should follow platform naming conventions.

Canonical domain table remains:

```text
contacts
```

and is not owned by Better Auth.

---

# 7. Better Auth Schema Mapping

Better Auth must be configured to map its models to platform canonical table names.

Conceptual mapping:

```text
Better Auth user
→ users

Better Auth organization
→ organizations

Better Auth member
→ organization_members

Better Auth invitation
→ organization_invitations
```

Do not create both:

```text
organization
organizations
```

or:

```text
user
users
```

as separate logical identities simply because a library defaults to singular table names.

---

# 8. Organization Plugin Scope

Use Organization plugin for:

- organization membership,
- active organization context,
- owner/admin/member role primitives,
- invitations when team/member capability is later enabled.

V0.1 should keep organization complexity minimal.

Recommended initial roles:

```text
owner
admin
member
```

If Promotor Platform initially has only one owner per organization, the schema may still support membership without exposing team management UI.

---

# 9. Domain Authorization Remains Ours

Better Auth role checks do not replace domain authorization.

Every private application operation must verify:

```text
authenticated user
↓
organization membership
↓
product entitlement
↓
resource belongs to organization
↓
domain-specific permission
```

Do not trust browser-provided:

```text
organization_id
user_id
role
```

as authorization authority.

Resolve tenant context server-side.

---

# 10. Product Entitlements

Authentication and product access are separate.

Use canonical concept:

```ts
type ProductEntitlements = {
  promotorClass: boolean;
  promotorFlow: boolean;
};
```

A signed-in user may have:

```text
Class only
Flow only
Bundle
```

Better Auth answers:

```text
Who are you?
Which organization are you a member of?
```

Platform entitlement logic answers:

```text
Which products may this organization use?
```

Do not encode product subscription solely into Better Auth roles.

---

# 11. Integration Health Is Separate

Keep:

```text
ProductEntitlements
≠
IntegrationHealth
```

Example:

```text
promotorFlow entitlement = true
PromotorFlow integration health = UNAVAILABLE
```

is different from:

```text
promotorFlow entitlement = false
```

Backend and frontend must preserve this distinction.

---

# 12. Promotor Authentication

Better Auth is locked as auth framework.

Exact V0.1 sign-in methods remain a product/auth implementation decision.

Candidate methods may include:

```text
Google OAuth
email/password
email OTP
phone OTP
```

Do not activate every method by default.

Choose the smallest login UX that fits the release.

---

# 13. Learner Authentication

Public PromotorClass registration:

```text
name
phone
optional additional fields
↓
matchOrCreateContact
↓
Enrollment
```

does not automatically imply Better Auth account creation.

Learner access mechanism must be designed separately.

Possible future approaches:

```text
secure one-time access link
phone OTP
durable Better Auth user linked to Contact
```

Do not assume email magic-link because learner acquisition is phone/WhatsApp-centric.

---

# 14. Mobile Compatibility

Future native mobile must authenticate against the same Better Auth backend.

Do not create a mobile-specific auth database.

Architecture:

```text
PromotorClass Web
PromotorFlow Web
PromotorClass Mobile
PromotorFlow Mobile
        │
        ▼
same Better Auth backend
        │
        ▼
same users / organizations
```

Mobile-specific session storage/deep-link handling belongs to the native client integration, not a separate auth system.

---

# 15. Why Neon PostgreSQL

Promotor Platform is a relational product.

Expected domains include:

```text
users
organizations
contacts
programs
modules
lessons
enrollments
progress
reflections
learning_events
learning_signals

services
bookings
next_actions
activities
aftercare
```

PostgreSQL provides a conventional, portable relational foundation for these domains.

Neon is selected as the managed provider because it fits:

- serverless application patterns,
- development environments that may idle,
- isolated database branching,
- PostgreSQL tooling,
- Cloudflare Hyperdrive connectivity.

---

# 16. Why Not Supabase as Primary Baseline

Supabase remains a valid PostgreSQL provider.

It is not selected as the baseline because the chosen architecture already assigns:

```text
Auth
→ Better Auth

Files
→ R2

Compute/API
→ Cloudflare Workers

Video
→ YouTube
```

Therefore many integrated Supabase platform capabilities would not be used.

Using Neon keeps the database provider focused on PostgreSQL.

This is a product-fit decision, not a claim that Supabase is inferior.

---

# 17. Provider Portability

Application code must avoid unnecessary Neon-specific coupling.

Keep portable:

```text
PostgreSQL schema
Drizzle models
SQL semantics
application repositories
migrations
```

Provider-specific configuration belongs at infrastructure boundaries.

If the provider changes later:

```text
Neon
→ another PostgreSQL provider
```

frontend/domain contracts should not change.

---

# 18. Database Branching Policy

Neon branching may be used for:

```text
feature development
migration testing
preview environments
agent experimentation
```

Initial minimum environments:

```text
development
production
```

Recommended once CI/preview flow exists:

```text
development
staging
production
feature / preview branches
```

Do not create uncontrolled branches without cleanup policy.

---

# 19. Drizzle Ownership

Drizzle is the canonical application ORM/schema layer.

Use Drizzle for:

```text
platform/domain schema
queries
migrations
constraints
indexes
```

Better Auth integrates through its official Drizzle adapter.

Do not maintain an independently drifting auth schema and application schema.

Auth schema generation should be reviewed and incorporated into the canonical Drizzle schema/migrations.

---

# 20. Migration Policy

One migration history owns the database.

Recommended:

```text
packages/database/
or
apps/api/src/db/
```

exact location to be decided in backend implementation planning.

Do not let:

```text
Better Auth migrations
PromotorClass migrations
PromotorFlow migrations
```

become three unrelated migration systems.

Migration ownership must remain centralized even when domains are modular.

---

# 21. Hyperdrive Role

Hyperdrive is infrastructure, not a database.

It provides Worker-side connection management and query acceleration for the existing Postgres database.

Flow:

```text
Cloudflare Worker
↓
Hyperdrive binding
↓
Neon connection
```

Application repositories should not know Neon credentials directly when running through Workers.

---

# 22. Hyperdrive Connection Rule

When Hyperdrive owns connection pooling:

> Prefer the direct/unpooled database endpoint for the Hyperdrive origin rather than stacking another pooler in front of it.

Exact Neon connection configuration must be validated against current Cloudflare/Neon documentation during infrastructure setup.

Do not hard-code connection assumptions into domain code.

---

# 23. Hyperdrive Free Plan

Free-tier limits are acceptable for development / early pilot evaluation.

Do not design the product around staying forever below free-tier limits.

When production usage exceeds limits:

```text
upgrade infrastructure
```

rather than compromising domain correctness.

---

# 24. R2 Storage Boundary

Store file metadata in Postgres:

```text
id
organization_id
storage_key
filename
mime_type
size
created_at
```

Store actual binary content in R2.

Use signed/authorized access where private content requires it.

Do not expose unrestricted private object URLs.

---

# 25. YouTube Boundary

Lesson video metadata may include:

```text
provider = YOUTUBE
youtube_video_id
title
duration if known
```

Do not store the video binary.

Do not promise white-label removal of YouTube identity.

Completion remains manual in V0.1.

---

# 26. Async / Outbox

PromotorClass domain writes remain transactional in Postgres.

When external/cross-product dispatch is required:

```text
domain state
+
learning event
+
learning signal
+
integration_outbox
↓
commit
```

Then:

```text
dispatcher / Queue
↓
adapter
↓
destination
```

Queues do not replace the database outbox where atomic durability is needed.

---

# 27. Shared Platform Backend Shape

Recommended logical modules:

```text
auth
organizations
entitlements
contacts

promotor-class/
  programs
  lessons
  enrollments
  progress
  reflections
  learning-events
  learning-signals

promotor-flow/
  services
  bookings
  next-actions
  activities
  aftercare

integrations/
  promotorflow
  promotorclass

storage
notifications
```

Keep modular-monolith boundaries.

Do not introduce microservices for V0.1.

---

# 28. API Boundary

Canonical mobile/web backend contract must be callable through HTTP/API.

Next.js Server Actions may later be used as convenience/BFF behavior, but must not become the only canonical application contract.

Architecture:

```text
Web
Mobile
    │
    ▼
API contract
    │
    ▼
Application services
```

---

# 29. Security Baseline

Required:

- server-side session validation,
- organization isolation,
- entitlement checks,
- resource ownership checks,
- secure secrets,
- CSRF/session protections according to Better Auth/runtime setup,
- runtime DTO validation,
- rate limiting for auth-sensitive endpoints,
- no biometric data,
- no auth secrets in client bundle.

---

# 30. Secrets

Expected infrastructure secrets/config may include:

```text
BETTER_AUTH_SECRET
BETTER_AUTH_URL / canonical auth base URL

Neon database origin credentials
Hyperdrive binding/config

OAuth provider credentials when enabled

R2 binding/config

Queue bindings when enabled
```

Exact variable names should follow the implementation selected by official adapters.

Do not duplicate database credentials into browser environment variables.

---

# 31. Observability

At minimum log:

```text
request_id
organization_id where safe
authenticated user id where safe
operation
result
duration
integration destination
```

Never log:

```text
password
OTP
session secret/token
full private reflection
full private note
database password
OAuth secret
```

---

# 32. Development Strategy

Frontend-first remains valid.

Backend work begins only after frontend architecture milestones are ready.

Recommended backend sequence:

```text
B0 backend architecture scaffold
↓
B1 database + migrations
↓
B2 Better Auth + Organization mapping
↓
B3 Shared Core contacts/tenant context
↓
B4 PromotorClass domain persistence
↓
B5 public registration/enrollment
↓
B6 learning progress/events/signals
↓
B7 PromotorFlow integration
↓
B8 production hardening
```

---

# 33. What Is Not Locked Yet

This document does not yet lock:

```text
exact promoter login methods
learner auth method
email/SMS/WhatsApp OTP provider
billing provider integration
exact Neon project/branch naming
exact Cloudflare region/runtime deployment layout
production rate-limit thresholds
production backup/retention policy
```

Those require implementation-specific decisions.

---

# 34. Prohibited Architecture Drift

Coding agents must not silently switch to:

```text
Supabase Auth
Firebase Auth
Clerk
Auth0
custom hand-rolled auth
D1 as primary database
VPS PostgreSQL
Prisma
Supabase Storage
native video storage
```

without an explicit new ADR.

This is not because these technologies are invalid.

It is because the baseline is now locked.

---

# 35. Definition of Backend Stack Compliance

An implementation complies when:

- Better Auth is the auth framework.
- Better Auth maps into canonical Shared Core user/org semantics.
- Contacts remain domain-owned and separate from auth users.
- Drizzle owns application database schema/query layer.
- Neon is primary PostgreSQL provider.
- Workers reach Neon through Hyperdrive in production Worker path.
- R2 stores files.
- YouTube hosts video.
- API is consumable by future mobile.
- PromotorFlow remains sole canonical NextAction owner.
- No second tenant/contact/auth identity system is introduced.

---

# 36. Final Stack

```text
PROMOTOR PLATFORM

Clients
├── PromotorClass Web
├── PromotorFlow Web
└── Future Mobile
          │
          ▼
Cloudflare Workers / API
          │
    ┌─────┴─────────────┐
    │                   │
Better Auth       Application Services
    │                   │
    └─────────┬─────────┘
              ▼
          Drizzle ORM
              │
              ▼
     Cloudflare Hyperdrive
              │
              ▼
        Neon PostgreSQL

Supporting
├── Cloudflare R2
├── Cloudflare Queues
└── YouTube Unlisted
```

This is the backend baseline to use when backend implementation planning begins.
