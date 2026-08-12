import { FlowNextAction, NextActionStatus } from '@promotor/promotor-flow-fixtures';

export interface NextActionRepositoryPort {
  listNextActions(organizationId: string, status?: NextActionStatus): Promise<FlowNextAction[]>;
  getContactNextActions(organizationId: string, contactId: string): Promise<FlowNextAction[]>;
  findByIdempotencyKey(organizationId: string, idempotencyKey: string): Promise<FlowNextAction | null>;
  createNextAction(action: Omit<FlowNextAction, 'id' | 'createdAt'>): Promise<FlowNextAction>;
  updateNextAction(actionId: string, updates: Partial<FlowNextAction>): Promise<FlowNextAction>;
}
