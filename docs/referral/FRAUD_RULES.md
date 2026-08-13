# Referral Anti-Fraud & Privacy Rules

> **DRAFT FOR B4.5**
> **NOT SHARED CONTRACT V1**

## 1. Privacy-Conscious Audit Data
Raw IP addresses are **never stored permanently** in production database schemas to uphold privacy compliance.
The system stores salted SHA-256 hashes:
- `networkFingerprintHash`: SHA-256 hash of IP subnet.
- `userAgentHash`: SHA-256 hash of browser UA header.
- `deviceClass`: Categorical classification (`MOBILE` | `DESKTOP` | `TABLET`).

Device or network similarity is treated as a **Risk Signal** for manual review, NOT an automated rejection reason (since family members sharing a home Wi-Fi are legitimate referral candidates).

## 2. Enumerable Fraud & Rejection Reasons

| Code | Trigger Condition | System Action |
|---|---|---|
| `SELF_REFERRAL` | `referrerContactId == referredContactId` or E.164 phone match | Rejection (`REJECTED`) |
| `DUPLICATE_ATTRIBUTION` | Contact already attributed under same `organizationId` + `referralProgramId` | Ignored |
| `REFERRER_INELIGIBLE` | Referrer account suspended or deleted | Rejection (`REJECTED`) |
| `REFERRAL_EXPIRED` | Conversion occurred after 30-day window | Expiry (`EXPIRED`) |
| `CONVERSION_CANCELLED` | Assessment booking cancelled or no-show | Reversal (`REVERSED`) |
| `PAYMENT_REFUNDED` | Paid program or assessment refunded within 7-day hold | Reversal (`REVERSED`) |
| `DEVICE_RISK` | High-frequency referral clicks from identical device hash | Manual Review |
| `MANUAL_REVIEW` | Promotor flagged transaction manually | Hold (`PENDING`) |

## 3. Self-Referral Prevention Logic
Self-referral check is executed canonically at B4.5 when contact identity is resolved:
```ts
function isSelfReferral(referrerContact: Contact, referredContact: Contact): boolean {
  if (referrerContact.id === referredContact.id) return true;
  if (referrerContact.phoneE164 === referredContact.phoneE164) return true;
  return false;
}
```
