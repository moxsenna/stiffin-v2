# ADR-001 — Better Auth + Neon PostgreSQL + Cloudflare Hyperdrive

**Status:** Accepted  
**Date:** 2026-08-12  
**Decision owners:** Promotor Platform  
**Applies to:** PromotorClass + PromotorFlow backend foundation  
**Related:** `BACKEND_STACK_DECISION.md`, `INTEGRATION_CONTRACT.md`

---

# Context

Promotor Platform requires a backend foundation that can support:

```text
PromotorClass Web
PromotorFlow Web
future mobile clients
```

while preserving:

- one canonical User,
- one canonical Organization,
- one canonical Contact,
- PromotorFlow ownership of NextAction,
- PromotorClass ownership of learning domain,
- serverless deployment where practical,
- no mandatory VPS,
- portable PostgreSQL data model.

The frontend is being implemented first.

The backend choice must not force a future frontend/mobile rewrite.

---

# Decision

Adopt:

```text
Better Auth
+
Better Auth Organization plugin
+
Drizzle ORM
+
Cloudflare Workers
+
Cloudflare Hyperdrive
+
Neon PostgreSQL
```

with:

```text
R2 for files
YouTube Unlisted for video
Queues for asynchronous work when needed
```

---

# Decision 1 — Better Auth

Better Auth is the canonical authentication framework.

It will be self-hosted as part of the Promotor Platform backend/runtime.

Reasons:

1. Authentication remains application-owned.
2. It supports PostgreSQL/Drizzle integration.
3. It supports custom schema/table mapping.
4. Organization membership can align with Shared Core organization semantics.
5. Web and future mobile can use one backend identity system.
6. Database provider remains replaceable.

---

# Decision 2 — Organization Plugin

Use Better Auth Organization plugin as the implementation for platform organization membership.

Map plugin models into platform naming.

Target semantics:

```text
organization
→ organizations

member
→ organization_members

invitation
→ organization_invitations
```

The core Better Auth user maps to:

```text
users
```

Do not create parallel `organization` and `organizations` identity domains.

---

# Decision 3 — Contact Remains Separate

Better Auth User is not Promotor Platform Contact.

```text
User
= authenticated identity

Contact
= business / learning person identity
```

Example:

```text
Rina
→ User
→ Organization owner

Ayu
→ Contact
→ learner / prospect / client
```

If a Contact becomes an authenticated user later, use an explicit link.

Do not automatically create Better Auth users for every Contact.

---

# Decision 4 — Drizzle ORM

Drizzle is the canonical schema/query/migration layer.

Better Auth uses its Drizzle adapter.

The database schema must be reconciled into one migration history.

Do not let Better Auth produce an independently drifting production schema.

---

# Decision 5 — Neon PostgreSQL

Use Neon as managed PostgreSQL provider.

Reasons:

- relational model fits the product,
- PostgreSQL portability,
- serverless-oriented operation,
- branching is useful for development/preview/migration testing,
- Cloudflare supports Neon through Hyperdrive.

Avoid unnecessary Neon-only application semantics.

---

# Decision 6 — Hyperdrive

Cloudflare Workers access Neon through Hyperdrive.

Flow:

```text
Worker
↓
Drizzle
↓
Hyperdrive
↓
Neon
```

Hyperdrive is an infrastructure connection/pooling/query-acceleration layer.

It is not the system of record.

---

# Decision 7 — Do Not Stack Poolers by Default

When configuring Hyperdrive origin:

```text
use direct / unpooled Neon Postgres endpoint
```

unless current provider documentation requires otherwise.

Rationale:

```text
Hyperdrive already manages Worker-side connection pooling.
```

Avoid:

```text
Worker
↓
Hyperdrive
↓
another pooler
↓
Postgres
```

without a measured reason.

---

# Decision 8 — Supabase Not Selected as Baseline

Supabase remains technically valid.

It is not selected because the architecture already chooses:

```text
Better Auth
R2
Cloudflare Workers
YouTube
```

so the platform would primarily use Supabase only for PostgreSQL.

Neon is a more focused fit for this chosen composition.

