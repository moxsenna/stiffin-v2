import { LifecycleRepositoryPort } from '@/modules/lifecycle/ports';
import { LifecycleStage, ContactClassification } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockLifecycleRepository implements LifecycleRepositoryPort {
  constructor(private store: MockStateStore) {}

  async updateStage(contactId: string, stage: LifecycleStage, lostReason?: string): Promise<void> {
    const classification: ContactClassification = stage === 'COMPLETED' ? 'CLIENT' : 'PROSPECT';
    this.store.updateContact(contactId, {
      stage,
      classification,
      lostReason: stage === 'LOST' ? lostReason : undefined,
    });
  }

  async cancelActiveActionsForContact(contactId: string, reason: string): Promise<number> {
    return this.store.cancelActiveActionsForContact(contactId, reason);
  }
}
