import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateProgramProgress } from '../domain/learning/progress-engine';
import { calculateIntentScore } from '../domain/learning/intent-engine';
import { calculateLearningStatus } from '../domain/learning/learning-status-engine';
import { validateReflectionSubmission } from '../domain/learning/reflection-validator';

describe('V0.1 Hardened — Pure Learning & Intent Engines', () => {
  describe('1. Canonical Progress Engine (calculateProgramProgress)', () => {
    it('returns 0% and isComplete=false when total required lessons is 0 (fail-safe §9)', () => {
      const result = calculateProgramProgress([], new Set());
      assert.strictEqual(result.progressPercent, 0);
      assert.strictEqual(result.learningStatus, 'NOT_STARTED');
      assert.strictEqual(result.isComplete, false);
      assert.strictEqual(result.reached50, false);
      assert.strictEqual(result.reached80, false);
      assert.strictEqual(result.reached100, false);
    });

    it('calculates 0% and NOT_STARTED when no lessons are completed', () => {
      const lessons = [
        { lessonId: 'l1', isRequired: true },
        { lessonId: 'l2', isRequired: true },
        { lessonId: 'l3', isRequired: true },
        { lessonId: 'l4', isRequired: true },
      ];
      const result = calculateProgramProgress(lessons, new Set());
      assert.strictEqual(result.progressPercent, 0);
      assert.strictEqual(result.learningStatus, 'NOT_STARTED');
      assert.strictEqual(result.isComplete, false);
      assert.strictEqual(result.reached50, false);
      assert.strictEqual(result.reached80, false);
      assert.strictEqual(result.reached100, false);
    });

    it('calculates 50% and IN_PROGRESS with reached50 flag', () => {
      const lessons = [
        { lessonId: 'l1', isRequired: true },
        { lessonId: 'l2', isRequired: true },
        { lessonId: 'l3', isRequired: true },
        { lessonId: 'l4', isRequired: true },
      ];
      const completed = new Set(['l1', 'l2']);
      const result = calculateProgramProgress(lessons, completed);
      assert.strictEqual(result.progressPercent, 50);
      assert.strictEqual(result.learningStatus, 'IN_PROGRESS');
      assert.strictEqual(result.isComplete, false);
      assert.strictEqual(result.reached50, true);
      assert.strictEqual(result.reached80, false);
      assert.strictEqual(result.reached100, false);
    });

    it('calculates 75% and IN_PROGRESS with reached50 flag', () => {
      const lessons = [
        { lessonId: 'l1', isRequired: true },
        { lessonId: 'l2', isRequired: true },
        { lessonId: 'l3', isRequired: true },
        { lessonId: 'l4', isRequired: true },
      ];
      const completed = new Set(['l1', 'l2', 'l3']);
      const result = calculateProgramProgress(lessons, completed);
      assert.strictEqual(result.progressPercent, 75);
      assert.strictEqual(result.learningStatus, 'IN_PROGRESS');
      assert.strictEqual(result.reached50, true);
      assert.strictEqual(result.reached80, false);
      assert.strictEqual(result.reached100, false);
    });

    it('calculates 100% and COMPLETED when all REQUIRED lessons are completed', () => {
      const lessons = [
        { lessonId: 'l1', isRequired: true },
        { lessonId: 'l2', isRequired: true },
        { lessonId: 'l3', isRequired: true },
        { lessonId: 'l4', isRequired: true },
      ];
      const completed = new Set(['l1', 'l2', 'l3', 'l4']);
      const result = calculateProgramProgress(lessons, completed);
      assert.strictEqual(result.progressPercent, 100);
      assert.strictEqual(result.learningStatus, 'COMPLETED');
      assert.strictEqual(result.isComplete, true);
      assert.strictEqual(result.reached50, true);
      assert.strictEqual(result.reached80, true);
      assert.strictEqual(result.reached100, true);
    });

    it('ignores optional lessons for program completion (§8)', () => {
      const lessons = [
        { lessonId: 'l1', isRequired: true },
        { lessonId: 'l2', isRequired: true },
        { lessonId: 'l3_optional', isRequired: false },
      ];
      // Completing only l1 and l2 gives 100% completion
      const completed = new Set(['l1', 'l2']);
      const result = calculateProgramProgress(lessons, completed);
      assert.strictEqual(result.progressPercent, 100);
      assert.strictEqual(result.learningStatus, 'COMPLETED');
      assert.strictEqual(result.isComplete, true);
      assert.strictEqual(result.completedRequiredLessonsCount, 2);
      assert.strictEqual(result.totalRequiredLessonsCount, 2);
    });
  });

  describe('2. Canonical Intent Engine (§18)', () => {
    it('returns score 10 (COLD) for enrollment base', () => {
      const res = calculateIntentScore({
        isEnrolled: true,
        hasStarted: false,
        progressPercent: 0,
        hasClickedCta: false,
      });
      assert.strictEqual(res.score, 10);
      assert.strictEqual(res.label, 'COLD');
      assert.strictEqual(res.breakdown.enrollmentPoints, 10);
      assert.strictEqual(res.breakdown.firstLessonPoints, 0);
    });

    it('returns score 20 (COLD) when first lesson is completed', () => {
      const res = calculateIntentScore({
        isEnrolled: true,
        hasStarted: true,
        progressPercent: 25,
        hasClickedCta: false,
      });
      // 10 (enrolled) + 10 (first lesson) = 20
      assert.strictEqual(res.score, 20);
      assert.strictEqual(res.label, 'COLD');
    });

    it('returns score 40 (WARM) when 50% milestone is reached', () => {
      const res = calculateIntentScore({
        isEnrolled: true,
        hasStarted: true,
        progressPercent: 50,
        hasClickedCta: false,
      });
      // 10 + 10 + 20 (50% milestone) = 40 -> WARM
      assert.strictEqual(res.score, 40);
      assert.strictEqual(res.label, 'WARM');
    });

    it('returns score 60 (WARM) when 80% milestone is reached', () => {
      const res = calculateIntentScore({
        isEnrolled: true,
        hasStarted: true,
        progressPercent: 80,
        hasClickedCta: false,
      });
      // 10 + 10 + 20 + 20 = 60 -> WARM
      assert.strictEqual(res.score, 60);
      assert.strictEqual(res.label, 'WARM');
    });

    it('returns score 80 (HOT) when program is 100% completed', () => {
      const res = calculateIntentScore({
        isEnrolled: true,
        hasStarted: true,
        progressPercent: 100,
        hasClickedCta: false,
      });
      // 10 + 10 + 20 + 20 + 20 = 80 -> HOT
      assert.strictEqual(res.score, 80);
      assert.strictEqual(res.label, 'HOT');
    });

    it('adds +20 binary CTA clicked component and caps strictly at 100', () => {
      const res = calculateIntentScore({
        isEnrolled: true,
        hasStarted: true,
        progressPercent: 100,
        hasClickedCta: true,
      });
      // 10 + 10 + 20 + 20 + 20 + 20 = 100 -> HOT
      assert.strictEqual(res.score, 100);
      assert.strictEqual(res.label, 'HOT');
    });
  });

  describe('3. Learning Status Engine (§19)', () => {
    const now = new Date('2026-08-20T12:00:00Z');

    it('returns COMPLETED for 100% progress', () => {
      const status = calculateLearningStatus({
        progressPercent: 100,
        lifecycleStatus: 'COMPLETED',
        now,
      });
      assert.strictEqual(status, 'COMPLETED');
    });

    it('returns NOT_STARTED for 0% progress and ENROLLED status', () => {
      const status = calculateLearningStatus({
        progressPercent: 0,
        lifecycleStatus: 'ENROLLED',
        now,
      });
      assert.strictEqual(status, 'NOT_STARTED');
    });

    it('returns IN_PROGRESS for active progress', () => {
      const status = calculateLearningStatus({
        progressPercent: 25,
        lifecycleStatus: 'STARTED',
        lastActivityAt: '2026-08-18T12:00:00Z',
        now,
      });
      assert.strictEqual(status, 'IN_PROGRESS');
    });

    it('returns AT_RISK for inactivity > 7 days and progress < 50', () => {
      const status = calculateLearningStatus({
        progressPercent: 30,
        lifecycleStatus: 'STARTED',
        lastActivityAt: '2026-08-10T12:00:00Z', // 10 days ago
        now,
      });
      assert.strictEqual(status, 'AT_RISK');
    });
  });

  describe('4. Reflection Validator (§17)', () => {
    it('validates long_text correctly', () => {
      const config = { reflectionType: 'long_text' };
      assert.strictEqual(validateReflectionSubmission(config, { responseText: 'Insight' }).isValid, true);
      assert.strictEqual(validateReflectionSubmission(config, { responseText: '' }).isValid, false);
    });

    it('validates single_select against allowed options', () => {
      const config = {
        reflectionType: 'single_select',
        reflectionOptions: [{ id: 'opt1', label: 'Option 1' }, { id: 'opt2', label: 'Option 2' }],
      };
      assert.strictEqual(validateReflectionSubmission(config, { responseText: 'opt1' }).isValid, true);
      assert.strictEqual(validateReflectionSubmission(config, { responseText: 'invalid' }).isValid, false);
    });

    it('validates multi_select against allowed options', () => {
      const config = {
        reflectionType: 'multi_select',
        reflectionOptions: [{ id: 'opt1', label: 'Option 1' }, { id: 'opt2', label: 'Option 2' }],
      };
      assert.strictEqual(validateReflectionSubmission(config, { selectedOptions: ['opt1', 'opt2'] }).isValid, true);
      assert.strictEqual(validateReflectionSubmission(config, { selectedOptions: ['opt1', 'unknown'] }).isValid, false);
      assert.strictEqual(validateReflectionSubmission(config, { selectedOptions: [] }).isValid, false);
    });
  });
});
