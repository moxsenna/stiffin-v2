# Talira — Commercial Foundation: Billing, Paycore & Paid Class Commerce

## 1. Overview & Architecture

Talira operates on a unified subscription and commerce model for educational entrepreneurs and STIFIn promoters.

- **Unified Subscription**: One subscription includes both **Talira Class** (LMS, curriculum delivery, and student engagement) and **Talira Flow** (CRM, WhatsApp pipeline, and daily work queue).
- **Commerce Engine**: Direct-to-consumer monetization for educators via paid programs, powered by Paycore for secure payment gateway orchestration.
- **Platform Economics**: Flat **Rp3.000** fee per successful paid learner order. No percentage take rate.

```
                  +------------------------------------------------------+
                  |                   Talira Customer                    |
                  +--------------------------+---------------------------+
                                             |
                                    Chooses Plan / Buys Class
                                             |
                                             v
               +------------------------------------------------------------+
               |                  Platform API (Cloudflare)                 |
               |                                                            |
               |  - PlanAccessService (Free vs Solo limits)                 |
               |  - CommerceService (Order lifecycle & idempotency)         |
               |  - PaycoreClient (HMAC-SHA256 request & webhook auth)       |
               +-------------+-------------------------------+--------------+
                             |                               |
             Signs Request / Verifies Webhook       Persists Tenant Isolation
                             |                               |
                             v                               v
               +---------------------------+   +----------------------------+
               |      Paycore Gateway      |   |   Hyperdrive / Postgres    |
               |  (Duitku / QRIS / VA)     |   |                            |
               |                           |   | - organization_subs        |
               | - Signed Inbound Requests |   | - commerce_orders          |
               | - Webhook Event Delivery  |   | - payment_records          |
               +---------------------------+   | - platform_fee_entries     |
                                               +----------------------------+
```

---

## 2. Subscription Tiers & Product Catalog

Defined canonically in `packages/contracts/src/index.ts` via `TALIRA_PLANS`:

| Plan Code | Monthly Price | Annual Price | Operators | Published Programs | Active Learners | CRM Contacts | Paid Classes Allowed | Custom Branding |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FREE** | Rp 0 | Rp 0 | 1 | 1 | 50 | 250 | ❌ No | ❌ No |
| **SOLO** | Rp 149.000 | Rp 1.490.000 | 1 | 10 | 500 | 2.500 | ✅ Yes | ✅ Yes |
| **STUDIO** | *Reserved* | *Reserved* | *Reserved* | *Reserved* | *Reserved* | *Reserved* | *Reserved* | *Reserved* |

> **Note on STUDIO**: The STUDIO plan tier is reserved in code schemas for enterprise expansion, but is **NOT** launched for commercial general availability.

### Downgrade & Grace Period Semantics
1. If an account moves to `PAST_DUE`, a **7-day grace period** is granted before paid features lock.
2. Existing active learners **never** lose access to their enrolled courses upon promoter plan downgrade or subscription lapse.
3. If an organization exceeds published program limits upon downgrade, existing programs remain published, but new publications or paid program updates are rejected with `PLAN_LIMIT_REACHED`.

---

## 3. Database Schema & Migration (0010_talira_billing_and_commerce.sql)

The commercial ledger is stored across 5 dedicated PostgreSQL tables:

1. **`organization_subscriptions`**: Tracks promoter organization plan state (`FREE` or `SOLO`), billing cycle (`MONTHLY`, `YEARLY`, `NONE`), provider customer and subscription IDs, and period timestamps.
2. **`commerce_orders`**: Authoritative record of program purchases, tracking order reference (`TLR-XXXXXX`), buyer contact ID, program ID, integer IDR amount, payment mode, and fulfillment status (`PENDING`, `PAID`, `APPROVED`, `REJECTED`, `EXPIRED`, `REFUNDED`).
3. **`payment_records`**: Detailed payment processor transaction trace, linking the order to Paycore transaction IDs, provider payment methods, gross amounts, and processor fees.
4. **`platform_fee_entries`**: Platform monetization ledger. Records exactly **Rp3.000 flat** for every successful paid learner order. Strictly deduplicated by unique constraint on `idempotency_key = 'talira:fee:${order.id}'`. Status defaults to `BILLABLE`.
5. **`organization_bank_accounts`**: Promoter bank account details for direct payments.

All migration SQL files follow strict LF line ending semantics verified by canonical Git SHA-256 fingerprint tests.

---

## 4. Paycore Integration Protocol

The integration with Paycore is implemented in `apps/platform-api/src/services/paycore/paycore-client.ts`.

