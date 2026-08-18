import { AftercareRepositoryPort, CompleteAftercareInput } from '@/modules/aftercare/ports';
import { MockStateStore } from './mock-state-store';

export class MockAftercareRepository implements AftercareRepositoryPort {
  constructor(private store: MockStateStore) {}

  async completeAftercare(input: CompleteAftercareInput): Promise<void> {
    const action = this.store.getNextActions().find((a) => a.id === input.actionId);
    const contactId = input.contactId || action?.contactId;

    if (contactId) {
      const contact = this.store.getContacts().find((c) => c.id === contactId);
      if (contact) {
        const existingNotes = contact.notes ? `${contact.notes}\n` : '';
        this.store.updateContact(contactId, {
          notes: `${existingNotes}[Aftercare D+7 Outcome: ${input.outcome}] ${input.notes || ''}`.trim(),
        });
      }
    }

    if (action) {
      this.store.updateNextAction(action.id, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });
    }
  }
}
