import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateProgramProgress } from '../domain/learning/progress-engine';
import { calculateIntentScore } from '../domain/learning/intent-engine';

describe('B5 — Pure Learning & Intent Engines', () => {
  describe('1. Progress Engine (calculateProgramProgress)', () => {
    it('returns 100% and COMPLETED when total lessons is 0', () => {
      const result = calculateProgramProgress([], new Set());
      assert.strictEqual(result.progressPercent, 100);
      assert.strictEqual(result.learningStatus, 'COMPLETED');
      assert.strictEqual(result.isComplete, true);
      assert.strictEqual(result.reached50, true);
      assert.strictEqual(result.reached80, true);
      assert.strictEqual(result.reached100, true);
    });

    it('calculates 0% and NOT_STARTED when no lessons are completed', () => {
      const allLessons = ['l1', 'l2', 'l3', 'l4'];
      const result = calculateProgramProgress(allLessons, new Set());
      assert.strictEqual(result.progressPercent, 0);
      assert.strictEqual(result.learningStatus, 'NOT_STARTED');
      assert.strictEqual(result.isComplete, false);
      assert.strictEqual(result.reached50, false);
      assert.strictEqual(result.reached80, false);
      assert.strictEqual(result.reached100, false);
    });

    it('calculates 50% and IN_PROGRESS with reached50 flag', () => {
      const allLessons = ['l1', 'l2', 'l3', 'l4'];
      const completed = new Set(['l1', 'l2']);
      const result = calculateProgramProgress(allLessons, completed);
      assert.strictEqual(result.progressPercent, 50);
      assert.strictEqual(result.learningStatus, 'IN_PROGRESS');
      assert.strictEqual(result.isComplete, false);
      assert.strictEqual(result.reached50, true);
      assert.strictEqual(result.reached80, false);
      assert.strictEqual(result.reached100, false);
    });

    it('calculates 75% and IN_PROGRESS', () => {
      const allLessons = ['l1', 'l2', 'l3', 'l4'];
      const completed = new Set(['l1', 'l2', 'l3']);
      const result = calculateProgramProgress(allLessons, completed);
      assert.strictEqual(result.progressPercent, 75);
      assert.strictEqual(result.learningStatus, 'IN_PROGRESS');
      assert.strictEqual(result.reached50, true);
      assert.strictEqual(result.reached80, false);
      assert.strictEqual(result.reached100, false);
    });

    it('calculates 100% and COMPLETED when all lessons completed', () => {
      const allLessons = ['l1', 'l2', 'l3', 'l4'];
      const completed = new Set(['l1', 'l2', 'l3', 'l4']);
      const result = calculateProgramProgress(allLessons, completed);
      assert.strictEqual(result.progressPercent, 100);
      assert.strictEqual(result.learningStatus, 'COMPLETED');
      assert.strictEqual(result.isComplete, true);
      assert.strictEqual(result.reached50, true);
      assert.strictEqual(result.reached80, true);
      assert.strictEqual(result.reached100, true);
    });
  });

  describe('2. Intent Scoring Engine (calculateIntentScore)', () => {
    const now = new Date('2026-08-18T12:00:00Z');

    it('returns COLD (score 0) for zero activity', () => {
      const res = calculateIntentScore({
        progressPercent: 0,
        submittedReflectionsCount: 0,
        ctaClicksCount: 0,
        now,
      });
      assert.strictEqual(res.score, 0);
      assert.strictEqual(res.label, 'COLD');
      assert.strictEqual(res.breakdown.progressPoints, 0);
      assert.strictEqual(res.breakdown.reflectionPoints, 0);
      assert.strictEqual(res.breakdown.ctaPoints, 0);
      assert.strictEqual(res.breakdown.recencyPoints, 0);
    });

    it('calculates WARM for moderate engagement with reflection and progress', () => {
      const res = calculateIntentScore({
        progressPercent: 50, // 20 pts
        submittedReflectionsCount: 1, // 15 pts
        ctaClicksCount: 0,
        lastActivityAt: '2026-08-18T10:00:00Z', // +10 recency
        now,
      });
      // 20 + 15 + 0 + 10 = 45 -> WARM
      assert.strictEqual(res.score, 45);
      assert.strictEqual(res.label, 'WARM');
    });

    it('calculates HOT (score >= 80) for high progress + reflections + CTA clicks', () => {
      const res = calculateIntentScore({
        progressPercent: 100, // 40 pts
        submittedReflectionsCount: 2, // 30 pts (max 30)
        ctaClicksCount: 1, // 20 pts
        lastActivityAt: '2026-08-18T10:00:00Z', // 10 pts
        now,
      });
      // 40 + 30 + 20 + 10 = 100 -> HOT
      assert.strictEqual(res.score, 100);
      assert.strictEqual(res.label, 'HOT');
    });

    it('clamps intent score strictly between 0 and 100', () => {
      const res = calculateIntentScore({
        progressPercent: 150,
        submittedReflectionsCount: 10,
        ctaClicksCount: 10,
        lastActivityAt: '2026-08-18T11:00:00Z',
        now,
      });
      assert.strictEqual(res.score, 100);
      assert.strictEqual(res.label, 'HOT');
    });
  });
});
