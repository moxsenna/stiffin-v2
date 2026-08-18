# B4 — PromotorClass Registration & Enrollment Architecture Plan

**Version:** 1.0  
**Milestone:** B4 (PromotorClass Registration & Enrollment)  
**Status:** Frozen Execution Contract  
**Authority:** `INTEGRATION_CONTRACT.md`, `docs/promotor-class/PRD.md`, `apps/platform-api/src/db/schema/**`  

---

## 1. Domain & Identity Foundations

### 1.1 One Person = One Shared Core Contact
- A Learner is **NOT** a separate person entity.
- A Learner is defined as `Contact + Enrollment + Learner Access Context`.
- Registration uses `normalizePhone(phoneRaw)` $\rightarrow$ canonical E.164 $\rightarrow$ `matchOrCreateContact({ organizationId, phoneE164, name, email })`.
- Phone is the primary V0.1 identity key. Cross-organization contact sharing is strictly forbidden.

### 1.2 User $\neq$ Contact
- Better Auth `users` represent authenticated Promotor operators.
- Registering as a public learner does **not** create a Better Auth user account.
- Learner access uses passwordless opaque high-entropy access tokens stored as SHA-256 hashes in `learner_access_tokens`, exchanged for secure HttpOnly learner session cookies.

---

## 2. Database Schema & Migration Index

### 2.1 Sequential Index
- Current journal: `0000` (B1), `0001` (B2), `0002` (B3), `0003` (B6), `0004` (B6.1).
- B4 claims sequential index: **`0005`** (`0005_rapid_enrollment.sql`).

### 2.2 Table: `enrollments`
```sql
CREATE TABLE IF NOT EXISTS "enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "program_id" uuid NOT NULL REFERENCES "programs"("id") ON DELETE RESTRICT,
  "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE RESTRICT,
  "status" text DEFAULT 'ENROLLED' NOT NULL,
  "enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "last_activity_at" timestamp with time zone,
  "progress_percent" integer DEFAULT 0 NOT NULL,
  "intent_score" integer DEFAULT 0 NOT NULL,
  "intent_label" text DEFAULT 'COLD' NOT NULL,
  "learning_status" text DEFAULT 'NOT_STARTED' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "enrollments_org_program_contact_unique" UNIQUE("organization_id", "program_id", "contact_id"),
  CONSTRAINT "enrollments_status_check" CHECK ("status" IN ('ENROLLED', 'STARTED', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT "enrollments_progress_percent_check" CHECK ("progress_percent" >= 0 AND "progress_percent" <= 100),
  CONSTRAINT "enrollments_intent_score_check" CHECK ("intent_score" >= 0 AND "intent_score" <= 100),
  CONSTRAINT "enrollments_intent_label_check" CHECK ("intent_label" IN ('COLD', 'WARM', 'HOT')),
  CONSTRAINT "enrollments_learning_status_check" CHECK ("learning_status" IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK'))
);

CREATE INDEX IF NOT EXISTS "idx_enrollments_org_contact" ON "enrollments" ("organization_id", "contact_id");
CREATE INDEX IF NOT EXISTS "idx_enrollments_org_program" ON "enrollments" ("organization_id", "program_id");
```

### 2.3 Table: `learner_access_tokens`
```sql
CREATE TABLE IF NOT EXISTS "learner_access_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "redeemed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_learner_access_tokens_lookup" ON "learner_access_tokens" ("token_hash", "expires_at");
```

### 2.4 Least Privilege Runtime Grants
`docs/sql/grants_b4.sql`:
- `enrollments`: `SELECT, INSERT, UPDATE, DELETE` (4)
- `learner_access_tokens`: `SELECT, INSERT, UPDATE, DELETE` (4)
- Total runtime privileges: $98 (\text{B6.1}) + 8 = \mathbf{106}$ capabilities across 27 tables.

---

## 3. Core Services & Workflows

### 3.1 Public Program Registration
- Endpoint: `POST /api/v1/public/:slug/programs/:programSlug/register`
- Rate-limited per IP/slug.
- Validates:
  1. Organization exists by `slug`.
  2. Program exists, belongs to organization, `status = 'published'`, `accessType = 'public'`.
- Resolves / creates Contact via `matchOrCreateContact({ organizationId, phoneE164, name, email })`.
- Idempotently creates or returns existing `Enrollment`.
- Issues opaque 64-char hex token, stores `sha256(token)` in `learner_access_tokens` (expiry 30d).
- Returns `{ enrollmentId, contactId, accessToken, programTitle, redirectUrl }`.

### 3.2 Manual Promotor Enrollment
- Endpoint: `POST /api/v1/class/enrollments`
- Authenticated Promotor operator with `promotorClass` entitlement.
- Validates Contact belongs to same organization and Program is published/manual eligible.
- Idempotently creates or returns existing `Enrollment`.

### 3.3 Flow $\rightarrow$ Class Reverse Adapter
- Implements `PromotorClassAdapter` seam:
  - `getLearningContext(contactId)`: active enrollments, progress, learning status, intent label.
  - `listEligiblePrograms({ organizationId, accessType })`: published lead magnets and aftersales programs.
  - `enrollContact({ organizationId, programId, contactId })`: operator-initiated enrollment.
  - `getEnrollmentStatus(contactId, programId)`: current enrollment details.

---

## 4. Test Strategy & Invariants
1. Phone normalization: `0812`, `62812`, `+62812` resolve to the exact same Contact.
2. Program access matrix: Published public succeeds; draft/archived/private fails closed.
3. Registration idempotency: Duplicate registration attempts reuse same Contact & Enrollment.
4. Concurrency: Concurrent registrations for same phone+program resolve to 1 Contact and 1 Enrollment.
5. Tenant isolation: Org A cannot access, query, or enroll Org B contacts or programs.
