# Referral Domain Model Specification

> **DRAFT FOR B4.5**
> **NOT SHARED CONTRACT V1**

## 1. Domain Entities & Target Database Schemas

### `ReferralProgram`
Defines an active or draft referral campaign in an organization.
- `id` (`UUID`): Primary key.
- `organizationId` (`UUID`): Owning tenant/organization.
- `name` (`VARCHAR`): Campaign title (e.g., *"Ajak Teman Tes STIFIn 2026"*).
- `status` (`ENUM`): `"DRAFT" | "ACTIVE" | "PAUSED" | "ENDED"`.
- `targetType` (`ENUM`): `"PROGRAM" | "ASSESSMENT" | "ANY_ELIGIBLE_CONVERSION"`.
- `targetId` (`UUID`, optional): Associated program or assessment ID.
- `qualificationRule` (`ENUM`): `"REGISTRATION" | "PROGRAM_COMPLETED" | "PAID_PURCHASE" | "ASSESSMENT_COMPLETED"`.
- `attributionWindowDays` (`INT`): Default 30 days.
- `rewardHoldDays` (`INT`): Default 7 days.
- `referrerRewardRule` (`JSONB`): Configuration for referrer benefit.
- `refereeRewardRule` (`JSONB`): Configuration for referee benefit.
- `startsAt` / `endsAt` (`TIMESTAMP`): Program lifecycle window.

### `ReferralCode`
Canonical referral link identifier assigned to a learner contact.
- `id` (`UUID`): Primary key.
- `organizationId` (`UUID`): Tenant ID.
- `referralProgramId` (`UUID`): Owning referral program.
- `contactId` (`UUID`): Referrer learner contact ID.
- `code` (`VARCHAR`, Unique): Case-insensitive short code (e.g. `7X9K4Q`).
- `createdAt` (`TIMESTAMP`): Code generation time.
- `revokedAt` (`TIMESTAMP`, optional): Revocation timestamp.

### `ReferralVisit`
Captures anonymous impression click before registration.
- `id` (`UUID`): Primary key.
- `referralCodeId` (`UUID`): Associated referral code.
- `networkFingerprintHash` (`VARCHAR`): SHA-256 hash of network subnet.
- `userAgentHash` (`VARCHAR`): SHA-256 hash of browser UA.
- `deviceClass` (`VARCHAR`): `"MOBILE" | "DESKTOP" | "TABLET"`.
- `landingPath` (`VARCHAR`): Target URL path.
- `capturedAt` / `expiresAt` (`TIMESTAMP`).

### `ReferralAttribution`
Links a referrer contact with a referred contact under a specific referral program.
- `id` (`UUID`): Primary key.
- `organizationId` (`UUID`): Tenant ID.
- `referralProgramId` (`UUID`): Referral campaign.
- `referralCodeId` (`UUID`): Referral code used.
- `referrerContactId` (`UUID`): Referrer contact.
- `referredContactId` (`UUID`): Referred contact.
- `status` (`ENUM`): `"PENDING" | "QUALIFIED" | "REJECTED" | "EXPIRED"`.
- `createdAt` (`TIMESTAMP`).

### `ReferralConversion`
Records qualifying conversion events emitted from PromotorClass or PromotorFlow.
- `id` (`UUID`): Primary key.
- `organizationId` (`UUID`): Tenant ID.
- `attributionId` (`UUID`): Parent attribution.
- `conversionType` (`ENUM`): `"FREE_ENROLLMENT" | "PAID_PROGRAM_PURCHASE" | "ASSESSMENT_COMPLETED"`.
- `sourceApp` (`ENUM`): `"PROMOTORCLASS" | "PROMOTORFLOW"`.
- `sourceEntityId` (`VARCHAR`): Foreign key to enrollment or booking.
- `amount` (`NUMERIC`, optional): Transaction value.
- `currency` (`VARCHAR`): `"IDR"`.
- `status` (`ENUM`): `"ENGAGED" | "PENDING_QUALIFICATION" | "QUALIFIED" | "REVERSED"`.
- `idempotencyKey` (`VARCHAR`, Unique).
- `convertedAt` / `qualifiedAt` / `reversedAt` (`TIMESTAMP`).

### `ReferralReward`
Tracks tangible benefit issued to referrer or referee.
- `id` (`UUID`): Primary key.
- `conversionId` (`UUID`): Parent conversion.
- `beneficiaryContactId` (`UUID`): Recipient contact ID.
- `beneficiaryRole` (`ENUM`): `"REFERRER" | "REFEREE"`.
- `rewardType` (`ENUM`): `"BONUS_ACCESS" | "DISCOUNT_COUPON" | "COMMISSION"`.
- `status` (`ENUM`): `"PENDING" | "APPROVED" | "ISSUED" | "REDEEMED" | "CANCELLED"`.
- `rewardValue` (`NUMERIC`, optional): Discount percentage or coupon amount.
- `rewardProgramId` (`UUID`, optional): Program ID unlocked if `BONUS_ACCESS`.
- `approvedAt` / `issuedAt` / `redeemedAt` / `cancelledAt` (`TIMESTAMP`).
