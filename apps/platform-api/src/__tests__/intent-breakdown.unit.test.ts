import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateIntentScore, INTENT_LABELS } from '../domain/learning/intent-engine';
import { parseIntentBreakdown } from '../services/class/learning-engine-service';

describe('Intent breakdown canonical logic & parser', () => {
  it('defines INTENT_LABELS for all score breakdown keys', () => {
    assert.ok(INTENT_LABELS);
    assert.equal(INTENT_LABELS.enrollmentPoints, 'Terdaftar di program');
    assert.equal(INTENT_LABELS.firstLessonPoints, 'Mulai pelajaran pertama');
    assert.equal(INTENT_LABELS.progress50Points, 'Progres mencapai 50%');
    assert.equal(INTENT_LABELS.progress80Points, 'Progres mencapai 80%');
    assert.equal(INTENT_LABELS.completionPoints, 'Menyelesaikan program');
    assert.equal(INTENT_LABELS.ctaPoints, 'Mengklik ajakan (CTA)');
  });

  it('produces formatted breakdown with positive points and mapped labels', () => {
    const result = calculateIntentScore({
      isEnrolled: true,
      hasStarted: true,
      progressPercent: 100,
      hasClickedCta: true,
    });

    const breakdownItems = Object.entries(result.breakdown)
      .filter(([, points]) => (points as number) > 0)
      .map(([label, points]) => ({
        label: INTENT_LABELS[label] ?? label,
        points: points as number,
      }));

    assert.equal(breakdownItems.length, 6);
    assert.deepEqual(breakdownItems[0], { label: 'Terdaftar di program', points: 10 });
    assert.deepEqual(breakdownItems[1], { label: 'Mulai pelajaran pertama', points: 10 });
    assert.deepEqual(breakdownItems[2], { label: 'Progres mencapai 50%', points: 20 });
    assert.deepEqual(breakdownItems[3], { label: 'Progres mencapai 80%', points: 20 });
    assert.deepEqual(breakdownItems[4], { label: 'Menyelesaikan program', points: 20 });
    assert.deepEqual(breakdownItems[5], { label: 'Mengklik ajakan (CTA)', points: 20 });
  });

  it('parseIntentBreakdown handles array, JSON string, null, and malformed input', () => {
    const rawArray = [{ label: 'Terdaftar di program', points: 10 }];
    assert.deepEqual(parseIntentBreakdown(rawArray), rawArray);

    const jsonString = JSON.stringify(rawArray);
    assert.deepEqual(parseIntentBreakdown(jsonString), rawArray);

    assert.equal(parseIntentBreakdown(null), null);
    assert.equal(parseIntentBreakdown(undefined), null);
    assert.equal(parseIntentBreakdown(''), null);
    assert.equal(parseIntentBreakdown('{ "not": "an array" }'), null);
    assert.equal(parseIntentBreakdown('invalid json {['), null);
  });
});
