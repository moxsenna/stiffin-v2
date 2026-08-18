import { LifecycleRepositoryPort } from '@/modules/lifecycle/ports';
import { LifecycleStage } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpLifecycleRepository implements LifecycleRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async updateStage(contactId: string, stage: LifecycleStage, lostReason?: string): Promise<void> {
    await this.api.transitionContactStage(contactId, {
      stage: stage as any,
      lostReason,
    });
  }

  async cancelActiveActionsForContact(contactId: string, _reason: string): Promise<number> {
    const res = await this.api.listNextActions({ contactId, status: 'PENDING' });
    const pending = res.nextActions || [];
    for (const a of pending) {
      await this.api.cancelNextAction(a.id);
    }
    return pending.length;
  }
}
