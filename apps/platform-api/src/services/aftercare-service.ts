import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { createAftercareRepository, type ListAftercareOrgOptions } from '../repositories/aftercare-repository';
import { createNextActionRepository } from '../repositories/next-action-repository';
import { createActivityRepository } from '../repositories/activity-repository';
import { createNextActionService } from './next-action-service';
import {
  isAftercareOutcome,
  calculateAftercareFollowOnRule,
  type AftercareOutcome,
} from '../domain/next-action-rules';

export interface CompleteAftercareInput {
  outcome: string;
  notes?: string | null;
}

export interface AftercareServiceDependencies {
  aftercare?: typeof createAftercareRepository;
  nextActions?: typeof createNextActionService;
  activities?: typeof createActivityRepository;
  clock?: () => Date;
}

export function createAftercareService(
  db: DbHandle,
  dependencies: AftercareServiceDependencies = {}
) {
  const getNow = dependencies.clock ?? (() => new Date());

  return {
    /**
     * Completes an AFTERCARE next action and records the aftercare outcome.
     * Follows strict R2.1-2 execution order, R2-7 temporal guard, and R2.3-8 WhatsApp decoupling.
     */
    async completeAftercare(
      ctx: OrganizationContext,
      actionId: string,
      input: CompleteAftercareInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const actionRepo = createNextActionRepository(tx);
        const aftercareRepo = (dependencies.aftercare ?? createAftercareRepository)(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        // 1. Load the next action
        const action = await actionRepo.findById(ctx, actionId);
        if (!action) {
          throw new DomainError('NOT_FOUND', 'Aftercare action not found');
        }

        if (!action.bookingId) {
          throw new DomainError('VALIDATION_ERROR', 'Action is not linked to a booking');
        }

        // 2. Load the linked aftercare record
        const record = await aftercareRepo.findByBooking(ctx, action.bookingId);
        if (!record) {
          throw new DomainError('NOT_FOUND', 'Aftercare record not found for booking');
        }

        // 3. Idempotency FIRST (R2.1-2): if both already COMPLETED, return canonical result
        if (action.status === 'COMPLETED' && record.status === 'COMPLETED') {
          return {
            action,
            record,
          };
        }

        // 4. Action type & status validation
        if (action.actionType !== 'AFTERCARE') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_ACTION_TYPE');
        }

        if (action.status !== 'PENDING') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_ACTION_STATUS');
        }

        if (record.status !== 'PENDING') {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_RECORD_STATUS');
        }

        if (!isAftercareOutcome(input.outcome)) {
          throw new DomainError('VALIDATION_ERROR', 'INVALID_AFTERCARE_OUTCOME');
        }

        const now = getNow();

        // 5. Temporal guard (R2-7): cannot complete before scheduled_for (D+7)
        if (now.getTime() < new Date(record.scheduledFor).getTime()) {
          throw new DomainError('VALIDATION_ERROR', 'AFTERCARE_NOT_DUE');
        }

        const nowIso = now.toISOString();

        // 6. Complete NextAction and Aftercare Record
        const updatedAction = await actionRepo.complete(ctx, actionId, nowIso);
        const updatedRecord = await aftercareRepo.completeRecord(ctx, action.bookingId, {
          outcome: input.outcome,
          outcomeNotes: input.notes ?? null,
          recordedAt: nowIso,
        });

        // 7. Append AFTERCARE_COMPLETED activity (NEVER fabricates WHATSAPP_SENT, R2.3-8)
        await activityRepo.append(ctx, actor, {
          contactId: action.contactId,
          bookingId: action.bookingId,
          eventType: 'AFTERCARE_COMPLETED',
          metadataJson: {
            outcome: input.outcome,
            notes: input.notes ?? undefined,
          },
        });

        // 8. Provision follow-on action per canonical rules
        const followOn = calculateAftercareFollowOnRule(
          input.outcome as AftercareOutcome,
          now
        );

        if (followOn) {
          const newAction = await actionRepo.create(ctx, {
            contactId: action.contactId,
            bookingId: action.bookingId,
            actionType: followOn.actionType,
            title:
              followOn.actionType === 'MANUAL'
                ? 'Follow-up berkala (30 hari)'
                : 'Tawarkan sesi lanjutan',
            dueAt: followOn.dueAt.toISOString(),
            priority: followOn.priority,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
            contextJson: {
              aftercareOutcome: input.outcome,
            },
          });

          await activityRepo.append(ctx, actor, {
            contactId: action.contactId,
            bookingId: action.bookingId,
            eventType: 'ACTION_CREATED',
            metadataJson: {
              actionId: newAction.id,
              actionType: newAction.actionType,
              dueAt: newAction.dueAt,
              priority: newAction.priority,
              source: 'PROMOTORFLOW',
            },
          });
        }

        return {
          action: updatedAction ?? action,
          record: updatedRecord ?? record,
        };
      });
    },

    /**
     * Lists aftercare records for analytics and management.
     */
    async listAftercare(ctx: OrganizationContext, opts: ListAftercareOrgOptions = {}) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const aftercareRepo = (dependencies.aftercare ?? createAftercareRepository)(db);
      return aftercareRepo.listByOrg(ctx, opts);
    },
  };
}
