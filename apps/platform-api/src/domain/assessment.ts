/**
 * Assessment Evidence Precedence Pure Domain Rules
 *
 * Implements pure evidence ranking and deterministic precedence rules:
 * COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED
 *
 * Note: UNKNOWN exists in persistence schema/contracts for backwards parity
 * but is UNUSED by V0.1 booking-sync evidence and excluded from pure ranking.
 *
 * This module is 100% pure (no IO, no DB, no framework dependencies).
 */

export type AssessmentRankedStatus =
  | 'NOT_STARTED'
  | 'CANCELLED'
  | 'SCHEDULED'
  | 'COMPLETED';

export const ASSESSMENT_RANKED_STATUSES: readonly AssessmentRankedStatus[] = [
  'NOT_STARTED',
  'CANCELLED',
  'SCHEDULED',
  'COMPLETED',
] as const;

export const ASSESSMENT_STATUS_RANKS: Record<AssessmentRankedStatus, number> = {
  NOT_STARTED: 1,
  CANCELLED: 2,
  SCHEDULED: 3,
  COMPLETED: 4,
};

export function isAssessmentRankedStatus(val: unknown): val is AssessmentRankedStatus {
  return typeof val === 'string' && (ASSESSMENT_RANKED_STATUSES as readonly string[]).includes(val);
}

/**
 * Returns the numerical rank for an assessment evidence status:
 * COMPLETED (4) > SCHEDULED (3) > CANCELLED (2) > NOT_STARTED (1)
 */
export function assessmentEvidenceRank(status: AssessmentRankedStatus): number {
  return ASSESSMENT_STATUS_RANKS[status];
}

/**
 * Checks if incoming assessment evidence should be applied over current status.
 * Higher or equal evidence rank wins; lower rank is ignored.
 */
export function shouldApplyAssessmentEvidence(
  current: AssessmentRankedStatus,
  incoming: AssessmentRankedStatus
): boolean {
  return ASSESSMENT_STATUS_RANKS[incoming] >= ASSESSMENT_STATUS_RANKS[current];
}

/**
 * Returns the resolved status according to evidence precedence:
 * - If incoming rank >= current rank -> returns incoming
 * - Otherwise -> returns current
 */
export function resolveAssessmentPrecedence(
  current: AssessmentRankedStatus,
  incoming: AssessmentRankedStatus
): AssessmentRankedStatus {
  return ASSESSMENT_STATUS_RANKS[incoming] >= ASSESSMENT_STATUS_RANKS[current] ? incoming : current;
}

/**
 * Selects the single highest assessment evidence from a list of statuses.
 * If empty, returns 'NOT_STARTED'.
 */
export function selectHighestAssessmentEvidence(
  ...statuses: readonly AssessmentRankedStatus[]
): AssessmentRankedStatus {
  if (!statuses.length) return 'NOT_STARTED';

  let highest = statuses[0];
  for (let i = 1; i < statuses.length; i++) {
    if (ASSESSMENT_STATUS_RANKS[statuses[i]] > ASSESSMENT_STATUS_RANKS[highest]) {
      highest = statuses[i];
    }
  }

  return highest;
}
