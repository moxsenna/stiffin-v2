import { NextActionRepositoryPort } from './ports';
import { FlowNextAction, NextActionType, ActionSource } from '@promotor/promotor-flow-fixtures';
import { ActivityRepositoryPort } from '../activities/ports';

export interface ScheduleNextActionInput {
  organizationId: string;
  contactId: string;
  actionType: NextActionType;
  title: string;
  subtitle?: string;
  dueAt: string;
  source?: ActionSource;
  sourceEventId?: string;
  sourceSignalId?: string;
  idempotencyKey?: string;
  contextJson?: Record<string, unknown>;
}

export function createNextActionCommands(
  actionRepo: NextActionRepositoryPort,
  activityRepo: ActivityRepositoryPort
) {
  return {
    async scheduleNextAction(input: ScheduleNextActionInput): Promise<FlowNextAction> {
      // Idempotency check
      if (input.idempotencyKey) {
        const existing = await actionRepo.findByIdempotencyKey(input.organizationId, input.idempotencyKey);
        if (existing) {
          return existing;
        }
      }

      const newAction: Omit<FlowNextAction, 'id' | 'createdAt'> = {
        organizationId: input.organizationId,
        contactId: input.contactId,
        actionType: input.actionType,
        title: input.title,
        subtitle: input.subtitle,
        dueAt: input.dueAt,
        status: 'PENDING',
        source: input.source || 'PROMOTORFLOW',
        sourceEventId: input.sourceEventId,
        sourceSignalId: input.sourceSignalId,
        idempotencyKey: input.idempotencyKey,
        contextJson: input.contextJson,
      };

      const created = await actionRepo.createNextAction(newAction);

      await activityRepo.appendActivity({
        organizationId: input.organizationId,
        contactId: input.contactId,
        title: `Tindakan baru dijadwalkan: ${input.title}`,
        timestamp: new Date().toISOString(),
        type: 'STAGE_CHANGED',
      });

      return created;
    },

    async completeNextAction(actionId: string): Promise<FlowNextAction> {
      const updated = await actionRepo.updateNextAction(actionId, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });

      await activityRepo.appendActivity({
        organizationId: updated.organizationId,
        contactId: updated.contactId,
        title: `Tindakan selesai: ${updated.title}`,
        timestamp: new Date().toISOString(),
        type: 'STAGE_CHANGED',
      });

      return updated;
    },

    async rescheduleNextAction(actionId: string, newDueAt: string): Promise<FlowNextAction> {
      const updated = await actionRepo.updateNextAction(actionId, {
        dueAt: newDueAt,
        status: 'PENDING',
      });

      await activityRepo.appendActivity({
        organizationId: updated.organizationId,
        contactId: updated.contactId,
        title: `Jadwal tindakan diperbarui: ${updated.title}`,
        timestamp: new Date().toISOString(),
        type: 'STAGE_CHANGED',
      });

      return updated;
    },

    async skipNextAction(actionId: string, nextActionInput?: ScheduleNextActionInput): Promise<FlowNextAction> {
      const updated = await actionRepo.updateNextAction(actionId, {
        status: 'SKIPPED',
        completedAt: new Date().toISOString(),
      });

      await activityRepo.appendActivity({
        organizationId: updated.organizationId,
        contactId: updated.contactId,
        title: `Tindakan dilewati: ${updated.title}`,
        timestamp: new Date().toISOString(),
        type: 'STAGE_CHANGED',
      });

      if (nextActionInput) {
        await this.scheduleNextAction(nextActionInput);
      }

      return updated;
    },

    async cancelNextAction(actionId: string): Promise<FlowNextAction> {
      return actionRepo.updateNextAction(actionId, {
        status: 'CANCELLED',
      });
    },
  };
}
