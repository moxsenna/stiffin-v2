# B5 — PromotorClass Learning Engine Architecture Plan

**Version:** 1.0  
**Milestone:** B5 (PromotorClass Learning Engine & Intelligence)  
**Status:** Frozen Execution Contract  
**Authority:** `INTEGRATION_CONTRACT.md`, `docs/promotor-class/PRD.md`, `docs/backend/B3_PROMOTORCLASS_CONTENT_PLAN.md`  

---

## 1. Domain Overview & Principles

PromotorClass is a Client Education OS connecting learning engagement to business outcomes.
B5 completes the runtime execution:
1. **Lesson Progress & Program Completion**: Pure deterministic formula.
2. **Reflection Capture**: Runtime responses referencing B3 Lesson configuration (`long_text`, `single_select`, `multi_select`).
3. **CTA Tracking**: High-value learning interaction tracking (`cta.viewed`, `cta.clicked`).
4. **Learning Events**: Immutable append-only audit trail of learning actions.
5. **Intent Scoring & Signals**: Deterministic scoring (0–100) and actionable signals for PromotorFlow NextActions.
6. **Class $\rightarrow$ Flow Integration**: Autonomous bridge creating Flow `NextAction` (`source = 'PROMOTORCLASS'`) without exposing raw reflection text.

---

## 2. Database Schema & Migration Index

### 2.1 Sequential Index
- Migration Index: **`0006`** (`0006_smart_learning_engine.sql`).

### 2.2 Tables Definition

#### 1. `lesson_progress`
```sql
CREATE TABLE IF NOT EXISTS "lesson_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "is_completed" boolean DEFAULT false NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lesson_progress_enrollment_lesson_unique" UNIQUE("enrollment_id", "lesson_id")
);
CREATE INDEX IF NOT EXISTS "idx_lesson_progress_org_enrollment" ON "lesson_progress" ("organization_id", "enrollment_id");
```

#### 2. `reflection_responses`
```sql
CREATE TABLE IF NOT EXISTS "reflection_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
  "lesson_id" uuid NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "response_text" text,
  "selected_options" jsonb,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reflection_responses_enrollment_lesson_unique" UNIQUE("enrollment_id", "lesson_id")
);
CREATE INDEX IF NOT EXISTS "idx_reflection_responses_org_enrollment" ON "reflection_responses" ("organization_id", "enrollment_id");
```

#### 3. `learning_events` (Append-Only)
```sql
CREATE TABLE IF NOT EXISTS "learning_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
  "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_learning_events_org_contact" ON "learning_events" ("organization_id", "contact_id");
CREATE INDEX IF NOT EXISTS "idx_learning_events_org_enrollment" ON "learning_events" ("organization_id", "enrollment_id");
```

#### 4. `learning_signals`
```sql
CREATE TABLE IF NOT EXISTS "learning_signals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "enrollment_id" uuid NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
  "contact_id" uuid NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "learning_signals_status_check" CHECK ("status" IN ('ACTIVE', 'RESOLVED', 'DISMISSED'))
);
CREATE INDEX IF NOT EXISTS "idx_learning_signals_org_status" ON "learning_signals" ("organization_id", "status");
```

### 2.3 Least Privilege Runtime Grants
`docs/sql/grants_b5.sql`:
- `lesson_progress`: `SELECT, INSERT, UPDATE, DELETE` (4)
- `reflection_responses`: `SELECT, INSERT, UPDATE, DELETE` (4)
- `learning_events`: `SELECT, INSERT` ONLY (2) — strictly append-only!
- `learning_signals`: `SELECT, INSERT, UPDATE, DELETE` (4)
- Total runtime privileges: $106 (\text{B4}) + 14 = \mathbf{120}$ capabilities across 31 tables.

---

## 3. Pure Engines & Formulas

### 3.1 Progress Calculation
$$\text{Progress \%} = \min\left(100, \text{round}\left(\frac{\text{Completed Required Lessons}}{\text{Total Required Lessons}} \times 100\right)\right)$$
- If total required lessons == 0, progress = 100%.
- Milestones triggered exactly once: 50%, 80%, 100%.
- When progress == 100%, Enrollment transitions to `COMPLETED`, `completed_at` is set, and `program.completed` event is emitted.

### 3.2 Intent Scoring Formula
- **Progress Contribution**: $\text{progressPercent} \times 0.4$ (max 40 pts).
- **Reflection Contribution**: $15 \text{ pts per submitted reflection}$ (max 30 pts).
- **CTA Interaction**: $20 \text{ pts per CTA clicked}$ (max 30 pts).
- **Recency Decay**: Active in last 3 days (+10 pts bonus).
- Total clamped strictly to $[0, 100]$.
- Labels:
  - `HOT`: $\ge 80$
  - `WARM`: $40 - 79$
  - `COLD`: $< 40$

---

## 4. Class $\rightarrow$ Flow Synchronization
When high-value learning milestones occur:
1. Signal created in `learning_signals`.
2. Checks if organization has `promotorFlow` entitlement.
3. If enabled, creates canonical `NextAction` with:
   - `contactId`: learner's Shared Contact ID.
   - `actionType`: `FOLLOW_UP_HOT_LEAD` / `FOLLOW_UP_COMPLETION` / `FOLLOW_UP_CTA`.
   - `scheduledFor`: current timestamp.
   - `notes`: summary of trigger reason.
   - Flow activity timeline appends `LEARNING_SIGNAL_RECEIVED`.
4. Raw reflection text is **never** copied into Flow activity/NextAction notes.
