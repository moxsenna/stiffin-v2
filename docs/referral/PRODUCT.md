# Referral Product Specification

> **DRAFT FOR B4.5**
> **NOT SHARED CONTRACT V1**

## 1. Overview & Vision
The Stiffin v2 Referral System enables enrolled learners (*Referrers*) to invite friends, family, and parents (*Referees*) to explore STIFIn educational programs and assessments. 

The primary business acquisition loop is:
```text
Learner (Ayu)
↓ Shares referral link (e.g. rina.id/p/7-hari-mengenal-cara-belajar-anak?ref=AYU7X9)
Prospect (Budi) visits link & enrolls in Free Lead Magnet Program
↓ Status = ENGAGED (No reward yet)
Prospect completes paid STIFIn Assessment / Paid E-Course
↓ Status = QUALIFIED (7-day reward hold period)
Reward APPROVED & ISSUED (Discount Coupon / Bonus Program Access)
```

## 2. User Roles & Experiences

### A. Learner Experience (`/learn/referral`)
- **Location**: Accessed via **Profil** tab (`/learn/profile` $\rightarrow$ *Referral & Reward*).
- **Referral Code & Link**: Unique short code (e.g., `7X9K4Q`) with copy link button and direct WhatsApp sharing template:
  > *"Halo! Saya ikut program edukasi STIFIn di Rina Prameswari. Kamu bisa ikut belajar gratis di link ini: https://rina.id/p/7-hari-mengenal-cara-belajar-anak?ref=7X9K4Q"*
- **Progress Dashboard**: 
  - Total Teman Diajak ($N$)
  - Status Terdaftar / Engaged ($N$)
  - Status Qualified ($N$)
  - Reward Claimed / Active Progress
- **Masked History Table**: Displays referee first name with privacy masking (e.g., `Budi S••••`), date, status, and reward status.

### B. Promotor Experience (`/app/referrals`)
- **Location**: Accessed via **Lainnya** tab (`/app/settings` $\rightarrow$ *Program Referral*).
- **Program Overview**: Active campaign configuration, total visits, conversion funnel metrics.
- **Top Referrers Leaderboard**: Lists learners with highest engaged and qualified conversions.
- **Fraud & Risk Audit**: Flagged attributions (e.g., self-referral attempts, duplicate phone numbers, device risk signals).
- **Reward Status Management**: Monitoring pending hold periods (D+7) and issued coupons/bonus program accesses.

## 3. Qualification Lifecycle

| Stage | Trigger Event | Status | Reward Action |
|---|---|---|---|
| 1. Visit | Clicks `?ref=CODE` link | `CAPTURED` | None |
| 2. Free Enrollment | Prospect registers for free program | `ENGAGED` | None |
| 3. Qualification | Prospect completes paid assessment / paid program | `QUALIFIED` | Holds for 7 days (`rewardHoldDays`) |
| 4. Maturity | 7 days pass without cancellation/refund | `APPROVED` | Issues Reward (`BONUS_ACCESS` / `DISCOUNT_COUPON`) |
| 5. Reversal | Cancellation / Refund / Fraud detection | `REVERSED` | Revokes pending reward |
