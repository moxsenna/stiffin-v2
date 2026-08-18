import { NextActionRepositoryPort, SkipNextStepInput } from '@/modules/next-actions/ports';
import { FlowNextAction, NextActionStatus } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockNextActionRepository implements NextActionRepositoryPort {
  constructor(private store: MockStateStore) {}

  private resolveOrgId(organizationId?: string): string {
    return organizationId || 'org_rina_stifin';
  }

  async listNextActions(status?: NextActionStatus, organizationId?: string): Promise<FlowNextAction[]> {
    const orgId = this.resolveOrgId(organizationId);
    let actions = this.store.getNextActions().filter((a) => a.organizationId === orgId);
    if (status) {
      actions = actions.filter((a) => a.status === status);
    }
    return actions;
  }

  async getContactNextActions(contactId: string, organizationId?: string): Promise<FlowNextAction[]> {
    const orgId = this.resolveOrgId(organizationId);
    return this.store
      .getNextActions()
      .filter((a) => a.organizationId === orgId && a.contactId === contactId);
  }

  async findByIdempotencyKey(idempotencyKey: string, organizationId?: string): Promise<FlowNextAction | null> {
    const orgId = this.resolveOrgId(organizationId);
    const match = this.store
      .getNextActions()
      .find((a) => a.organizationId === orgId && a.idempotencyKey === idempotencyKey);
    return match || null;
  }

  async createNextAction(actionInput: Omit<FlowNextAction, 'id' | 'createdAt'>): Promise<FlowNextAction> {
    const orgId = this.resolveOrgId(actionInput.organizationId);
    if (actionInput.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(actionInput.idempotencyKey, orgId);
      if (existing) {
        return existing;
      }
    }

    const action: FlowNextAction = {
      ...actionInput,
      organizationId: orgId,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.store.addNextAction(action);
    return action;
  }

  async completeAction(actionId: string): Promise<FlowNextAction> {
    return this.store.updateNextAction(actionId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    });
  }

  async skipAction(actionId: string, nextStep: SkipNextStepInput): Promise<FlowNextAction> {
    const skipped = this.store.updateNextAction(actionId, {
      status: 'SKIPPED',
      completedAt: new Date().toISOString(),
    });

    const orgId = this.resolveOrgId(skipped.organizationId);

    // Atomically schedule replacement in mock store
    const replacement: FlowNextAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      organizationId: orgId,
      contactId: skipped.contactId,
      actionType: nextStep.type,
      title: nextStep.title,
      subtitle: nextStep.description,
      dueAt: nextStep.dueAt || new Date(Date.now() + 86400000).toISOString(),
      status: 'PENDING',
      source: 'PROMOTORFLOW',
      createdAt: new Date().toISOString(),
    };
    this.store.addNextAction(replacement);

    return skipped;
  }

  async cancelAction(actionId: string): Promise<FlowNextAction> {
    return this.store.updateNextAction(actionId, {
      status: 'CANCELLED',
    });
  }

  async rescheduleAction(actionId: string, dueAt: string): Promise<FlowNextAction> {
    return this.store.updateNextAction(actionId, {
      dueAt,
      status: 'PENDING',
    });
  }
}
