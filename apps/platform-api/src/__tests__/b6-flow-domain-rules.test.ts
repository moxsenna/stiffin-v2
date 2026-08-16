import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FLOW_STAGES,
  FLOW_CLASSIFICATIONS,
  isLifecycleStage,
  isClassification,
  resolveClassification,
  evaluateStageTransition,
  type FlowStage,
  type FlowClassification,
} from '../domain/contact-lifecycle';

import {
  NEXT_ACTION_TYPES,
  BASE_PRIORITIES,
  AFTERCARE_OUTCOMES,
  isNextActionType,
  isAftercareOutcome,
  getLocalCalendarDate,
  getNextLocalDay10Am,
  getInstantForZonedDateTime,
  calculateContactLeadRule,
  calculateFollowUpRule,
  calculateRemindPaymentRule,
  calculateConfirmBookingRule,
  calculateRemindBookingRule,
  calculateAftercareRule,
  buildAftercareIdempotencyKey,
  calculateSkipNextStepRule,
  calculateClassFallbackDueRule,
  calculateAftercareFollowOnRule,
} from '../domain/next-action-rules';

import {
  calculateEffectivePriority,
  comparePrimaryCandidate,
  selectPrimaryAction,
} from '../domain/priority';

import { groupTodayActions } from '../domain/today-grouping';

import {
  ASSESSMENT_RANKED_STATUSES,
  ASSESSMENT_STATUS_RANKS,
  isAssessmentRankedStatus,
  assessmentEvidenceRank,
  shouldApplyAssessmentEvidence,
  resolveAssessmentPrecedence,
  selectHighestAssessmentEvidence,
  type AssessmentRankedStatus,
} from '../domain/assessment';

import {
  ACTIVITY_EVENT_TYPES,
  ACTIVITY_EVENT_COUNT,
  ACTIVITY_PROJECTION_KEYS,
  isActivityEventType,
  getActivityProjectionKey,
} from '../domain/activity-catalog';

