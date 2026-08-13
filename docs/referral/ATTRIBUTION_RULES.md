# Referral Attribution Rules

> **DRAFT FOR B4.5**
> **NOT SHARED CONTRACT V1**

## 1. Core Rule: First Valid Referral Wins
In Stiffin v2, attribution follows **First Touch Attribution** per campaign:
```text
UNIQUE Constraint:
(organizationId, referralProgramId, referredContactId)
```

- If prospect Budi clicks Referrer Ayu's link (`ref=AYU7X9`) and later clicks Referrer Nina's link (`ref=NINA123`) within 30 days, **Ayu remains the sole attributed referrer** for that campaign.
- Nina's subsequent link click will be ignored for attribution creation.

## 2. 30-Day Attribution Window
- The attribution window is **30 days** from initial URL click.
- Production B4.5 will store first-party attribution cookies and backend click records with `expiresAt = capturedAt + 30 days`.
- In R0 Frontend Prototype, URL parsing (`?ref=CODE`) simulates transient presentation capture only, without mutating Contacts or Enrollments.

## 3. Contact Identification & Single Attribution
- Attribution occurs when Referred Contact identity becomes known (registration form submission).
- Phone numbers normalized to **E.164** (`+628...`) serve as canonical identity matching.
- An existing contact who has already enrolled in an organization cannot be re-attributed as a new referral for the same program.