### A. App Request Authentication
Every outbound HTTP call to Paycore includes cryptographic signature headers:
```http
POST /api/v1/orders
X-PayCore-App: <app-uuid>
X-PayCore-Key-Id: <key-id>
X-PayCore-Timestamp: 1788350000
X-PayCore-Signature: sha256=<hmac_hex>
Idempotency-Key: <unique-key>
Content-Type: application/json
```
The signature is generated as:
$$\text{payload} = \text{timestamp} + "." + \text{method} + "." + \text{path} + "." + \text{sha256}(\text{body})$$
$$\text{signature} = \text{HMAC-SHA256}(\text{appSecret}, \text{payload})$$

### B. Inbound Webhook Verification
Paycore webhook deliveries are received at `/api/v1/webhooks/paycore`:
- Headers: `X-PayCore-Event-Timestamp`, `X-PayCore-Event-Signature`.
- Freshness check: Reject if clock skew exceeds 300 seconds.
- Verification payload: `${timestamp}.${rawBody}`.
- Constant-time verification using `crypto.subtle.verify` / `timingSafeEqual`.

### C. Concurrency & Idempotency Guarantees
If Paycore replays the same webhook event multiple times:
1. `commerce_orders` status transition to `PAID` is idempotent.
2. `enrollments` creation uses deduplication on `(organization_id, program_id, contact_id)`.
3. `learning_events` emits `learner.enrolled` exactly once.
4. `platform_fee_entries` enforces idempotency via unique constraint on `talira:fee:${order.id}`.

---

## 5. Paid Class Commerce & Bypass Closure

### Free-Enrollment Bypass Closed (P1)
In previous versions, public registration endpoints only checked if a program was published and had public access. In this batch, `enrollment-service.ts` strictly enforces:
```typescript
if (program.pricing === 'one_time') {
  throw new DomainError(
    'PAYMENT_REQUIRED',
    'Program ini berbayar dan memerlukan transaksi pembayaran sebelum pendaftaran'
  );
}
```
Attempting to invoke free registration on a paid class immediately returns HTTP 402 with structured payment metadata, and creates **0 contacts, 0 enrollments, and 0 events**.

### Server-Authoritative Pricing
The client cannot supply or alter the price. When a learner initiates checkout:
1. The server fetches the program from the database.
2. The server verifies that the promoter's plan allows paid programs (`canUsePaidPrograms`).
3. The server sets `amount = program.priceAmount` (integer IDR).
4. The server creates an order in `PENDING` status and requests a checkout session from Paycore.

---

## 6. Manual Bank Transfer Launch Decision

### Decision: `MANUAL BANK = HELD`

**Rationale:**
1. Under Talira's commercial model, Talira collects a flat Rp3.000 platform fee on every successful paid learner order.
2. For Paycore gateway orders, transaction settlement enables automated fee accounting and billing reconciliation.
3. For manual bank transfers (where a buyer transfers directly into a promoter's personal bank account), Paycore cannot reliably debit the Rp3.000 usage fee from the promoter at transaction time.
4. Enabling promoter manual approval without guaranteed fee collection would create uncollected fee deficits and reconciliation exposure.
5. Consequently, **Manual Bank transfer is held (disabled)** for general launch until promoter automated balance deduction or post-paid billing invoices are established in Paycore.
6. WhatsApp is designated as an **inquiry/sales channel**, not a payment rail.

---

## 7. Frontend User Experience Enhancements

### A. PromotorClass Navigation & Orders Dashboard (`/app/orders`)
- Promotor navigation now features **"Pesanan"** alongside Beranda, Program, Learner, Aktivitas, Storefront, and Pengaturan.
- Filtering by order status: *Semua*, *Menunggu Pembayaran*, *Berhasil*, and *Ditolak / Batal*.
- Metrics cards displaying Total Pesanan, Omzet Lunas (Rp), and Biaya Platform (Rp3.000 / transaksi).
- Detailed modal displaying buyer contact details (with direct WhatsApp chat link), order reference, payment provenance, and enrollment status.

### B. Account Settings & Plan Upgrade (`/app/settings`)
- Removed duplicate storefront settings from the Settings page.
- Added comprehensive **Kapasitas & Penggunaan Akun** panel tracking:
  - Program Terpublikasi (current / limit)
  - Peserta Belajar Aktif (current / limit)
  - Kontak CRM Terhubung (current / limit)
- Added dedicated **Upgrade ke Talira Solo** card with monthly/yearly switcher and 1-click Paycore checkout.

### C. Unified Public Storefront CTA
- When a program is free: Displays *"Daftar & Mulai Belajar Gratis →"*.
- When a program is paid (`one_time`): Displays *"Beli Sekarang — Rp [Harga] →"* with automated Paycore checkout redirection and secondary WhatsApp inquiry link.
- Synchronized canonical pricing in both Class landing page and Flow landing page.
