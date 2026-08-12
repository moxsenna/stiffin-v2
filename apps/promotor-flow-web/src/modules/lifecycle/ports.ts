import { LifecycleStage } from '@promotor/promotor-flow-fixtures';

export interface LifecycleRepositoryPort {
  updateStage(contactId: string, stage: LifecycleStage, lostReason?: string): Promise<void>;
  cancelActiveActionsForContact(contactId: string, reason: string): Promise<number>;
}
