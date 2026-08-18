import { NextActionRepositoryPort } from '@/modules/next-actions/ports';
import { FlowNextAction, NextActionStatus, NextActionType, ActionSource } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpNextActionRepository implements NextActionRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listNextActions(_organizationId: string, status?: NextActionStatus): Promise<FlowNextAction[]> {
    const res = await this.api.listNextActions({ status });
    return (res.nextActions || []).map((a: any) => this.mapToFlowNextAction(a));
  }

  async getContactNextActions(_organizationId: string, contactId: string): Promise<FlowNextAction[]> {
    const res = await this.api.listNextActions({ contactId });
    return (res.nextActions || []).map((a: any) => this.mapToFlowNextAction(a));
  }

  async findByIdempotencyKey(_organizationId: string, _idempotencyKey: string): Promise<FlowNextAction | null> {
    const res = await this.api.listNextActions();
    const match = (res.nextActions || []).find((a: any) => a.idempotencyKey === _idempotencyKey);
    return match ? this.mapToFlowNextAction(match) : null;
  }

  async createNextAction(action: Omit<FlowNextAction, 'id' | 'createdAt'>): Promise<FlowNextAction> {
    const res = await this.api.createNextAction({
      contactId: action.contactId,
      actionType: action.actionType as any,
      title: action.title,
      description: action.subtitle,
      dueAt: action.dueAt,
    });
    return this.mapToFlowNextAction(res.nextAction);
  }

  async updateNextAction(actionId: string, updates: Partial<FlowNextAction>): Promise<FlowNextAction> {
    if (updates.status === 'COMPLETED') {
      const res = await this.api.completeNextAction(actionId);
      return this.mapToFlowNextAction(res.nextAction);
    }
    if (updates.status === 'SKIPPED') {
      const res = await this.api.skipNextAction(actionId, {
        nextStep: {
          type: 'FOLLOW_UP',
          title: 'Follow up lead',
        },
      });
      return this.mapToFlowNextAction(res.nextAction);
    }
    if (updates.status === 'CANCELLED') {
      const res = await this.api.cancelNextAction(actionId);
      return this.mapToFlowNextAction(res.nextAction);
    }
    if (updates.dueAt) {
      const res = await this.api.rescheduleNextAction(actionId, { dueAt: updates.dueAt });
      return this.mapToFlowNextAction(res.nextAction);
    }
    const res = await this.api.listNextActions();
    const match = (res.nextActions || []).find((a: any) => a.id === actionId);
    return match ? this.mapToFlowNextAction(match) : ({} as FlowNextAction);
  }

  private mapToFlowNextAction(a: any): FlowNextAction {
    return {
      id: a.id,
      organizationId: a.organizationId,
      contactId: a.contactId,
      actionType: a.actionType as NextActionType,
      title: a.title,
      subtitle: a.description ?? a.subtitle ?? undefined,
      dueAt: a.dueAt,
      status: a.status as NextActionStatus,
      source: (a.source || 'PROMOTORFLOW') as ActionSource,
      sourceEventId: a.sourceBookingId ?? undefined,
      sourceSignalId: a.sourceLessonId ?? undefined,
      idempotencyKey: a.idempotencyKey ?? undefined,
      createdAt: a.createdAt ?? new Date().toISOString(),
      completedAt: a.completedAt ?? undefined,
    };
  }
}
