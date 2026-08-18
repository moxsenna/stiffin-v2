/**
 * Pure canonical intent scoring engine.
 * No I/O, no DB dependencies, no hidden new Date().
 */

export interface IntentScoringInput {
  isEnrolled?: boolean;
  hasStarted?: boolean; // Or completedLessonsCount > 0 or progressPercent > 0
  progressPercent: number;
  hasClickedCta?: boolean; // Binary: at least 1 CTA clicked = true
}

export interface IntentScoringResult {
  score: number;
  label: 'COLD' | 'WARM' | 'HOT';
  breakdown: {
    enrollmentPoints: number;
    firstLessonPoints: number;
    progress50Points: number;
    progress80Points: number;
    completionPoints: number;
    ctaPoints: number;
  };
}

/**
 * Calculates deterministic canonical intent score (0..100).
 *
 * Scoring Components:
 * - Enrollment:              +10
 * - First lesson completed:  +10
 * - 50% reached:             +20
 * - 80% reached:             +20
 * - Program completed:       +20
 * - CTA clicked (binary):    +20
 *
 * Maximum: 100
 *
 * Intent Labels:
 * - 0–39:   COLD
 * - 40–69:  WARM
 * - 70–100: HOT
 */
export function calculateIntentScore(input: IntentScoringInput): IntentScoringResult {
  const isEnrolled = input.isEnrolled !== false; // Default true if scoring an enrollment
  const enrollmentPoints = isEnrolled ? 10 : 0;

  const hasFirstLesson = input.hasStarted === true || input.progressPercent > 0;
  const firstLessonPoints = hasFirstLesson ? 10 : 0;

  const progress50Points = input.progressPercent >= 50 ? 20 : 0;
  const progress80Points = input.progressPercent >= 80 ? 20 : 0;
  const completionPoints = input.progressPercent >= 100 ? 20 : 0;

  const ctaPoints = input.hasClickedCta === true ? 20 : 0;

  const rawTotal =
    enrollmentPoints +
    firstLessonPoints +
    progress50Points +
    progress80Points +
    completionPoints +
    ctaPoints;

  const score = Math.min(100, Math.max(0, rawTotal));

  let label: 'COLD' | 'WARM' | 'HOT';
  if (score >= 70) {
    label = 'HOT';
  } else if (score >= 40) {
    label = 'WARM';
  } else {
    label = 'COLD';
  }

  return {
    score,
    label,
    breakdown: {
      enrollmentPoints,
      firstLessonPoints,
      progress50Points,
      progress80Points,
      completionPoints,
      ctaPoints,
    },
  };
}