This ADR does not prohibit future migration to Supabase Postgres or another PostgreSQL provider if requirements change.

Such a change requires a new ADR.

---

# Decision 9 — D1 Not Selected as Primary DB

Cloudflare D1 could reduce provider count.

It is not selected as the primary database because Promotor Platform is expected to grow across several strongly relational domains.

PostgreSQL is preferred for the long-term platform data model.

---

# Decision 10 — No VPS Baseline

Do not introduce a VPS merely to host:

```text
web runtime
API
auth
PostgreSQL
files
```

The selected managed/serverless components cover those requirements.

A VPS may be reconsidered only for a new requirement such as:

- persistent custom daemon,
- unsupported system binary,
- heavy long-running compute,
- GPU/self-hosted model,
- specialized networking.

That requires a separate ADR.

---

# Tenant Model

Canonical tenant boundary:

```text
Organization
```

Every private domain record remains organization-scoped where applicable.

Auth request:

```text
session
↓
user
↓
organization membership
↓
server-side organization context
↓
domain resource authorization
```

Never use browser-provided `organization_id` as authorization authority.

---

# Product Entitlements

Do not conflate organization membership with product subscription.

Separate:

```text
organization membership
product entitlement
integration health
```

Examples:

```text
User belongs to Organization A
Organization A has PromotorClass only
```

or:

```text
User belongs to Organization B
Organization B has Class + Flow
Flow integration currently unavailable
```

These are three separate concepts.

---

# Initial Auth Schema Intent

Conceptual platform tables:

```text
users
sessions
accounts
verifications

organizations
organization_members
organization_invitations

contacts
```

Possible future plugin tables are added only when their feature is enabled.

Teams are disabled for V0.1.

---

# Roles

Initial Organization roles:

```text
owner
admin
member
```

PromotorClass/Flow domain authorization may define more granular permissions later.

Do not encode all domain permissions only into a broad role string.

---

# Promotor Sign-In

The framework is locked.

Exact provider UX is deferred.

Possible first release methods:

```text
Google OAuth
email/password
email OTP
```

Phone OTP is possible but should not be added unless product needs justify the delivery cost/complexity.

---

# Learner Access

Public program registration creates/matches:

```text
Contact
+
Enrollment
```

It does not automatically create:

```text
Better Auth User
```

Learner access method will be decided separately.

This avoids forcing every lead-magnet learner into a full account lifecycle.

---

# Mobile Consequence

Future native app uses the same backend auth system.

Do not create separate mobile users.

Native-specific concerns:

```text
secure token/cookie storage
deep-link callbacks
platform session handling
```

live in the mobile client integration.

---

# Database Migration Consequence

All schema evolution must be reviewable in one migration history.

Workflow:

```text
update Drizzle schema
↓
incorporate Better Auth required schema changes
↓
generate migration
↓
review SQL
↓
test against development/branch database
↓
apply through controlled deployment
```

Do not auto-apply unreviewed auth schema changes directly to production.

---

# Neon Branching Consequence

Use branching as development infrastructure, not product domain state.

Valid uses:

```text
migration rehearsal
feature branch DB
preview environment
agent experiment
```

Do not use Neon branches as tenant isolation.

Tenant isolation remains:

```text
organization_id
+
authorization
```

inside the canonical database model.

---

# Failure Boundaries

## Neon unavailable

API returns controlled service errors.

Do not fabricate successful writes.

## Hyperdrive unavailable

Treat DB access as unavailable.

Do not silently bypass to a browser-visible direct DB credential.

## Better Auth unavailable

Private operations fail closed.

Public static content may remain available if it does not require auth/domain mutation.

## Queue unavailable

Canonical domain transaction remains correct.

Outbox remains pending for retry where applicable.

---

# Portability Requirement

The following must not depend on Neon-specific client APIs:

```text
domain services
repository interfaces
contracts
frontend
mobile client
```

Provider-specific code belongs in infrastructure.

This keeps:

```text
Neon → other PostgreSQL
```

possible without rewriting product contracts.

---

# Security Consequences

Adopting Better Auth does not eliminate platform security work.

Implementation must still provide:

