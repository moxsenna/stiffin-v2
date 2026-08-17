/**
 * NextAction Pure Domain Rules & Timing Calculations
 *
 * Implements deterministic due date, priority, and follow-on rule calculations.
 * This module is 100% pure (no IO, no DB, no framework dependencies).
 */

export type NextActionType =
  | 'CONTACT_LEAD'
  | 'FOLLOW_UP'
  | 'REMIND_PAYMENT'
  | 'CONFIRM_BOOKING'
  | 'REMIND_BOOKING'
  | 'AFTERCARE'
  | 'MANUAL';

export const NEXT_ACTION_TYPES: readonly NextActionType[] = [
  'CONTACT_LEAD',
  'FOLLOW_UP',
  'REMIND_PAYMENT',
  'CONFIRM_BOOKING',
  'REMIND_BOOKING',
  'AFTERCARE',
  'MANUAL',
] as const;

export const BASE_PRIORITIES: Record<NextActionType, number> = {
  CONTACT_LEAD: 75,
  FOLLOW_UP: 70,
  REMIND_PAYMENT: 85,
  CONFIRM_BOOKING: 90,
  REMIND_BOOKING: 90,
  AFTERCARE: 50,
  MANUAL: 40,
};

export type AftercareOutcome =
  | 'NO_NEED'
  | 'HAS_QUESTION'
  | 'INTERESTED_NEXT_SESSION'
  | 'CONTACT_LATER';

export const AFTERCARE_OUTCOMES: readonly AftercareOutcome[] = [
  'NO_NEED',
  'HAS_QUESTION',
  'INTERESTED_NEXT_SESSION',
  'CONTACT_LATER',
] as const;

export function isNextActionType(val: unknown): val is NextActionType {
  return typeof val === 'string' && (NEXT_ACTION_TYPES as readonly string[]).includes(val as NextActionType);
}

export function isAftercareOutcome(val: unknown): val is AftercareOutcome {
  return typeof val === 'string' && (AFTERCARE_OUTCOMES as readonly string[]).includes(val as AftercareOutcome);
}

/**
 * Extracts calendar date parts for a date in a specified IANA timezone.
 */
export function getLocalCalendarDate(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);

  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'second') second = parseInt(p.value, 10);
  }

  return { year, month, day, hour, minute, second };
}

/**
 * Returns the exact UTC Date instant for a specific local calendar date and time in an IANA timezone.
 */
export function getInstantForZonedDateTime(params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
  timeZone: string;
}): Date {
  const { year, month, day, hour, minute, second = 0, timeZone } = params;
  const targetLocalMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetLocalMs;

  for (let i = 0; i < 3; i++) {
    const d = new Date(guess);
    const local = getLocalCalendarDate(d, timeZone);
    const actualLocalMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const diff = targetLocalMs - actualLocalMs;
    if (diff === 0) return new Date(guess);
    guess += diff;
  }

  return new Date(guess);
}

/**
 * Computes 10:00:00 local time on the next calendar day in the given IANA timezone.
 */
export function getNextLocalDay10Am(now: Date | string, timeZone: string): Date {
  const nowDate = typeof now === 'string' ? new Date(now) : now;
  const local = getLocalCalendarDate(nowDate, timeZone);
  const nextDayUtc = new Date(Date.UTC(local.year, local.month - 1, local.day + 1, 12, 0, 0));

  return getInstantForZonedDateTime({
    year: nextDayUtc.getUTCFullYear(),
    month: nextDayUtc.getUTCMonth() + 1,
    day: nextDayUtc.getUTCDate(),
    hour: 10,
    minute: 0,
    second: 0,
    timeZone,
  });
}

/**
 * NA-001: CONTACT_LEAD (Contact Created)
 * due: now + 2 hours
 * priority: 75
 */
export function calculateContactLeadRule(now: Date | string): {
  actionType: 'CONTACT_LEAD';
  dueAt: Date;
  priority: number;
} {
  const nowMs = (typeof now === 'string' ? new Date(now) : now).getTime();
  return {
    actionType: 'CONTACT_LEAD',
    dueAt: new Date(nowMs + 2 * 3600_000),
    priority: BASE_PRIORITIES.CONTACT_LEAD,
  };
}

