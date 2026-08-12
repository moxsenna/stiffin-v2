import { AftercareRepositoryPort, AftercareOutcome } from '@/modules/aftercare/ports';
import { MockStateStore } from './mock-state-store';

export class MockAftercareRepository implements AftercareRepositoryPort {
  constructor(private store: MockStateStore) {}

  async recordOutcome(contactId: string, outcome: AftercareOutcome, notes?: string): Promise<void> {
    const contact = this.store.getContacts().find((c) => c.id === contactId);
    if (contact) {
      const existingNotes = contact.notes ? `${contact.notes}\n` : '';
      this.store.updateContact(contactId, {
        notes: `${existingNotes}[Aftercare D+7 Outcome: ${outcome}] ${notes || ''}`.trim(),
      });
    }
  }
}
