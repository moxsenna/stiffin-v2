# B4.5 Referral Foundation Implementation Notes

> **DRAFT FOR B4.5**
> **NOT SHARED CONTRACT V1**

## 1. Migration Strategy from R0 Prototype to B4.5 Production
In Milestone R0, the frontend includes high-fidelity UI routes (`/learn/referral`, `/app/referrals`) wired to `MockReferralRepository` with deterministic read-only fixture projections. Zero state is written to `MockStateStore`.

When backend Milestone B4.5 is ready:
1. Create PostgreSQL / Drizzle ORM migrations for Referral tables (`ReferralProgram`, `ReferralCode`, `ReferralVisit`, `ReferralAttribution`, `ReferralConversion`, `ReferralReward`).
2. Add Platform API handlers in backend.
3. In `apps/promotor-class-web`, create `HttpReferralRepositoryAdapter` implementing `ReferralRepositoryPort`.
4. Swap the adapter binding in `modules/referrals/queries.ts`:
   ```ts
   // From:
   // import { referralRepository } from '@/adapters/mock/referral-repository';
   // To:
   // import { referralRepository } from '@/adapters/http/referral-repository';
   ```
5. Remove prototype feature flag restriction and reveal live referral entry points in production navigation.

## 2. Event Consumption Boundaries
Platform Referral Domain consumes facts from:
- `PROMOTORCLASS`: `EnrollmentCreated` (creates `ENGAGED` conversion), `PaidProgramPurchased` (qualifies conversion).
- `PROMOTORFLOW`: `AssessmentBookingCompleted` + `PaymentPaid` (qualifies conversion).

No cross-application database dependencies are introduced.