/**
 * NA-003: FOLLOW_UP (Stage enters INTERESTED & no active follow-up)
 * due: next local day at 10:00 in organization timezone
 * priority: 70
 */
export function calculateFollowUpRule(
  now: Date | string,
  timeZone: string
): {
  actionType: 'FOLLOW_UP';
  dueAt: Date;
  priority: number;
} {
  return {
    actionType: 'FOLLOW_UP',
    dueAt: getNextLocalDay10Am(now, timeZone),
    priority: BASE_PRIORITIES.FOLLOW_UP,
  };
}

/**
 * NA-005: REMIND_PAYMENT (Booking created + UNPAID)
 * due: min(now + 2 hours, bookingStart - 1 day)
 * priority: 85
 */
export function calculateRemindPaymentRule(
  now: Date | string,
  bookingStart: Date | string
): {
  actionType: 'REMIND_PAYMENT';
  dueAt: Date;
  priority: number;
} {
  const nowMs = (typeof now === 'string' ? new Date(now) : now).getTime();
  const startMs = (typeof bookingStart === 'string' ? new Date(bookingStart) : bookingStart).getTime();
  const candidateA = nowMs + 2 * 3600_000;
  const candidateB = startMs - 24 * 3600_000;

  return {
    actionType: 'REMIND_PAYMENT',
    dueAt: new Date(Math.min(candidateA, candidateB)),
    priority: BASE_PRIORITIES.REMIND_PAYMENT,
  };
}

/**
 * NA-005b: CONFIRM_BOOKING (Booking PENDING + PAID/WAIVED)
 * due: booking start
 * priority: 90
 */
export function calculateConfirmBookingRule(bookingStart: Date | string): {
  actionType: 'CONFIRM_BOOKING';
  dueAt: Date;
  priority: number;
} {
  const startDate = typeof bookingStart === 'string' ? new Date(bookingStart) : bookingStart;
  return {
    actionType: 'CONFIRM_BOOKING',
    dueAt: startDate,
    priority: BASE_PRIORITIES.CONFIRM_BOOKING,
  };
}

/**
 * NA-006: REMIND_BOOKING (Booking confirmed)
 * due: if bookingStart < now + 24 hours then now else bookingStart - 24 hours
 * priority: 90
 */
export function calculateRemindBookingRule(
  now: Date | string,
  bookingStart: Date | string
): {
  actionType: 'REMIND_BOOKING';
  dueAt: Date;
  priority: number;
} {
  const nowMs = (typeof now === 'string' ? new Date(now) : now).getTime();
  const startMs = (typeof bookingStart === 'string' ? new Date(bookingStart) : bookingStart).getTime();

  let dueMs: number;
  if (startMs < nowMs + 24 * 3600_000) {
    dueMs = nowMs;
  } else {
    dueMs = startMs - 24 * 3600_000;
  }

  return {
    actionType: 'REMIND_BOOKING',
    dueAt: new Date(dueMs),
    priority: BASE_PRIORITIES.REMIND_BOOKING,
  };
}

/**
 * Canonical idempotency key builder for NA-009 Aftercare.
 */
export function buildAftercareIdempotencyKey(bookingId: string): string {
  return `aftercare:booking:${bookingId}:d7`;
}

/**
 * NA-009: AFTERCARE (Booking completed)
 * due: completedAt + 7 days
 * priority: 50
 * idempotencyKey: aftercare:booking:{bookingId}:d7
 */
export function calculateAftercareRule(
  completedAt: Date | string,
  bookingId: string
): {
  actionType: 'AFTERCARE';
  dueAt: Date;
  priority: number;
  idempotencyKey: string;
} {
  const compMs = (typeof completedAt === 'string' ? new Date(completedAt) : completedAt).getTime();
  return {
    actionType: 'AFTERCARE',
    dueAt: new Date(compMs + 7 * 24 * 3600_000),
    priority: BASE_PRIORITIES.AFTERCARE,
    idempotencyKey: buildAftercareIdempotencyKey(bookingId),
  };
}

