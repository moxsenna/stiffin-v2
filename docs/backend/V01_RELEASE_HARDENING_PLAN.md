# Promotor Platform V0.1 — Release Hardening & Closure Plan

**Document:** `docs/backend/V01_RELEASE_HARDENING_PLAN.md`  
**Target Milestone:** Consolidated V0.1 Final Release Closure  
**Canonical Base Commit:** `c3893dd4b84532f724815a97f75b8d59c5260006`  
**Branch:** `feat/v01-release-hardening`  
**Applicable Contracts:** `docs/INTEGRATION_CONTRACT.md`, `docs/promotor-class/PRD.md`

---

## 1. Executive Summary & Problem Reconciliation

This plan addresses all remaining production and security hardening requirements for the Promotor Platform V0.1 baseline:
1. **P0 Learner Authorization & Session Management**: Moving from enrollment-UUID-as-auth to high-entropy SHA-256 hashed one-time access token redemption into persistent HttpOnly cookie-backed learner sessions (`learner_sessions`).
2. **Canonical Learning Event Vocabulary**: Aligning event types to dot-separated contract names (`learner.registered`, `learner.enrolled`, `lesson.started`, `lesson.completed`, `reflection.submitted`, `program.progress_50`, `program.progress_80`, `program.completed`, `cta.viewed`, `cta.clicked`, `learner.inactive`).
3. **Canonical Progress & Intent Scoring**:
   - Progress: `completed REQUIRED lessons / total REQUIRED lessons * 100` (optional lessons do not block completion; zero required lessons does not auto-complete).
   - Intent: Pure deterministic computation (`Enrollment +10`, `First lesson +10`, `50% +20`, `80% +20`, `Completed +20`, `CTA clicked +20`, capped at 100; Labels: `COLD` <40, `WARM` 40-69, `HOT` 70-100).
4. **Learning Signal Alignment & Durable Integration Outbox**:
   - Enriched `learning_signals` schema matching Section 22 of Integration Contract.
   - Dedicated `integration_outbox` table with transactional enqueue, DB-backed idempotent dispatcher, and bounded retry strategy.
   - Decoupled `LearningEngineService` from direct Flow repository mutations, routing through `PromotorFlowAdapter`.
5. **Relational Authorization & Concurrency Invariants**:
   - Strict validation: `learner session -> contact -> enrollment -> program -> module -> lesson`.
   - Concurrency protection: Atomic conditional token redemption, idempotent `completeLesson` execution, and single milestone/signal generation under race conditions.
6. **Additive Migration & Privilege Arithmetic**:
   - Sequential migration `0007_v01_release_hardening.sql` (Index 7).
   - Byte-identical preservation of historical migrations `0000`..`0006`.
   - Exact recomputation of `promotor_runtime` table capabilities.

---

## 2. Database Schema & Migration Strategy

### New Tables & Additive Changes in `0007_v01_release_hardening.sql`

1. **`learner_sessions` Table**:
   - `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `organization_id`: `uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
   - `contact_id`: `uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE`
   - `token_hash`: `text NOT NULL UNIQUE` (SHA-256 hex string)
   - `expires_at`: `timestamp with time zone NOT NULL`
   - `revoked_at`: `timestamp with time zone`
   - `created_at`: `timestamp with time zone NOT NULL DEFAULT now()`
   - `last_used_at`: `timestamp with time zone`

2. **`integration_outbox` Table**:
   - `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `organization_id`: `uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
   - `destination`: `text NOT NULL` (e.g., `'PROMOTORFLOW'`)
   - `operation`: `text NOT NULL` (e.g., `'CREATE_NEXT_ACTION'`, `'APPEND_ACTIVITY'`)
   - `idempotency_key`: `text NOT NULL`
   - `payload_json`: `jsonb NOT NULL`
   - `status`: `text NOT NULL DEFAULT 'PENDING'` (CHECK constraint: `IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`)
   - `attempt_count`: `integer NOT NULL DEFAULT 0`
   - `next_attempt_at`: `timestamp with time zone NOT NULL DEFAULT now()`
   - `last_error_code`: `text`
   - `created_at`: `timestamp with time zone NOT NULL DEFAULT now()`
   - `processed_at`: `timestamp with time zone`
   - Unique Index: `(destination, idempotency_key)`

