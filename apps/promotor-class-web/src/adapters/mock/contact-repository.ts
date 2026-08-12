import { Contact } from '@promotor/contracts';
import { normalizePhone, createContactIdentity } from '@promotor/platform-core';
import { MockStateStore } from './mock-state-store';
import { ContactPort } from '../../modules/contacts/ports';

export class MockContactRepository implements ContactPort {
  async getContacts(): Promise<Contact[]> {
    return MockStateStore.getState().contacts;
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    return MockStateStore.getState().contacts.find(c => c.id === id);
  }

  async findContactByPhone(rawPhone: string): Promise<Contact | undefined> {
    const normalized = normalizePhone(rawPhone);
    return MockStateStore.getState().contacts.find(c => c.phone === normalized);
  }

  async matchOrCreateContact(name: string, rawPhone: string, email?: string): Promise<Contact> {
    const normalized = normalizePhone(rawPhone);
    const existing = await this.findContactByPhone(normalized);
    if (existing) {
      return existing;
    }

    const orgId = MockStateStore.getState().organization.id;
    const newContact = createContactIdentity(orgId, name, rawPhone, email);

    MockStateStore.updateState(state => ({
      ...state,
      contacts: [newContact, ...state.contacts],
    }));

    return newContact;
  }
}

export const contactRepository = new MockContactRepository();
