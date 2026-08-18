import { AftercareRepositoryPort, CompleteAftercareInput, AftercareOutcome } from '@/modules/aftercare/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpAftercareRepository implements AftercareRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async completeAftercare(input: CompleteAftercareInput): Promise<void> {
    const outcomeMap: Record<AftercareOutcome, 'NO_NEED' | 'HAS_QUESTION' | 'INTERESTED_NEXT_SESSION' | 'CONTACT_LATER'> = {
      NO_FURTHER_NEED: 'NO_NEED',
      HAS_QUESTION: 'HAS_QUESTION',
      NEEDS_FOLLOW_ON_SESSION: 'INTERESTED_NEXT_SESSION',
      CONTACT_LATER: 'CONTACT_LATER',
    };

    await this.api.completeAftercareAction(input.actionId, {
      outcome: outcomeMap[input.outcome],
      notes: input.notes,
    });
  }
}
