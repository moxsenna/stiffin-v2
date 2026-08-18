import { AftercareRepositoryPort, AftercareOutcome } from '@/modules/aftercare/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpAftercareRepository implements AftercareRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async recordOutcome(contactId: string, outcome: AftercareOutcome, notes?: string): Promise<void> {
    // Map AftercareOutcome enum to backend AftercareOutcomeSchema ('NO_NEED' | 'HAS_QUESTION' | 'INTERESTED_NEXT_SESSION' | 'CONTACT_LATER')
    const outcomeMap: Record<AftercareOutcome, 'NO_NEED' | 'HAS_QUESTION' | 'INTERESTED_NEXT_SESSION' | 'CONTACT_LATER'> = {
      NO_FURTHER_NEED: 'NO_NEED',
      HAS_QUESTION: 'HAS_QUESTION',
      NEEDS_FOLLOW_ON_SESSION: 'INTERESTED_NEXT_SESSION',
      CONTACT_LATER: 'CONTACT_LATER',
    };

    // Find pending next actions of type AFTERCARE for this contact
    const res = await this.api.listNextActions({ contactId, status: 'PENDING' });
    const aftercareAction = (res.nextActions || []).find(
      (a: any) => a.actionType === 'AFTERCARE'
    );

    if (aftercareAction) {
      await this.api.completeAftercareAction(aftercareAction.id, {
        outcome: outcomeMap[outcome],
        notes,
      });
    }
  }
}
