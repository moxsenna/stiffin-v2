import { ContactRepositoryPort } from '@/modules/contacts/ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockContactRepository implements ContactRepositoryPort {
  constructor(private store: MockStateStore) {}

  async listContacts(
    organizationId: string,
    search?: string,
    filter?: 'ALL' | 'PROSPECT' | 'CLIENT'
  ): Promise<FlowContact[]> {
    let contacts = this.store.getContacts().filter((c) => c.organizationId === organizationId);

    if (filter === 'PROSPECT') {
      contacts = contacts.filter((c) => c.classification === 'PROSPECT');
    } else if (filter === 'CLIENT') {
      contacts = contacts.filter((c) => c.classification === 'CLIENT');
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      contacts = contacts.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phoneE164.includes(q) || (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    return contacts;
  }

  async getContactDetail(organizationId: string, contactId: string): Promise<FlowContact | null> {
    const contact = this.store.getContacts().find((c) => c.organizationId === organizationId && c.id === contactId);
    return contact || null;
  }

  async findContactByPhone(organizationId: string, phoneE164: string): Promise<FlowContact | null> {
    const contact = this.store.getContacts().find(
      (c) => c.organizationId === organizationId && c.phoneE164 === phoneE164
    );
    return contact || null;
  }

  async createContact(contactInput: Omit<FlowContact, 'createdAt' | 'updatedAt'>): Promise<FlowContact> {
    const now = new Date().toISOString();
    const contact: FlowContact = {
      ...contactInput,
      createdAt: now,
      updatedAt: now,
    };
    this.store.addContact(contact);
    return contact;
  }

  async updateContact(contactId: string, updates: Partial<FlowContact>): Promise<FlowContact> {
    return this.store.updateContact(contactId, updates);
  }
}
