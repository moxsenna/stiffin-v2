import { NextActionRepositoryPort } from '@/modules/next-actions/ports';
import { FlowNextAction, NextActionStatus } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockNextActionRepository implements NextActionRepositoryPort {
  constructor(private store: MockStateStore) {}

  async listNextActions(organizationId: string, status?: NextActionStatus): Promise<FlowNextAction[]> {
    let actions = this.store.getNextActions().filter((a) => a.organizationId === organizationId);
    if (status) {
      actions = actions.filter((a) => a.status === status);
    }
    return actions;
  }

  async getContactNextActions(organizationId: string, contactId: string): Promise<FlowNextAction[]> {
    return this.store
      .getNextActions()
      .filter((a) => a.organizationId === organizationId && a.contactId === contactId);
  }

  async findByIdempotencyKey(organizationId: string, idempotencyKey: string): Promise<FlowNextAction | null> {
    const match = this.store
      .getNextActions()
      .find((a) => a.organizationId === organizationId && a.idempotencyKey === idempotencyKey);
    return match || null;
  }

  async createNextAction(actionInput: Omit<FlowNextAction, 'id' | 'createdAt'>): Promise<FlowNextAction> {
    const action: FlowNextAction = {
      ...actionInput,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    this.store.addNextAction(action);
    return action;
  }

  async updateNextAction(actionId: string, updates: Partial<FlowNextAction>): Promise<FlowNextAction> {
    return this.store.updateNextAction(actionId, updates);
  }
}
