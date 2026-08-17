import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { DEFAULT_ORGANIZATION_TIMEZONE } from '@promotor/platform-core';
import { createContactFlowRepository } from '../repositories/contact-flow-repository';
import { createNextActionRepository } from '../repositories/next-action-repository';
import { createActivityRepository } from '../repositories/activity-repository';
import { createNextActionService } from './next-action-service';
import {
  evaluateStageTransition,
  type FlowStage,
  type FlowClassification,
} from '../domain/contact-lifecycle';
import { getNextLocalDay10Am, getLocalCalendarDate } from '../domain/next-action-rules';

export interface TransitionStageOptions {
  lostReason?: string | null;
}

export interface ContactLifecycleServiceDependencies {
  nextActions?: typeof createNextActionService;
  activities?: typeof createActivityRepository;
  clock?: () => Date;
  orgTz?: string;
}

export function createContactLifecycleService(
  db: DbHandle,
  dependencies: ContactLifecycleServiceDependencies = {}
) {
  const getNow = dependencies.clock ?? (() => new Date());
  const orgTz = dependencies.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;

  return {
    /**
     * Operator-directed lifecycle stage transition.
     * Single authority for writing contact_flow_states.stage and promoting classification to CLIENT.
     */
    async transitionStage(
      ctx: OrganizationContext,
      contactId: string,
      targetStage: string,
      opts: TransitionStageOptions = {},
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const flowRepo = createContactFlowRepository(tx);
        const actionRepo = createNextActionRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const currentFlowState = await flowRepo.getOrCreate(ctx, contactId);
        if (!currentFlowState) {
          throw new DomainError('NOT_FOUND', 'Active tenant contact not found');
        }

        const now = getNow();
        const evalResult = evaluateStageTransition({
          currentStage: currentFlowState.stage as FlowStage,
          currentClassification: currentFlowState.classification as FlowClassification,
          targetStage: targetStage as FlowStage,
          lostReason: opts.lostReason ?? undefined,
        });

        if (!evalResult.ok) {
          if (evalResult.errorReason === 'LOST_REASON_REQUIRED') {
            throw new DomainError('VALIDATION_ERROR', 'LOST_REASON_REQUIRED');
          }
          throw new DomainError(
            'VALIDATION_ERROR',
            evalResult.errorReason ?? 'INVALID_STAGE'
          );
        }

        if (evalResult.stageChanged) {
          // 1. Atomically update lifecycle state in database
          const updatedState = await flowRepo.updateLifecycleState(ctx, contactId, {
            stage: evalResult.targetStage,
            lostReason: evalResult.persistedLostReason,
            promoteToClient: evalResult.isClientPromoted,
          });

          // 2. Append STAGE_CHANGED activity
          await activityRepo.append(ctx, actor, {
            contactId,
            eventType: 'STAGE_CHANGED',
            metadataJson: {
              from: currentFlowState.stage,
              to: evalResult.targetStage,
              lostReason: evalResult.persistedLostReason ?? undefined,
            },
          });

          // 3. Execute stage-entry triggers
          for (const trigger of evalResult.triggers) {
            if (trigger === 'CANCEL_PENDING_ACTIONS') {
              // Entering LOST -> cancel all pending active actions for this contact
              const pendingActions = await actionRepo.listByContact(ctx, contactId, 'PENDING');
              for (const action of pendingActions) {
                await actionRepo.resolve(ctx, action.id, 'CANCELLED');
                await activityRepo.append(ctx, actor, {
                  contactId,
                  bookingId: action.bookingId,
                  eventType: 'ACTION_CANCELLED',
                  metadataJson: {
                    actionId: action.id,
                    actionType: action.actionType,
                    reason: 'LIFECYCLE_LOST',
                  },
                });
              }
            } else if (trigger === 'ENSURE_FOLLOW_UP_IF_NONE') {
              // Entering INTERESTED -> auto-create NA-003 FOLLOW_UP if no active follow-up exists
              const pendingActions = await actionRepo.listByContact(ctx, contactId, 'PENDING');
              const hasFollowUp = pendingActions.some((a) => a.actionType === 'FOLLOW_UP');
              if (!hasFollowUp) {
                const nextActionService = (dependencies.nextActions ?? createNextActionService)(tx, {
                  activities: dependencies.activities,
                  clock: () => now,
                  orgTz,
                });

                await nextActionService.createFollowUp(
                  ctx,
                  {
                    contactId,
                    title: 'Follow-up prospek tertarik',
                    dueAt: getNextLocalDay10Am(now, orgTz).toISOString(),
                    priority: 70,
                  },
                  actor
                );
              }
            } else if (trigger === 'PROMPT_FOLLOW_UP_OPTIONS') {
              // Entering CONTACTED -> prompt only, no automated action creation
            }
          }

          return updatedState ?? currentFlowState;
        }

        // Same-stage reselection is a no-op
        return currentFlowState;
      });
    },

    /**
     * Pure suggestion helper for follow-up option prompts.
     */
    suggestFollowUpOptions(ctx: OrganizationContext, contactId: string) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const now = getNow();
      const tomorrow10Am = getNextLocalDay10Am(now, orgTz);
      const in2Days = new Date(tomorrow10Am.getTime() + 1 * 86400_000);
      const in3Days = new Date(tomorrow10Am.getTime() + 2 * 86400_000);
      const in1Week = new Date(tomorrow10Am.getTime() + 6 * 86400_000);

      return {
        tomorrow: tomorrow10Am.toISOString(),
        in2Days: in2Days.toISOString(),
        in3Days: in3Days.toISOString(),
        in1Week: in1Week.toISOString(),
      };
    },
  };
}