- strong Better Auth secret,
- trusted origin/cookie configuration,
- secure OAuth secrets,
- session validation,
- server-side organization resolution,
- domain authorization,
- auth endpoint rate limiting,
- runtime DTO validation,
- audit-worthy security events,
- secure database credentials/bindings.

---

# Positive Consequences

- No mandatory VPS.
- Auth is not coupled to database vendor.
- One auth system can serve web/mobile.
- PostgreSQL remains portable.
- Shared Core users/organizations can map to Better Auth.
- Neon branching supports safer development.
- Hyperdrive fits Cloudflare Worker database access.
- Drizzle provides a single TypeScript-oriented schema/query layer.

---

# Negative Consequences

- More components than an all-in-one backend platform.
- We own auth configuration and operational correctness.
- Better Auth schema must be reconciled carefully with Shared Core.
- Cloudflare + Neon requires infrastructure configuration across two vendors.
- Hyperdrive becomes another infrastructure layer to observe.
- Learner authentication still needs a product decision.
- Free tiers are development/pilot tools, not a production reliability strategy.

---

# Alternatives Considered

## Supabase full platform

```text
Supabase Auth
Supabase Postgres
Supabase Storage
Supabase Functions
```

Rejected for baseline because it would replace several already-selected platform components and increase vendor coupling.

Still valid if the architecture later intentionally consolidates onto Supabase.

---

## Supabase Postgres only + Better Auth

Technically valid.

Rejected in favor of Neon for the current serverless/branching-focused development model.

---

## Cloudflare D1

Simpler vendor footprint.

Rejected as primary system of record because PostgreSQL is preferred for long-term relational platform complexity.

---

## VPS + PostgreSQL

Maximum infrastructure control.

Rejected because current requirements do not justify server maintenance.

---

## Managed Neon Auth

Potentially useful in the future.

Not selected as baseline because self-hosted Better Auth keeps authentication policy and provider portability more directly under Promotor Platform control.

---

# Revisit Triggers

Revisit this ADR if any of these become true:

1. Neon reliability/cost materially underperforms alternatives.
2. Hyperdrive causes measurable operational problems.
3. Better Auth lacks a required enterprise/security capability.
4. A major mobile auth constraint cannot be supported cleanly.
5. Supabase consolidation would materially reduce total system complexity.
6. D1/Postgres tradeoffs change materially.
7. A compliance requirement demands a different hosting/data topology.
8. Long-running compute requires infrastructure beyond Workers.
9. Product needs database features unavailable in the chosen provider.

A revisit requires a new ADR.

Do not edit history to pretend the old decision was never made.

---

# Implementation Guardrail

> Use Better Auth as Promotor Platform's authentication implementation, mapped to canonical Shared Core users/organizations rather than creating a parallel identity model. Keep Contact as a separate domain identity. Use Drizzle as the canonical PostgreSQL schema/query/migration layer. Run PostgreSQL on Neon and connect Cloudflare Workers through Hyperdrive. Keep provider-specific code at infrastructure boundaries. Use R2 for files, YouTube Unlisted for video, and Queues only for durable asynchronous work. Do not substitute Supabase Auth, D1, a VPS, a different ORM, or hand-rolled auth without a new accepted ADR.

---

# Acceptance Tests for the Future Backend Milestone

The backend stack decision is correctly implemented when:

```text
promotor signs in
↓
Better Auth session
↓
canonical users row
↓
canonical organization membership
↓
server resolves organization
↓
domain query returns only organization data
```

and:

```text
Class-only organization
↓
Flow entitlement denied
```

and:

```text
same Contact phone
↓
same contact_id
```

and:

```text
Worker
↓
Drizzle
↓
Hyperdrive
↓
Neon
```

works without exposing database credentials to the client.

---

# Decision Summary

Accepted architecture:

```text
Better Auth
     │
     ├── users
     ├── organizations
     └── memberships
             │
             ▼
       Shared Platform

Cloudflare Workers
        │
      Drizzle
        │
    Hyperdrive
        │
       Neon

R2      → files
YouTube → video
Queues  → async when needed
```

This ADR is accepted and should be treated as the backend baseline until superseded by a new ADR.
