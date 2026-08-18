/**
 * Pure intent scoring engine.
 * No I/O, no DB dependencies.
 */

export interface IntentScoringInput {
  progressPercent: number;
  submittedReflectionsCount: number;
  ctaClicksCount: number;
  lastActivityAt?: string | null;
  now?: Date;
}

export interface IntentScoringResult {
  score: number;
  label: 'COLD' | 'WARM' | 'HOT';
  breakdown: {
    progressPoints: number;
    reflectionPoints: number;
    ctaPoints: number;
    recencyPoints: number;
  };
}

export function calculateIntentScore(input: IntentScoringInput): IntentScoringResult {
  const now = input.now ?? new Date();

  // 1. Progress points (max 40)
  const clampedProgress = Math.min(100, Math.max(0, input.progressPercent));
  const progressPoints = Math.round(clampedProgress * 0.4);

  // 2. Reflection points (max 30, 15 pts per reflection)
  const reflectionPoints = Math.min(30, Math.max(0, input.submittedReflectionsCount * 15));

  // 3. CTA points (max 30, 20 pts per CTA clicked)
  const ctaPoints = Math.min(30, Math.max(0, input.ctaClicksCount * 20));

  // 4. Recency bonus (+10 pts if active in last 3 days)
  let recencyPoints = 0;
  if (input.lastActivityAt) {
    const actTime = new Date(input.lastActivityAt).getTime();
    const diffDays = (now.getTime() - actTime) / (1000 * 60 * 60 * 24);
    if (diffDays >= 0 && diffDays <= 3) {
      recencyPoints = 10;
    }
  }

  const rawTotal = progressPoints + reflectionPoints + ctaPoints + recencyPoints;
  const score = Math.min(100, Math.max(0, rawTotal));

  let label: 'COLD' | 'WARM' | 'HOT';
  if (score >= 80) {
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
      progressPoints,
      reflectionPoints,
      ctaPoints,
      recencyPoints,
    },
  };
}