export interface SkipNextStepInput {
  nextStep?: {
    type: NextActionType;
    title?: string | null;
    dueAt?: string | Date | null;
    description?: string | null;
  } | null;
}

export interface SkipNextStepSuccess {
  ok: true;
  actionType: NextActionType;
  title: string | null;
  dueAt: Date;
  priority: number;
  description: string | null;
}

export interface SkipNextStepFailure {
  ok: false;
  errorReason: 'NEXT_STEP_REQUIRED';
  message: string;
}

export type SkipNextStepDecision = SkipNextStepSuccess | SkipNextStepFailure;

/**
 * Skip Next Step Rule:
 * - Skipping an action requires an explicit nextStep.
 * - Missing/invalid nextStep -> semantic failure NEXT_STEP_REQUIRED.
 * - When nextStep has explicit dueAt -> preserve it.
 * - When dueAt is absent -> next local day at 10:00 in organization timezone.
 * - Priority: canonical base priority of nextStep.type.
 */
export function calculateSkipNextStepRule(
  input: SkipNextStepInput,
  now: Date | string,
  timeZone: string
): SkipNextStepDecision {
  if (!input.nextStep || !isNextActionType(input.nextStep.type)) {
    return {
      ok: false,
      errorReason: 'NEXT_STEP_REQUIRED',
      message: 'Skipping an action requires a valid next step',
    };
  }

  const actionType = input.nextStep.type;
  const priority = BASE_PRIORITIES[actionType];

  let dueAt: Date;
  if (input.nextStep.dueAt) {
    dueAt = typeof input.nextStep.dueAt === 'string' ? new Date(input.nextStep.dueAt) : input.nextStep.dueAt;
  } else {
    dueAt = getNextLocalDay10Am(now, timeZone);
  }

  return {
    ok: true,
    actionType,
    title: input.nextStep.title ?? null,
    dueAt,
    priority,
    description: input.nextStep.description ?? null,
  };
}

/**
 * Class signal fallback rule (when dueAt is absent):
 * - dueAt: next local day at 10:00 in organization timezone
 * - Default priority: FOLLOW_UP (70) or MANUAL (40)
 */
export function calculateClassFallbackDueRule(
  now: Date | string,
  timeZone: string,
  actionType: 'FOLLOW_UP' | 'MANUAL' = 'FOLLOW_UP'
): {
  actionType: 'FOLLOW_UP' | 'MANUAL';
  dueAt: Date;
  priority: number;
} {
  return {
    actionType,
    dueAt: getNextLocalDay10Am(now, timeZone),
    priority: BASE_PRIORITIES[actionType],
  };
}

export interface AftercareFollowOn {
  actionType: 'MANUAL' | 'FOLLOW_UP';
  dueAt: Date;
  priority: number;
  title: string;
}

/**
 * Calculates pure follow-on NextAction from completed aftercare outcome:
 * - CONTACT_LATER -> MANUAL, +30 days, priority 40
 * - INTERESTED_NEXT_SESSION -> FOLLOW_UP, +3 days, priority 70
 * - NO_NEED -> null
 * - HAS_QUESTION -> null
 */
export function calculateAftercareFollowOnRule(
  outcome: AftercareOutcome,
  completedAt: Date | string
): AftercareFollowOn | null {
  const compMs = (typeof completedAt === 'string' ? new Date(completedAt) : completedAt).getTime();

  if (outcome === 'CONTACT_LATER') {
    return {
      actionType: 'MANUAL',
      dueAt: new Date(compMs + 30 * 24 * 3600_000),
      priority: BASE_PRIORITIES.MANUAL,
      title: 'Follow up later (Aftercare outcome)',
    };
  }

  if (outcome === 'INTERESTED_NEXT_SESSION') {
    return {
      actionType: 'FOLLOW_UP',
      dueAt: new Date(compMs + 3 * 24 * 3600_000),
      priority: BASE_PRIORITIES.FOLLOW_UP,
      title: 'Follow up for next session (Aftercare outcome)',
    };
  }

  return null;
}
