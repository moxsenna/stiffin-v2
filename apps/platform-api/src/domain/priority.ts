/**
 * Priority & Primary Selection Pure Domain Rules
 *
 * Implements effective priority calculation and deterministic primary action candidate selection.
 * This module is 100% pure (no IO, no DB, no framework dependencies).
 */

export interface PrimaryCandidate {
  priority: number; // base priority (1-100)
  dueAt: string | Date;
  createdAt: string | Date;
  [key: string]: unknown;
}

/**
 * Calculates effective priority based on overdue age:
 * - base priority
 * - +10 if overdue > 1 day (> 24 hours)
 * - +20 if overdue > 3 days (> 72 hours)
 * Modifiers are cumulative (e.g. > 72h overdue gets +30 total).
 * Effective priority is NOT capped at 100.
 */
export function calculateEffectivePriority(
  basePriority: number,
  dueAt: string | Date,
  now: string | Date
): number {
  const nowMs = (typeof now === 'string' ? new Date(now) : now).getTime();
  const dueMs = (typeof dueAt === 'string' ? new Date(dueAt) : dueAt).getTime();
  const overdueMs = nowMs - dueMs;

  let modifier = 0;
  if (overdueMs > 24 * 3600_000) {
    modifier += 10;
  }
  if (overdueMs > 72 * 3600_000) {
    modifier += 20;
  }

  return basePriority + modifier;
}

/**
 * Compares two primary candidates deterministically:
 * 1. Highest effective priority (descending)
 * 2. Earliest dueAt (ascending)
 * 3. Oldest createdAt (ascending)
 * Returns < 0 if a should precede b, > 0 if b should precede a, 0 if equal.
 */
export function comparePrimaryCandidate(
  a: PrimaryCandidate,
  b: PrimaryCandidate,
  now: string | Date
): number {
  const effA = calculateEffectivePriority(a.priority, a.dueAt, now);
  const effB = calculateEffectivePriority(b.priority, b.dueAt, now);

  if (effA !== effB) {
    return effB - effA; // Descending: higher priority comes first
  }

  const dueA = (typeof a.dueAt === 'string' ? new Date(a.dueAt) : a.dueAt).getTime();
  const dueB = (typeof b.dueAt === 'string' ? new Date(b.dueAt) : b.dueAt).getTime();

  if (dueA !== dueB) {
    return dueA - dueB; // Ascending: earliest dueAt comes first
  }

  const createdA = (typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt).getTime();
  const createdB = (typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt).getTime();

  if (createdA !== createdB) {
    return createdA - createdB; // Ascending: oldest createdAt comes first
  }

  return 0; // Identical precedence -> stable order
}

/**
 * Selects the single primary action candidate from a list of candidates.
 * Preserves stable first-seen ordering on complete ties.
 */
export function selectPrimaryAction<T extends PrimaryCandidate>(
  candidates: readonly T[],
  now: string | Date
): T | null {
  if (!candidates.length) return null;

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (comparePrimaryCandidate(candidates[i], best, now) < 0) {
      best = candidates[i];
    }
  }

  return best;
}
