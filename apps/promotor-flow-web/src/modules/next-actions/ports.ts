import { FlowNextAction, NextActionStatus, NextActionType } from '@promotor/promotor-flow-fixtures';

export interface SkipNextStepInput {
  type: NextActionType;
  title: string;
  dueAt?: string;
  description?: string;
}

export interface NextActionRepositoryPort {
  listNextActions(status?: NextActionStatus, organizationId?: string): Promise<FlowNextAction[]>;
  getContactNextActions(contactId: string, organizationId?: string): Promise<FlowNextAction[]>;
  findByIdempotencyKey(idempotencyKey: string, organizationId?: string): Promise<FlowNextAction | null>;
  createNextAction(action: Omit<FlowNextAction, 'id' | 'createdAt'>): Promise<FlowNextAction>;
  completeAction(actionId: string): Promise<FlowNextAction>;
  skipAction(actionId: string, nextStep: SkipNextStepInput): Promise<FlowNextAction>;
  cancelAction(actionId: string): Promise<FlowNextAction>;
  rescheduleAction(actionId: string, dueAt: string): Promise<FlowNextAction>;
}