describe('B6 PR 4 — Pure Domain Rules Test Suite', () => {
  // =========================================================================
  // 1. Contact Lifecycle Rules
  // =========================================================================
  describe('1. Contact Lifecycle Pure Domain Rules', () => {
    it('supports full operator-directed transition matrix across all 7 stages (no strict funnel)', () => {
      for (const fromStage of FLOW_STAGES) {
        for (const toStage of FLOW_STAGES) {
          const decision = evaluateStageTransition({
            currentStage: fromStage,
            targetStage: toStage,
            currentClassification: 'PROSPECT',
            lostReason: toStage === 'LOST' ? 'Price too high' : undefined,
          });

          assert.strictEqual(decision.ok, true, `Transition ${fromStage} -> ${toStage} must be allowed`);
          if (decision.ok) {
            assert.strictEqual(decision.targetStage, toStage);
            assert.strictEqual(decision.stageChanged, fromStage !== toStage);
          }
        }
      }
    });

    it('validates canonical stage transitions explicitly', () => {
      // NEW -> INTERESTED
      const t1 = evaluateStageTransition({ currentStage: 'NEW', targetStage: 'INTERESTED' });
      assert.strictEqual(t1.ok, true);
      if (t1.ok) {
        assert.strictEqual(t1.targetStage, 'INTERESTED');
        assert.strictEqual(t1.stageChanged, true);
        assert.deepStrictEqual(t1.triggers, ['ENSURE_FOLLOW_UP_IF_NONE']);
      }

      // NEW -> COMPLETED (direct jump)
      const t2 = evaluateStageTransition({ currentStage: 'NEW', targetStage: 'COMPLETED' });
      assert.strictEqual(t2.ok, true);
      if (t2.ok) {
        assert.strictEqual(t2.targetStage, 'COMPLETED');
        assert.strictEqual(t2.resolvedClassification, 'CLIENT');
        assert.strictEqual(t2.isClientPromoted, true);
      }

      // INTERESTED -> BOOKED
      const t3 = evaluateStageTransition({ currentStage: 'INTERESTED', targetStage: 'BOOKED' });
      assert.strictEqual(t3.ok, true);
      if (t3.ok) {
        assert.strictEqual(t3.targetStage, 'BOOKED');
        assert.deepStrictEqual(t3.triggers, []);
      }

      // COMPLETED -> FOLLOW_UP
      const t4 = evaluateStageTransition({
        currentStage: 'COMPLETED',
        targetStage: 'FOLLOW_UP',
        currentClassification: 'CLIENT',
      });
      assert.strictEqual(t4.ok, true);
      if (t4.ok) {
        assert.strictEqual(t4.targetStage, 'FOLLOW_UP');
        assert.strictEqual(t4.resolvedClassification, 'CLIENT'); // Sticky CLIENT
      }

      // LOST -> INTERESTED (reactivation)
      const t5 = evaluateStageTransition({
        currentStage: 'LOST',
        targetStage: 'INTERESTED',
        lostReason: 'Was previously lost',
      });
      assert.strictEqual(t5.ok, true);
      if (t5.ok) {
        assert.strictEqual(t5.targetStage, 'INTERESTED');
        assert.strictEqual(t5.persistedLostReason, null); // Leaving LOST clears reason
        assert.deepStrictEqual(t5.triggers, ['ENSURE_FOLLOW_UP_IF_NONE']);
      }
    });

    it('enforces non-empty lostReason when transitioning to LOST', () => {
      // Missing lostReason
      const fail1 = evaluateStageTransition({ currentStage: 'NEW', targetStage: 'LOST' });
      assert.strictEqual(fail1.ok, false);
      if (!fail1.ok) {
        assert.strictEqual(fail1.errorReason, 'LOST_REASON_REQUIRED');
      }

      // Null lostReason
      const fail2 = evaluateStageTransition({ currentStage: 'NEW', targetStage: 'LOST', lostReason: null });
      assert.strictEqual(fail2.ok, false);
      if (!fail2.ok) {
        assert.strictEqual(fail2.errorReason, 'LOST_REASON_REQUIRED');
      }

      // Whitespace-only lostReason
      const fail3 = evaluateStageTransition({ currentStage: 'NEW', targetStage: 'LOST', lostReason: '   \t\n  ' });
      assert.strictEqual(fail3.ok, false);
      if (!fail3.ok) {
        assert.strictEqual(fail3.errorReason, 'LOST_REASON_REQUIRED');
      }

      // Valid trimmed lostReason
      const success = evaluateStageTransition({
        currentStage: 'NEW',
        targetStage: 'LOST',
        lostReason: '  Budget constraints  ',
      });
      assert.strictEqual(success.ok, true);
      if (success.ok) {
        assert.strictEqual(success.persistedLostReason, 'Budget constraints');
        assert.deepStrictEqual(success.triggers, ['CANCEL_PENDING_ACTIONS']);
      }
    });

    it('automatically clears lostReason when transitioning away from LOST', () => {
      const decision = evaluateStageTransition({
        currentStage: 'LOST',
        targetStage: 'CONTACTED',
        lostReason: 'Should be cleared',
      });
      assert.strictEqual(decision.ok, true);
      if (decision.ok) {
        assert.strictEqual(decision.persistedLostReason, null);
      }
    });

    it('enforces sticky CLIENT classification (never auto-demotes)', () => {
      // PROSPECT + INTERESTED -> PROSPECT
      const p1 = resolveClassification('PROSPECT', 'INTERESTED');
      assert.strictEqual(p1.classification, 'PROSPECT');
      assert.strictEqual(p1.isPromoted, false);

      // PROSPECT + COMPLETED -> promotes to CLIENT
      const p2 = resolveClassification('PROSPECT', 'COMPLETED');
      assert.strictEqual(p2.classification, 'CLIENT');
      assert.strictEqual(p2.isPromoted, true);

      // null (default) + COMPLETED -> promotes to CLIENT
      const p3 = resolveClassification(null, 'COMPLETED');
      assert.strictEqual(p3.classification, 'CLIENT');
      assert.strictEqual(p3.isPromoted, true);

      // CLIENT + FOLLOW_UP -> remains CLIENT
      const p4 = resolveClassification('CLIENT', 'FOLLOW_UP');
      assert.strictEqual(p4.classification, 'CLIENT');
      assert.strictEqual(p4.isPromoted, false);

      // CLIENT + LOST -> remains CLIENT
      const p5 = resolveClassification('CLIENT', 'LOST');
      assert.strictEqual(p5.classification, 'CLIENT');
      assert.strictEqual(p5.isPromoted, false);

      // CLIENT + NEW -> remains CLIENT
      const p6 = resolveClassification('CLIENT', 'NEW');
      assert.strictEqual(p6.classification, 'CLIENT');
      assert.strictEqual(p6.isPromoted, false);
    });

    it('fires stage-entry triggers only on actual stage changes', () => {
      // Entering CONTACTED -> PROMPT_FOLLOW_UP_OPTIONS
      const tContacted = evaluateStageTransition({ currentStage: 'NEW', targetStage: 'CONTACTED' });
      assert.strictEqual(tContacted.ok, true);
      if (tContacted.ok) {
        assert.deepStrictEqual(tContacted.triggers, ['PROMPT_FOLLOW_UP_OPTIONS']);
      }

      // Entering INTERESTED -> ENSURE_FOLLOW_UP_IF_NONE
      const tInterested = evaluateStageTransition({ currentStage: 'CONTACTED', targetStage: 'INTERESTED' });
      assert.strictEqual(tInterested.ok, true);
      if (tInterested.ok) {
        assert.deepStrictEqual(tInterested.triggers, ['ENSURE_FOLLOW_UP_IF_NONE']);
      }

      // Entering LOST -> CANCEL_PENDING_ACTIONS
      const tLost = evaluateStageTransition({
        currentStage: 'INTERESTED',
        targetStage: 'LOST',
        lostReason: 'Not interested',
      });
      assert.strictEqual(tLost.ok, true);
      if (tLost.ok) {
        assert.deepStrictEqual(tLost.triggers, ['CANCEL_PENDING_ACTIONS']);
      }

      // Re-selecting same stage -> no entry trigger
      const sameContacted = evaluateStageTransition({ currentStage: 'CONTACTED', targetStage: 'CONTACTED' });
      assert.strictEqual(sameContacted.ok, true);
      if (sameContacted.ok) {
        assert.strictEqual(sameContacted.stageChanged, false);
        assert.deepStrictEqual(sameContacted.triggers, []);
      }

      const sameInterested = evaluateStageTransition({ currentStage: 'INTERESTED', targetStage: 'INTERESTED' });
      assert.strictEqual(sameInterested.ok, true);
      if (sameInterested.ok) {
        assert.strictEqual(sameInterested.stageChanged, false);
        assert.deepStrictEqual(sameInterested.triggers, []);
      }

      const sameLost = evaluateStageTransition({
        currentStage: 'LOST',
        targetStage: 'LOST',
        lostReason: 'Still lost',
      });
      assert.strictEqual(sameLost.ok, true);
      if (sameLost.ok) {
        assert.strictEqual(sameLost.stageChanged, false);
        assert.deepStrictEqual(sameLost.triggers, []);
      }
    });

    it('rejects invalid target stages with INVALID_STAGE', () => {
      const invalid = evaluateStageTransition({
        currentStage: 'NEW',
        targetStage: 'UNKNOWN_STAGE' as any,
      });
      assert.strictEqual(invalid.ok, false);
      if (!invalid.ok) {
        assert.strictEqual(invalid.errorReason, 'INVALID_STAGE');
      }
    });

    it('provides accurate lifecycle stage and classification guards', () => {
      assert.strictEqual(isLifecycleStage('NEW'), true);
      assert.strictEqual(isLifecycleStage('CONTACTED'), true);
      assert.strictEqual(isLifecycleStage('INTERESTED'), true);
      assert.strictEqual(isLifecycleStage('FOLLOW_UP'), true);
      assert.strictEqual(isLifecycleStage('BOOKED'), true);
      assert.strictEqual(isLifecycleStage('COMPLETED'), true);
      assert.strictEqual(isLifecycleStage('LOST'), true);
      assert.strictEqual(isLifecycleStage('UNKNOWN'), false);
      assert.strictEqual(isLifecycleStage(null), false);

      assert.strictEqual(isClassification('PROSPECT'), true);
      assert.strictEqual(isClassification('CLIENT'), true);
      assert.strictEqual(isClassification('LEAD'), false);
      assert.strictEqual(isClassification(undefined), false);
    });
  });

  // =========================================================================
  // 2. NextAction Timing & Calculation Rules
  // =========================================================================
  describe('2. NextAction Pure Timing & Calculation Rules', () => {
    it('NA-001 CONTACT_LEAD: due now + 2 hours, priority 75', () => {
      const now = new Date('2026-08-17T08:00:00.000Z');
      const rule = calculateContactLeadRule(now);

      assert.strictEqual(rule.actionType, 'CONTACT_LEAD');
      assert.strictEqual(rule.priority, 75);
      assert.strictEqual(rule.dueAt.toISOString(), '2026-08-17T10:00:00.000Z');
    });

    it('NA-003 FOLLOW_UP: next local day at 10:00 in organization timezone, priority 70', () => {
      // Test Asia/Jakarta rollover from canonical plan example:
      // now: 2026-08-16T18:30:00.000Z (= 2026-08-17 01:30 Jakarta)
      // next local day: 2026-08-18 10:00 Jakarta = 2026-08-18T03:00:00.000Z
      const now = new Date('2026-08-16T18:30:00.000Z');
      const ruleJakarta = calculateFollowUpRule(now, 'Asia/Jakarta');

      assert.strictEqual(ruleJakarta.actionType, 'FOLLOW_UP');
      assert.strictEqual(ruleJakarta.priority, 70);
      assert.strictEqual(ruleJakarta.dueAt.toISOString(), '2026-08-18T03:00:00.000Z');

      // Test UTC timezone:
      // now: 2026-08-16T18:30:00.000Z (= Aug 16 in UTC)
      // next local day: 2026-08-17 10:00 UTC = 2026-08-17T10:00:00.000Z
      const ruleUtc = calculateFollowUpRule(now, 'UTC');
      assert.strictEqual(ruleUtc.dueAt.toISOString(), '2026-08-17T10:00:00.000Z');

      // Test America/New_York (EDT UTC-4):
      // now: 2026-08-16T18:30:00.000Z (= Aug 16 14:30 New York)
      // next local day: 2026-08-17 10:00 EDT = 2026-08-17T14:00:00.000Z
      const ruleNy = calculateFollowUpRule(now, 'America/New_York');
      assert.strictEqual(ruleNy.dueAt.toISOString(), '2026-08-17T14:00:00.000Z');
    });

    it('NA-005 REMIND_PAYMENT: min(now + 2h, bookingStart - 1d), priority 85', () => {
      const now = new Date('2026-08-17T10:00:00.000Z');

      // Case A: booking is 5 days away -> now + 2h (2026-08-17T12:00:00Z) is smaller than bookingStart - 1d (2026-08-21T10:00:00Z)
      const distantBooking = new Date('2026-08-22T10:00:00.000Z');
      const ruleA = calculateRemindPaymentRule(now, distantBooking);
      assert.strictEqual(ruleA.actionType, 'REMIND_PAYMENT');
      assert.strictEqual(ruleA.priority, 85);
      assert.strictEqual(ruleA.dueAt.toISOString(), '2026-08-17T12:00:00.000Z');

      // Case B: booking is 25 hours away -> bookingStart - 1d (2026-08-17T11:00:00Z) is smaller than now + 2h (2026-08-17T12:00:00Z)
      const nearBooking = new Date('2026-08-18T11:00:00.000Z');
      const ruleB = calculateRemindPaymentRule(now, nearBooking);
      assert.strictEqual(ruleB.dueAt.toISOString(), '2026-08-17T11:00:00.000Z');
    });

    it('NA-005b CONFIRM_BOOKING: due booking start, priority 90', () => {
      const bookingStart = new Date('2026-08-20T14:00:00.000Z');
      const rule = calculateConfirmBookingRule(bookingStart);

      assert.strictEqual(rule.actionType, 'CONFIRM_BOOKING');
      assert.strictEqual(rule.priority, 90);
      assert.strictEqual(rule.dueAt.toISOString(), '2026-08-20T14:00:00.000Z');
    });

    it('NA-006 REMIND_BOOKING: start < now + 24h -> now, else start - 24h, priority 90', () => {
      const now = new Date('2026-08-17T10:00:00.000Z');

      // Case A: booking is 3 days away (start >= now + 24h) -> start - 24h
      const futureBooking = new Date('2026-08-20T10:00:00.000Z');
      const ruleA = calculateRemindBookingRule(now, futureBooking);
      assert.strictEqual(ruleA.actionType, 'REMIND_BOOKING');
      assert.strictEqual(ruleA.priority, 90);
      assert.strictEqual(ruleA.dueAt.toISOString(), '2026-08-19T10:00:00.000Z');

      // Case B: booking is 12 hours away (start < now + 24h) -> due = now
      const soonBooking = new Date('2026-08-17T22:00:00.000Z');
      const ruleB = calculateRemindBookingRule(now, soonBooking);
      assert.strictEqual(ruleB.dueAt.toISOString(), '2026-08-17T10:00:00.000Z');

      // Case C: exactly 24 hours away -> start - 24h === now
      const exact24hBooking = new Date('2026-08-18T10:00:00.000Z');
      const ruleC = calculateRemindBookingRule(now, exact24hBooking);
      assert.strictEqual(ruleC.dueAt.toISOString(), '2026-08-17T10:00:00.000Z');
    });

    it('NA-009 AFTERCARE: completedAt + 7 days, priority 50, exact idempotency key', () => {
      const completedAt = new Date('2026-08-17T15:00:00.000Z');
      const bookingId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

      const rule = calculateAftercareRule(completedAt, bookingId);
      assert.strictEqual(rule.actionType, 'AFTERCARE');
      assert.strictEqual(rule.priority, 50);
      assert.strictEqual(rule.dueAt.toISOString(), '2026-08-24T15:00:00.000Z');
      assert.strictEqual(rule.idempotencyKey, `aftercare:booking:${bookingId}:d7`);
      assert.strictEqual(buildAftercareIdempotencyKey(bookingId), `aftercare:booking:${bookingId}:d7`);
    });

    it('Skip Next Step: requires nextStep, preserves explicit dueAt or falls back to next local day 10:00', () => {
      const now = new Date('2026-08-17T08:00:00.000Z');
      const timeZone = 'Asia/Jakarta';

      // 1. Missing nextStep -> NEXT_STEP_REQUIRED
      const fail1 = calculateSkipNextStepRule({ nextStep: null }, now, timeZone);
      assert.strictEqual(fail1.ok, false);
      if (!fail1.ok) {
        assert.strictEqual(fail1.errorReason, 'NEXT_STEP_REQUIRED');
      }

      // 2. Invalid action type -> NEXT_STEP_REQUIRED
      const fail2 = calculateSkipNextStepRule({ nextStep: { type: 'INVALID' as any } }, now, timeZone);
      assert.strictEqual(fail2.ok, false);
      if (!fail2.ok) {
        assert.strictEqual(fail2.errorReason, 'NEXT_STEP_REQUIRED');
      }

      // 3. Explicit dueAt -> preserved exactly
      const explicitDue = '2026-08-25T14:30:00.000Z';
      const success1 = calculateSkipNextStepRule(
        {
          nextStep: {
            type: 'FOLLOW_UP',
            title: 'Call back next week',
            dueAt: explicitDue,
          },
        },
        now,
        timeZone
      );
      assert.strictEqual(success1.ok, true);
      if (success1.ok) {
        assert.strictEqual(success1.actionType, 'FOLLOW_UP');
        assert.strictEqual(success1.priority, 70);
        assert.strictEqual(success1.title, 'Call back next week');
        assert.strictEqual(success1.dueAt.toISOString(), explicitDue);
      }

      // 4. Absent dueAt -> next local day 10:00
      const success2 = calculateSkipNextStepRule(
        {
          nextStep: {
            type: 'CONTACT_LEAD',
            title: 'Retry lead contact',
          },
        },
        now,
        timeZone
      );
      assert.strictEqual(success2.ok, true);
      if (success2.ok) {
        assert.strictEqual(success2.actionType, 'CONTACT_LEAD');
        assert.strictEqual(success2.priority, 75);
        assert.strictEqual(success2.dueAt.toISOString(), getNextLocalDay10Am(now, timeZone).toISOString());
      }
    });

    it('Class signal fallback rule: next local day 10:00, default priorities', () => {
      const now = new Date('2026-08-17T08:00:00.000Z');
      const timeZone = 'Asia/Jakarta';

      const ruleFollowUp = calculateClassFallbackDueRule(now, timeZone, 'FOLLOW_UP');
      assert.strictEqual(ruleFollowUp.actionType, 'FOLLOW_UP');
      assert.strictEqual(ruleFollowUp.priority, 70);
      assert.strictEqual(ruleFollowUp.dueAt.toISOString(), getNextLocalDay10Am(now, timeZone).toISOString());

      const ruleManual = calculateClassFallbackDueRule(now, timeZone, 'MANUAL');
      assert.strictEqual(ruleManual.actionType, 'MANUAL');
      assert.strictEqual(ruleManual.priority, 40);
      assert.strictEqual(ruleManual.dueAt.toISOString(), getNextLocalDay10Am(now, timeZone).toISOString());
    });

    it('Aftercare Follow-ons: CONTACT_LATER (+30d), INTERESTED_NEXT_SESSION (+3d), NO_NEED/HAS_QUESTION (null)', () => {
      const completedAt = new Date('2026-08-17T12:00:00.000Z');

      // CONTACT_LATER -> MANUAL, +30 days, priority 40
      const followOnLater = calculateAftercareFollowOnRule('CONTACT_LATER', completedAt);
      assert.ok(followOnLater);
      assert.strictEqual(followOnLater.actionType, 'MANUAL');
      assert.strictEqual(followOnLater.priority, 40);
      assert.strictEqual(followOnLater.dueAt.toISOString(), '2026-09-16T12:00:00.000Z');

      // INTERESTED_NEXT_SESSION -> FOLLOW_UP, +3 days, priority 70
      const followOnNext = calculateAftercareFollowOnRule('INTERESTED_NEXT_SESSION', completedAt);
      assert.ok(followOnNext);
      assert.strictEqual(followOnNext.actionType, 'FOLLOW_UP');
      assert.strictEqual(followOnNext.priority, 70);
      assert.strictEqual(followOnNext.dueAt.toISOString(), '2026-08-20T12:00:00.000Z');

      // NO_NEED -> null
      const noNeed = calculateAftercareFollowOnRule('NO_NEED', completedAt);
      assert.strictEqual(noNeed, null);

      // HAS_QUESTION -> null
      const hasQuestion = calculateAftercareFollowOnRule('HAS_QUESTION', completedAt);
      assert.strictEqual(hasQuestion, null);
    });

    it('validates NextAction types, priorities, and aftercare outcome guards', () => {
      assert.strictEqual(NEXT_ACTION_TYPES.length, 7);
      for (const t of NEXT_ACTION_TYPES) {
        assert.strictEqual(isNextActionType(t), true);
        assert.strictEqual(typeof BASE_PRIORITIES[t], 'number');
        assert.ok(BASE_PRIORITIES[t] >= 1 && BASE_PRIORITIES[t] <= 100);
      }
      assert.strictEqual(isNextActionType('INVALID_TYPE'), false);

      assert.strictEqual(AFTERCARE_OUTCOMES.length, 4);
      for (const o of AFTERCARE_OUTCOMES) {
        assert.strictEqual(isAftercareOutcome(o), true);
      }
      assert.strictEqual(isAftercareOutcome('NOT_AN_OUTCOME'), false);
    });
  });

  // =========================================================================
  // 3. Priority & Primary Selection Rules
  // =========================================================================
  describe('3. Priority & Primary Selection Pure Rules', () => {
    it('calculates effective priority with exact 24h/72h boundary behavior', () => {
      const now = new Date('2026-08-17T12:00:00.000Z');

      // 1. Not overdue (due in future) -> base priority
      const futureDue = new Date('2026-08-18T12:00:00.000Z');
      assert.strictEqual(calculateEffectivePriority(70, futureDue, now), 70);

      // 2. Exactly on time (due === now) -> base priority
      assert.strictEqual(calculateEffectivePriority(70, now, now), 70);

      // 3. Overdue 12h (<= 24h) -> base priority
      const due12hAgo = new Date('2026-08-17T00:00:00.000Z');
      assert.strictEqual(calculateEffectivePriority(70, due12hAgo, now), 70);

      // 4. Exactly 24h overdue (now - due === 24h) -> base priority
      const due24hAgo = new Date('2026-08-16T12:00:00.000Z');
      assert.strictEqual(calculateEffectivePriority(70, due24hAgo, now), 70);

      // 5. Just over 24h overdue (24h + 1ms) -> base + 10 = 80
      const due24h1msAgo = new Date('2026-08-16T11:59:59.999Z');
      assert.strictEqual(calculateEffectivePriority(70, due24h1msAgo, now), 80);

      // 6. Overdue 48h (> 24h and <= 72h) -> base + 10 = 80
      const due48hAgo = new Date('2026-08-15T12:00:00.000Z');
      assert.strictEqual(calculateEffectivePriority(70, due48hAgo, now), 80);

      // 7. Exactly 72h overdue (now - due === 72h) -> base + 10 = 80
      const due72hAgo = new Date('2026-08-14T12:00:00.000Z');
      assert.strictEqual(calculateEffectivePriority(70, due72hAgo, now), 80);

      // 8. Just over 72h overdue (72h + 1ms) -> base + 10 + 20 = 100
      const due72h1msAgo = new Date('2026-08-14T11:59:59.999Z');
      assert.strictEqual(calculateEffectivePriority(70, due72h1msAgo, now), 100);

      // 9. Overdue 5 days (> 72h) on high base priority (90) -> 90 + 30 = 120 (uncapped, can exceed 100)
      const due5dAgo = new Date('2026-08-12T12:00:00.000Z');
      assert.strictEqual(calculateEffectivePriority(90, due5dAgo, now), 120);
    });

    it('compares primary candidates deterministically (effective priority > earliest dueAt > oldest createdAt)', () => {
      const now = new Date('2026-08-17T12:00:00.000Z');

      // Rule 1: Highest effective priority wins even if due later
      const highPri = { id: 'high', priority: 90, dueAt: '2026-08-18T10:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' }; // eff = 90
      const lowPri = { id: 'low', priority: 50, dueAt: '2026-08-16T10:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' }; // eff = 60
      assert.ok(comparePrimaryCandidate(highPri, lowPri, now) < 0, 'High priority must precede low priority');

      // Rule 2: Overdue boost can surpass a higher base priority
      const base70Overdue4d = { id: 'overdue', priority: 70, dueAt: '2026-08-13T10:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' }; // eff = 70 + 30 = 100
      const base90Fresh = { id: 'fresh', priority: 90, dueAt: '2026-08-17T10:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' }; // eff = 90
      assert.ok(comparePrimaryCandidate(base70Overdue4d, base90Fresh, now) < 0, 'Overdue boosted must precede');

      // Rule 3: Equal effective priority -> earliest dueAt wins
      const dueEarlier = { id: 'earlier', priority: 70, dueAt: '2026-08-17T09:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' };
      const dueLater = { id: 'later', priority: 70, dueAt: '2026-08-17T15:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' };
      assert.ok(comparePrimaryCandidate(dueEarlier, dueLater, now) < 0, 'Earlier dueAt must precede later dueAt');

      // Rule 4: Equal effective priority & equal dueAt -> oldest createdAt wins
      const olderCreated = {
        id: 'older',
        priority: 70,
        dueAt: '2026-08-17T10:00:00.000Z',
        createdAt: '2026-08-10T10:00:00.000Z',
      };
      const newerCreated = {
        id: 'newer',
        priority: 70,
        dueAt: '2026-08-17T10:00:00.000Z',
        createdAt: '2026-08-15T10:00:00.000Z',
      };
      assert.ok(comparePrimaryCandidate(olderCreated, newerCreated, now) < 0, 'Older createdAt must precede');

      // Rule 5: Complete tie returns 0 (stable)
      const identical1 = {
        id: 'id1',
        priority: 70,
        dueAt: '2026-08-17T10:00:00.000Z',
        createdAt: '2026-08-15T10:00:00.000Z',
      };
      const identical2 = {
        id: 'id2',
        priority: 70,
        dueAt: '2026-08-17T10:00:00.000Z',
        createdAt: '2026-08-15T10:00:00.000Z',
      };
      assert.strictEqual(comparePrimaryCandidate(identical1, identical2, now), 0);
    });

    it('selects single primary action deterministically from candidate list', () => {
      const now = new Date('2026-08-17T12:00:00.000Z');

      const candidates = [
        { id: 'c1', priority: 50, dueAt: '2026-08-17T10:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' },
        { id: 'c2', priority: 70, dueAt: '2026-08-17T15:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' },
        { id: 'c3', priority: 70, dueAt: '2026-08-17T09:00:00.000Z', createdAt: '2026-08-15T10:00:00.000Z' }, // Winner
        { id: 'c4', priority: 70, dueAt: '2026-08-17T09:00:00.000Z', createdAt: '2026-08-16T10:00:00.000Z' },
      ];

      const primary = selectPrimaryAction(candidates, now);
      assert.ok(primary);
      assert.strictEqual(primary.id, 'c3');

      // Empty candidates returns null
      assert.strictEqual(selectPrimaryAction([], now), null);
    });
  });

  // =========================================================================
  // 4. Today Grouping Rules
  // =========================================================================
  describe('4. Today Grouping Pure Domain Rules', () => {
    it('groups items into overdue, today, upcoming with Asia/Jakarta UTC rollover verification', () => {
      // Canonical test case:
      // now: 2026-08-16T18:30:00.000Z (= 2026-08-17 01:30 in Asia/Jakarta)
      // Calendar date in Jakarta: 2026-08-17
      const now = '2026-08-16T18:30:00.000Z';
      const timeZone = 'Asia/Jakarta';

      const items = [
        // 1. Due 2026-08-16 23:00 Jakarta (2026-08-16T16:00:00Z) -> OVERDUE
        { id: 'overdue-1', dueAt: '2026-08-16T16:00:00.000Z' },
        // 2. Due 2026-08-16 23:59:59.999 Jakarta -> OVERDUE (yesterday boundary)
        { id: 'overdue-boundary', dueAt: '2026-08-16T16:59:59.999Z' },
        // 3. Due 2026-08-17 00:00:00.000 Jakarta (2026-08-16T17:00:00Z) -> TODAY (exact start boundary)
        { id: 'today-start-boundary', dueAt: '2026-08-16T17:00:00.000Z' },
        // 4. Due 2026-08-17 00:30 Jakarta (2026-08-16T17:30:00Z) -> TODAY
        { id: 'today-middle', dueAt: '2026-08-16T17:30:00.000Z' },
        // 5. Due 2026-08-17 23:59:59.999 Jakarta -> TODAY (end of today boundary)
        { id: 'today-end-boundary', dueAt: '2026-08-17T16:59:59.999Z' },
        // 6. Due 2026-08-18 00:00:00.000 Jakarta (2026-08-17T17:00:00Z) -> UPCOMING (tomorrow start boundary)
        { id: 'upcoming-start-boundary', dueAt: '2026-08-17T17:00:00.000Z' },
        // 7. Due 2026-08-18 10:00 Jakarta (2026-08-18T03:00:00Z) -> UPCOMING
        { id: 'upcoming-later', dueAt: '2026-08-18T03:00:00.000Z' },
      ];

      const result = groupTodayActions(items, now, timeZone);

      assert.strictEqual(result.date, '2026-08-17');
      assert.deepStrictEqual(result.overdue.map((i) => i.id), ['overdue-1', 'overdue-boundary']);
      assert.deepStrictEqual(result.today.map((i) => i.id), ['today-start-boundary', 'today-middle', 'today-end-boundary']);
      assert.deepStrictEqual(result.upcoming.map((i) => i.id), ['upcoming-start-boundary', 'upcoming-later']);
    });

    it('groups correctly in UTC timezone', () => {
      const now = '2026-08-17T12:00:00.000Z';
      const timeZone = 'UTC';

      const items = [
        { id: 'od', dueAt: '2026-08-16T23:59:59.999Z' }, // Overdue
        { id: 'td1', dueAt: '2026-08-17T00:00:00.000Z' }, // Today start
        { id: 'td2', dueAt: '2026-08-17T23:59:59.999Z' }, // Today end
        { id: 'up', dueAt: '2026-08-18T00:00:00.000Z' }, // Upcoming start
      ];

      const res = groupTodayActions(items, now, timeZone);
      assert.strictEqual(res.date, '2026-08-17');
      assert.deepStrictEqual(res.overdue.map((i) => i.id), ['od']);
      assert.deepStrictEqual(res.today.map((i) => i.id), ['td1', 'td2']);
      assert.deepStrictEqual(res.upcoming.map((i) => i.id), ['up']);
    });
  });

  // =========================================================================
  // 5. Assessment Precedence Rules
  // =========================================================================
  describe('5. Assessment Evidence Precedence Pure Rules', () => {
    it('ranks statuses in strict canonical order: COMPLETED (4) > SCHEDULED (3) > CANCELLED (2) > NOT_STARTED (1)', () => {
      assert.strictEqual(assessmentEvidenceRank('NOT_STARTED'), 1);
      assert.strictEqual(assessmentEvidenceRank('CANCELLED'), 2);
      assert.strictEqual(assessmentEvidenceRank('SCHEDULED'), 3);
      assert.strictEqual(assessmentEvidenceRank('COMPLETED'), 4);
    });

    it('exhaustively satisfies the full 4x4 precedence matrix', () => {
      const statuses: AssessmentRankedStatus[] = ['NOT_STARTED', 'CANCELLED', 'SCHEDULED', 'COMPLETED'];

      for (const current of statuses) {
        for (const incoming of statuses) {
          const currentRank = ASSESSMENT_STATUS_RANKS[current];
          const incomingRank = ASSESSMENT_STATUS_RANKS[incoming];
          const shouldApply = incomingRank >= currentRank;
          const expected = shouldApply ? incoming : current;

          assert.strictEqual(
            shouldApplyAssessmentEvidence(current, incoming),
            shouldApply,
            `shouldApplyAssessmentEvidence(${current}, ${incoming}) should be ${shouldApply}`
          );

          assert.strictEqual(
            resolveAssessmentPrecedence(current, incoming),
            expected,
            `resolveAssessmentPrecedence(${current}, ${incoming}) should yield ${expected}`
          );
        }
      }
    });

    it('selects highest assessment evidence from multiple inputs', () => {
      assert.strictEqual(selectHighestAssessmentEvidence('CANCELLED', 'COMPLETED', 'SCHEDULED'), 'COMPLETED');
      assert.strictEqual(selectHighestAssessmentEvidence('NOT_STARTED', 'CANCELLED'), 'CANCELLED');
      assert.strictEqual(selectHighestAssessmentEvidence('SCHEDULED', 'NOT_STARTED', 'CANCELLED'), 'SCHEDULED');
      assert.strictEqual(selectHighestAssessmentEvidence(), 'NOT_STARTED');
    });

    it('provides accurate assessment status guard and excludes UNKNOWN and prototype keys from pure ranking', () => {
      assert.strictEqual(isAssessmentRankedStatus('NOT_STARTED'), true);
      assert.strictEqual(isAssessmentRankedStatus('CANCELLED'), true);
      assert.strictEqual(isAssessmentRankedStatus('SCHEDULED'), true);
      assert.strictEqual(isAssessmentRankedStatus('COMPLETED'), true);

      assert.strictEqual(isAssessmentRankedStatus('UNKNOWN'), false, 'UNKNOWN must be excluded from pure ranking');
      assert.strictEqual(isAssessmentRankedStatus('toString'), false, 'toString prototype key must be rejected');
      assert.strictEqual(isAssessmentRankedStatus('constructor'), false, 'constructor prototype key must be rejected');
      assert.strictEqual(isAssessmentRankedStatus('__proto__'), false, '__proto__ prototype key must be rejected');
      assert.strictEqual(isAssessmentRankedStatus('random'), false, 'random string must be rejected');
      assert.strictEqual(isAssessmentRankedStatus(''), false, 'empty string must be rejected');
      assert.strictEqual(isAssessmentRankedStatus(null), false);
      assert.strictEqual(isAssessmentRankedStatus(undefined), false);
    });
  });

  // =========================================================================
  // 6. Activity Catalog & Taxonomy
  // =========================================================================
  describe('6. Activity Catalog & Taxonomy Pure Rules', () => {
    it('contains exactly 21 canonical activity event types', () => {
      assert.strictEqual(ACTIVITY_EVENT_COUNT, 21);
      assert.strictEqual(ACTIVITY_EVENT_TYPES.length, 21);

      // Verify no duplicates
      const set = new Set(ACTIVITY_EVENT_TYPES);
      assert.strictEqual(set.size, 21);
    });

    it('maps every event type to a unique, non-empty projection key', () => {
      const keysSeen = new Set<string>();

      for (const eventType of ACTIVITY_EVENT_TYPES) {
        const key = getActivityProjectionKey(eventType);
        assert.ok(key, `Event ${eventType} must have a projection key`);
        assert.strictEqual(typeof key, 'string');
        assert.ok(key.length > 0, `Projection key for ${eventType} cannot be empty`);
        assert.strictEqual(ACTIVITY_PROJECTION_KEYS[eventType], key);
        assert.ok(!keysSeen.has(key), `Duplicate projection key ${key} for ${eventType}`);
        keysSeen.add(key);
      }

      assert.strictEqual(keysSeen.size, 21);
    });

    it('validates activity event type guards', () => {
      for (const eventType of ACTIVITY_EVENT_TYPES) {
        assert.strictEqual(isActivityEventType(eventType), true);
      }

      assert.strictEqual(isActivityEventType('INVALID_EVENT_TYPE'), false);
      assert.strictEqual(isActivityEventType(''), false);
      assert.strictEqual(isActivityEventType(null), false);
      assert.strictEqual(isActivityEventType(undefined), false);
    });
  });

  // =========================================================================
  // 7. Pure Domain Hard Boundary & Guardrail Assertions
  // =========================================================================
  describe('7. Pure Domain Architecture Guardrails', () => {
    it('ensures all domain files are 100% pure (no IO, no DB, no repositories, no process.env)', () => {
      const currentDir = fileURLToPath(new URL('.', import.meta.url));
      const domainDir = path.resolve(currentDir, '../domain');
      const files = fs.readdirSync(domainDir).filter((f) => f.endsWith('.ts'));

      assert.strictEqual(files.length, 6, 'Exactly 6 pure domain modules must exist in src/domain/');

      const forbiddenImportPatterns = [
        /from\s+['"].*\/db['"]/i,
        /from\s+['"].*\/repositories['"]/i,
        /from\s+['"].*\/services['"]/i,
        /from\s+['"]drizzle-orm['"]/i,
        /from\s+['"]pg['"]/i,
        /from\s+['"]hono['"]/i,
      ];

      const forbiddenKeywordPatterns = [
        /\bprocess\.env\b/,
        /\bDATABASE_URL\b/,
        /\bTEST_DATABASE_URL\b/,
      ];

      for (const file of files) {
        const filePath = path.join(domainDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        for (const pattern of forbiddenImportPatterns) {
          assert.ok(
            !pattern.test(content),
            `File ${file} violates pure-domain boundary: contains forbidden import matching ${pattern}`
          );
        }

        for (const pattern of forbiddenKeywordPatterns) {
          assert.ok(
            !pattern.test(content),
            `File ${file} violates pure-domain boundary: contains forbidden keyword matching ${pattern}`
          );
        }
      }
    });

    it('confirms classification.ts was NOT created', () => {
      const currentDir = fileURLToPath(new URL('.', import.meta.url));
      const classificationPath = path.resolve(currentDir, '../domain/classification.ts');
      assert.strictEqual(fs.existsSync(classificationPath), false, 'classification.ts must NOT exist');
    });
  });
});
