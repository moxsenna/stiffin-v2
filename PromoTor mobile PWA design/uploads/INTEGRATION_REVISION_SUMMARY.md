# Integration Revision Summary

**Date:** 2026-08-12

## New binding document

- `INTEGRATION_CONTRACT.md`

## Revised PromotorFlow

- `PromotorFlow_PRD_V0.1_REVISED.md`
- `PromotorFlow_architecture_REVISED.md`
- `PromotorFlow_IMPLEMENTATION_PLAN_REVISED.md`
- `PromotorFlow_Design_Plan_REVISED.md`

## Revised PromotorClass

- `PromotorClass_PRD_V0.1_REVISED.md`
- `PromotorClass_architecture_REVISED.md`
- `PromotorClass_Implementation_Plan_V0.1_REVISED.md`

The uploaded PromotorClass design plan was intentionally not rewritten because its existing cross-app UI rule is already aligned: integration is contextual, actionable, and secondary.

## Locked architectural changes

1. Shared Core owns canonical `organizations`, `users`, `contacts`.
2. Canonical phone identity is E.164 (`+628...`).
3. PromotorFlow is the only owner of canonical `next_actions`.
4. PromotorClass uses `learning_signals` + `integration_outbox`, not a second NextAction table.
5. Class → Flow adapter is explicit.
6. Flow → Class reverse adapter is explicit.
7. Flow adds `Service.category` + generalized `AssessmentStatus`.
8. Class learning events remain canonical in Class.
9. Selected meaningful learning context may be projected to Flow Activity.
10. Cross-app mutations require authorization, runtime validation and idempotency.
