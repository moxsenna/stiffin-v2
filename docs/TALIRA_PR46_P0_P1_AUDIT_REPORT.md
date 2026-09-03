# TALIRA PR #46 — P0/P1 BILLING SECURITY, FULFILLMENT & ACCEPTANCE CLOSURE REPORT

**Target Repository:** `moxsenna/stiffin-v2`  
**Base SHA (Protected Master):** `83820d7c86e12c09f8d5da061dd6f49a3dafc55f`  
**PR:** [#46](https://github.com/moxsenna/stiffin-v2/pull/46)  
**CI Status:** **GREEN (SUCCESS)**  
**Verdict:** All merge blockers resolved. PR #46 is hardened, completely tested on real PostgreSQL, and ready for merge review. Manual Bank remains **HELD**.

---

## 1. Executive Summary & Review Findings Closure

### Finding 1: Mismatch between Commerce Service and Database Constraint (`FAILED` Status) — CLOSED
- **Root Cause**: `CommerceService` recovered from gateway failure by updating `commerce_orders.status` to `'FAILED'`, but `'FAILED'` was missing from `commerce_orders_status_check` in migration `0010` and `commerce-orders.ts`. Consequently, PostgreSQL rejected the update with a check constraint violation (`23514`), caught silently by `.catch(() => {})`, leaving the order in `PENDING` status.
- **Resolution**:
  1. Added `'FAILED'` to canonical `CommerceOrderStatusSchema` in `packages/contracts/src/index.ts`.
  2. Added `'FAILED'` to Drizzle schema `commerce_orders_status_check` constraint in `apps/platform-api/src/db/schema/commerce-orders.ts`.
  3. Added `'FAILED'` to SQL migration `0010_talira_billing_and_commerce.sql` with canonical LF line endings.
  4. Updated LF canonical hashes in `migration-fingerprint.test.ts` and `source-guardrails.test.ts` (15/15 fingerprint tests pass).

### Finding 2: PostgreSQL Integration Regression Test for Gateway Failure Recovery — CLOSED
- **Implementation**: Created [`billing-commerce-failure-recovery.integration.test.ts`](../apps/platform-api/src/__tests__/integration/billing-commerce-failure-recovery.integration.test.ts) running against a real PostgreSQL test database:
  - Tests program checkout with a failing Paycore client. Directly queries `SELECT status FROM commerce_orders` under `promotor_runtime` role and asserts the persisted state is strictly `'FAILED'` and **never** `'PENDING'`.
  - Tests subscription checkout with a failing Paycore client. Asserts the persisted subscription order is strictly `'FAILED'`.
  - Verifies PostgreSQL constraint behavior: inserting `'FAILED'` succeeds, while arbitrary statuses fail with code `'23514'`.

### Finding 3: Automated Domain Schema vs SQL CHECK Constraint Consistency Guard — CLOSED
- **Implementation**: Created [`commerce-schema-consistency.test.ts`](../apps/platform-api/src/__tests__/commerce-schema-consistency.test.ts):
  - Parses `0010_talira_billing_and_commerce.sql` and compares SQL CHECK constraint values against `CommerceOrderStatusSchema.options`, `CommercePaymentModeSchema.options`, and `PaymentRecordStatusSchema.options`.
  - Asserts that SQL constraints and TypeScript/Zod schemas are strictly equal sets, preventing drift from recurring.

### Finding 4: Explicit `returnUrl` Policy and Strict Host Allowlist — CLOSED
- **Root Cause**: Previously, generic Cloudflare deployment suffixes `workers.dev` and `pages.dev` with `.endsWith('.' + pattern)` allowed any third-party Cloudflare deployment (e.g. `attacker.pages.dev`, `evil.workers.dev`) as valid return URLs.
- **Resolution**:
  - Removed `workers.dev` and `pages.dev` as generic suffix allowlists.
  - Whitelisted exact Talira-controlled domains:
    - First-party custom domains: `stiffin.id` (`*.stiffin.id`), `promotor.id` (`*.promotor.id`), `talira.id` (`*.talira.id`), `appvibe.biz.id` (`*.appvibe.biz.id`).
    - Exact Talira-controlled Cloudflare account namespace: `moxsenna.workers.dev` (`*.moxsenna.workers.dev`).
  - Strict host policy: `https://attacker.pages.dev/...` and arbitrary `https://evil.workers.dev/...` are strictly rejected with `Domain returnUrl tidak diizinkan`.
  - Environment-based localhost policy: `http://localhost:...` and `http://127.0.0.1:...` are permitted in development and testing environments, but strictly **forbidden in production** (`appEnv === 'production'`).
  - Added unit regression tests in `commerce-service.test.ts` asserting rejection of `attacker.pages.dev`, arbitrary `*.workers.dev`, and production localhost.

### Finding 5: Elimination of Fabricated `'08000000000'` Phone Fallback — CLOSED
- **Resolution**: Audited Paycore order schema (`D:\Coding\paycore\src\schemas\order.ts`: `phone: z.string().min(8).max(32).optional()`).
  - Updated `PaycoreCreateOrderInput` to make `phone?: string` optional.
  - In `createSubscriptionCheckout`, `customerPhone` evaluates to `user.phone?.trim() ? normalizePhone(user.phone.trim()) : undefined`. If omitted, no fake phone number is passed.

---

## 2. Complete Paycore Capability Audit Matrix

Audited directly against `D:\Coding\paycore` (`docs/external/integration-guide.md`, `openapi.yaml`, `src/routes/*`):

| Capability | Supported in Paycore? | Talira Integration Approach & Domain Boundary |
|---|:---:|---|
| **Payment Checkout** | **YES** | `createPaycoreClient.createOrder()` calls `POST /v1/orders` with HMAC-SHA256 request signature, idempotency key (`talira:checkout:${orderId}`), buyer phone/name, and server-authoritative amount. |
| **Hosted Checkout** | **YES** | Duitku POP hosted checkout URL returned via `checkout_url` from `POST /v1/orders`. |
| **Refund** | **NO** | Paycore does not provide refund endpoints or webhook handlers. Order model supports manual status `REFUNDED`, but no gateway API exists. |
| **Payment Status Query** | **YES** | `GET /v1/orders/:order_id` with HMAC-SHA256 signature. |
| **Webhook Delivery** | **YES** | Dispatches signed `payment.succeeded` events with `X-PayCore-Event-Timestamp` and `X-PayCore-Event-Signature`. |
| **Provider Event ID** | **YES** | Paycore sends unique `event_id` in payload (`evt_...`). Talira stores this in `provider_webhook_events` for receipt deduplication. |
| **Monthly / Yearly Subscription** | **NO** | Paycore has **no recurring billing engine**. Paycore only handles one-off discrete orders. Talira drives subscription renewal by creating a discrete order per billing cycle (`TALIRA_SOLO_MONTHLY` or `TALIRA_SOLO_YEARLY`). |
| **Subscription Cancel / Renewal / Past Due** | **NO** | Paycore has no lifecycle or dunning management. Talira manages `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, and `CANCELED` status locally via `PlanAccessService` with a 7-day grace window. |
| **Metered Billing** | **NO** | Not supported in Paycore. Talira enforces resource limits strictly on write paths (`maxPublishedPrograms`, `maxActiveLearners`, `maxContacts`) via plan gating. |
| **Account Balance / Invoice** | **NO** | Not supported in Paycore. Talira tracks platform fees in `platform_fee_entries` table. |
| **Manual Rp3.000 Fee Collection** | **NO** | Paycore does not collect or debit platform fees. Talira records flat Rp3.000 entries with status `BILLABLE` in `platform_fee_entries` for future ledger aggregation. |
| **Manual Bank** | **HELD** | Paycore only processes automated online payments. Talira domain strictly enforces `MANUAL_BANK_ENABLED = false (HELD)`. `approveOrder()` rejects Paycore orders with `FORBIDDEN` and manual bank orders with `FEATURE_DISABLED`. |

---

## 3. P0 & P1 Hardening Summary

1. **Paycore Config Fail-Closed**:
   - Implemented `validatePaycoreConfig(env, appEnv)`.
   - Forbidden placeholder blacklist rejects `secret_default`, `whsec_default`, `key_default`, and zero UUIDs fail-closed.
   - Production/staging strictly requires HTTPS and rejects localhost/127.0.0.1. Verified by 10 tests in `paycore-client.test.ts`.
2. **Durable Local Provider-Checkout Truth**:
   - Added `orderType: 'PROGRAM_PURCHASE' | 'SUBSCRIPTION_PURCHASE'` and `providerOrderId` in `commerce-orders.ts` and migration `0010`.
   - Local order persisted in database **before** calling Paycore. If Paycore throws, local order transitions to `FAILED` (no dangling or ghost records).
3. **Strict Webhook Reconciliation & Receipt Idempotency**:
   - Reconciles `data.app_id === deps.appUuid`, `data.order_id === order.providerOrderId`, `data.external_order_id === order.reference`, `data.amount === order.amount`, and `data.currency === 'IDR'`.
   - Durable receipt recorded atomically via `recordWebhookEvent()` in `provider_webhook_events`. Replaying 10 times consecutively produces 0 duplicate mutations.
4. **Subscription Replay Invariance**:
   - If an active `SOLO` subscription exists with valid `currentPeriodStart` and `currentPeriodEnd`, replay preserves canonical dates and never shifts the period into the future.
5. **Manual Bank HELD Domain Enforcement**:
   - `approveOrder()` rejects `PAYCORE` orders with `DomainError('FORBIDDEN')` (never manually approvable).
   - Rejects `MANUAL_BANK` orders with `DomainError('FEATURE_DISABLED')` while `MANUAL_BANK_ENABLED = false`.
6. **Canonical Paid Learner Access Handoff**:
   - Added `claimOrderAccess()` in `CommerceService` and endpoint `POST /api/v1/public/:slug/programs/:programSlug/orders/:reference/claim-access`.
   - Verifies buyer phone ownership (`normalizePhone(phone) === contact.phoneE164`), issues access token, and sets the secure `learner_session` cookie.
7. **Single Ownership of `learner.enrolled` & Race-Safe Creation**:
   - Removed duplicate event emission from `CommerceService`. Sole ownership resides in `EnrollmentService.enrollContactAndIssueAccess()`.
   - Uses `createIdempotent()` (`INSERT ON CONFLICT DO NOTHING`) so concurrent requests insert at most 1 enrollment and emit at most 1 event.
8. **Active Learner Usage Calculation Fixed**:
   - In `subscription-repository.ts`, counts distinct `contactId` where `enrollments.status IN ('ENROLLED', 'STARTED')`, properly excluding `COMPLETED` and `CANCELLED`.
9. **Plan Limits on All Write Paths**:
   - Enforced on program publish, paid enablement, CRM contact creation (`flow.post('/contacts')` & public registration), and storefront branding.
10. **Platform Fee Display Truth**:
    - Orders query joins `platform_fee_entries` and derives fee strictly from ledger truth (`status IN ('BILLABLE', 'BILLED') ? amount : 0`), never defaulting to 3000.