3. **`learning_events` Check Constraint Update**:
   - Update CHECK constraint to support canonical event types:
     `'learner.registered'`, `'learner.enrolled'`, `'lesson.started'`, `'lesson.completed'`, `'reflection.submitted'`, `'program.progress_50'`, `'program.progress_80'`, `'program.completed'`, `'cta.viewed'`, `'cta.clicked'`, `'learner.inactive'`.

4. **`learning_signals` Schema Enrichment**:
   - Ensure columns: `id`, `organization_id`, `contact_id`, `program_id`, `enrollment_id`, `source_event_id`, `type`, `priority`, `reason`, `recommended_action_type`, `recommended_action_reason`, `status`, `created_at`, `resolved_at`.

5. **`lessons` Column Enrichment**:
   - `is_required`: `boolean NOT NULL DEFAULT true`.

---

## 3. Privilege Matrix Arithmetic

- **Baseline before B4**: 98 capabilities across 25 tables.
- **B4**: +8 capabilities (`enrollments` 4 + `learner_access_tokens` 4) = 106 across 27 tables.
- **B5**: +14 capabilities (`lesson_progress` 4 + `reflection_responses` 4 + `learning_events` 2 + `learning_signals` 4) = 120 across 31 tables.
- **V0.1 Hardening (0007)**:
  - +4 capabilities for `learner_sessions` (`DELETE`, `INSERT`, `SELECT`, `UPDATE`).
  - +4 capabilities for `integration_outbox` (`DELETE`, `INSERT`, `SELECT`, `UPDATE`).
  - Total: **128 capabilities across 33 tables**.
  - Strict append-only tables: `activities` (Flow) and `learning_events` (Class) granted `SELECT` and `INSERT` only.

---

## 4. Implementation Steps & Architecture

### Key Service Boundaries
1. **`LearnerSessionService`**:
   - `redeemToken(rawToken: string)`: Atomically redeems token, generates high-entropy session token, hashes and stores session.
   - `validateSession(rawSessionToken: string)`: Hashes and looks up active non-expired session, updates `last_used_at`.
   - `revokeSession(sessionId: string)`: Sets `revoked_at = now()`.
2. **`ProgressEngine`**:
   - `calculateProgramProgress({ lessons: Array<{ id, isRequired, isCompleted }> })`
   - Only required lessons count toward completion percentage.
   - If required lessons count == 0 $\rightarrow$ progress is 0%, `isComplete = false`.
3. **`IntentEngine`**:
   - Pure function computing canonical point increments:
     `enrollment (10) + firstLesson (10) + reached50 (20) + reached80 (20) + completed (20) + ctaClicked (20)`. Max 100.
4. **`LearningEngineService` & Outbox**:
   - Enqueues Flow actions into `integration_outbox` with unique idempotency key `promotorclass:{source_event_id}:{rule_id}`.
   - Outbox dispatcher process delivers events with safe retry backoff.

---

## 5. Verification Matrix & Quality Gates

1. **Unit Tests (`pnpm test`)**:
   - Pure `ProgressEngine` (required vs optional, zero required lessons).
   - Pure `IntentEngine` (canonical 100-point formula, thresholds, binary CTA).
   - Migration fingerprint test updated for `0000` through `0007`.
2. **Integration Tests (`tsx --test`)**:
   - `learner-session.integration.test.ts`: Hash verification, cookie expiration, concurrent single-winner token redemption.
   - `relational-authorization.integration.test.ts`: Cross-tenant and cross-program lesson execution rejection.
   - `outbox-dispatcher.integration.test.ts`: Transactional enqueue, retry with backoff, idempotent Flow NextAction creation.
   - Full regression across all existing B1, B2, B3, B4, B5, B6, B6.1 integration suites.
3. **Build & Lint Gates**:
   - `pnpm typecheck` (all 9 workspace projects)
   - `pnpm lint` (zero warnings/errors)
   - `pnpm build:api`, `pnpm build:class`, `pnpm build:flow`
4. **Acceptance Rehearsal (`tooling/v01-live-acceptance.ts`)**:
   - End-to-end execution of Golden Flows A, B, C, D, E.
