import { NextActionRepositoryPort, SkipNextStepInput } from '@/modules/next-actions/ports';
import { FlowNextAction, NextActionStatus, NextActionType, ActionSource } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpNextActionRepository implements NextActionRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listNextActions(status?: NextActionStatus): Promise<FlowNextAction[]> {
    const res = await this.api.listNextActions({ status });
    return (res.nextActions || []).map((a: any) => this.mapToFlowNextAction(a));
  }

  async getContactNextActions(contactId: string): Promise<FlowNextAction[]> {
    const res = await this.api.listNextActions({ contactId });
    return (res.nextActions || []).map((a: any) => this.mapToFlowNextAction(a));
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<FlowNextAction | null> {
    const res = await this.api.listNextActions();
    const match = (res.nextActions || []).find((a: any) => a.idempotencyKey === idempotencyKey);
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

  async completeAction(actionId: string): Promise<FlowNextAction> {
    const res = await this.api.completeNextAction(actionId);
    return this.mapToFlowNextAction(res.nextAction);
  }

  async skipAction(actionId: string, nextStep: SkipNextStepInput): Promise<FlowNextAction> {
    const res = await this.api.skipNextAction(actionId, {
      nextStep: {
        type: nextStep.type as any,
        title: nextStep.title,
        dueAt: nextStep.dueAt,
        description: nextStep.description,
      },
    });
    return this.mapToFlowNextAction(res.nextAction);
  }

  async cancelAction(actionId: string): Promise<FlowNextAction> {
    const res = await this.api.cancelNextAction(actionId);
    return this.mapToFlowNextAction(res.nextAction);
  }

  async rescheduleAction(actionId: string, dueAt: string): Promise<FlowNextAction> {
    const res = await this.api.rescheduleNextAction(actionId, { dueAt });
    return this.mapToFlowNextAction(res.nextAction);
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
