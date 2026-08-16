/**
 * Flow Contact Lifecycle Pure Domain Rules
 *
 * Implements operator-directed stage transitions and sticky CLIENT classification.
 * This module is 100% pure (no IO, no DB, no framework dependencies).
 */

export type FlowStage =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'FOLLOW_UP'
  | 'BOOKED'
  | 'COMPLETED'
  | 'LOST';

export type FlowClassification = 'PROSPECT' | 'CLIENT';

export type LifecycleStageTrigger =
  | 'PROMPT_FOLLOW_UP_OPTIONS'
  | 'ENSURE_FOLLOW_UP_IF_NONE'
  | 'CANCEL_PENDING_ACTIONS';

export const FLOW_STAGES: readonly FlowStage[] = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP',
  'BOOKED',
  'COMPLETED',
  'LOST',
] as const;

export const FLOW_CLASSIFICATIONS: readonly FlowClassification[] = [
  'PROSPECT',
  'CLIENT',
] as const;

export function isLifecycleStage(val: unknown): val is FlowStage {
  return typeof val === 'string' && (FLOW_STAGES as readonly string[]).includes(val);
}

export function isClassification(val: unknown): val is FlowClassification {
  return typeof val === 'string' && (FLOW_CLASSIFICATIONS as readonly string[]).includes(val);
}

export interface EvaluateStageTransitionInput {
  currentStage: FlowStage;
  targetStage: FlowStage;
  currentClassification?: FlowClassification | null;
  lostReason?: string | null;
}

export interface StageTransitionSuccess {
  ok: true;
  targetStage: FlowStage;
  stageChanged: boolean;
  resolvedClassification: FlowClassification;
  isClientPromoted: boolean;
  persistedLostReason: string | null;
  triggers: LifecycleStageTrigger[];
}

export interface StageTransitionFailure {
  ok: false;
  errorReason: 'LOST_REASON_REQUIRED' | 'INVALID_STAGE';
  message: string;
}

export type StageTransitionDecision = StageTransitionSuccess | StageTransitionFailure;

/**
 * Resolves sticky classification rule:
 * - Default classification: PROSPECT
 * - When targetStage === COMPLETED: promotes to CLIENT
 * - When already CLIENT: always remains CLIENT (no automatic demotion)
 */
export function resolveClassification(
  currentClassification: FlowClassification | null | undefined,
  targetStage: FlowStage
): { classification: FlowClassification; isPromoted: boolean } {
  const current = currentClassification ?? 'PROSPECT';
  if (current === 'CLIENT') {
    return { classification: 'CLIENT', isPromoted: false };
  }
  if (targetStage === 'COMPLETED') {
    return { classification: 'CLIENT', isPromoted: true };
  }
  return { classification: 'PROSPECT', isPromoted: false };
}

/**
 * Evaluates an operator-directed stage transition decision.
 *
 * Rules:
 * 1. Any valid stage can transition to any valid stage (no strict funnel).
 * 2. Transition to LOST requires a non-empty trimmed lostReason.
 * 3. Transition to non-LOST stage automatically sets persisted lostReason to null.
 * 4. Sticky CLIENT classification: PROSPECT promotes to CLIENT on COMPLETED, never demotes.
 * 5. Triggers occur ONLY on actual stage entry (currentStage !== targetStage):
 *    - CONTACTED -> PROMPT_FOLLOW_UP_OPTIONS
 *    - INTERESTED -> ENSURE_FOLLOW_UP_IF_NONE
 *    - LOST -> CANCEL_PENDING_ACTIONS
 */
export function evaluateStageTransition(input: EvaluateStageTransitionInput): StageTransitionDecision {
  if (!isLifecycleStage(input.targetStage)) {
    return {
      ok: false,
      errorReason: 'INVALID_STAGE',
      message: `Invalid target lifecycle stage: ${String(input.targetStage)}`,
    };
  }

  // A. LOST validation
  let persistedLostReason: string | null = null;
  if (input.targetStage === 'LOST') {
    const trimmed = input.lostReason ? input.lostReason.trim() : '';
    if (!trimmed) {
      return {
        ok: false,
        errorReason: 'LOST_REASON_REQUIRED',
        message: 'Non-empty lostReason is required when transitioning contact to LOST',
      };
    }
    persistedLostReason = trimmed;
  } else {
    // Non-LOST stages clear lostReason
    persistedLostReason = null;
  }

  // B. Sticky CLIENT classification
  const { classification: resolvedClassification, isPromoted: isClientPromoted } = resolveClassification(
    input.currentClassification,
    input.targetStage
  );

  // C. Stage-entry triggers (only on actual stage change)
  const stageChanged = input.currentStage !== input.targetStage;
  const triggers: LifecycleStageTrigger[] = [];

  if (stageChanged) {
    if (input.targetStage === 'CONTACTED') {
      triggers.push('PROMPT_FOLLOW_UP_OPTIONS');
    } else if (input.targetStage === 'INTERESTED') {
      triggers.push('ENSURE_FOLLOW_UP_IF_NONE');
    } else if (input.targetStage === 'LOST') {
      triggers.push('CANCEL_PENDING_ACTIONS');
    }
  }

  return {
    ok: true,
    targetStage: input.targetStage,
    stageChanged,
    resolvedClassification,
    isClientPromoted,
    persistedLostReason,
    triggers,
  };
}
