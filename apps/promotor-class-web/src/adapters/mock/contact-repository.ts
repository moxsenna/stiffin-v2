import { Contact, PhoneE164 } from '@promotor/contracts';
import { normalizePhone } from '@promotor/platform-core';
import { MockStateStore } from './mock-state-store';
import { ContactRepositoryPort } from '@/modules/contacts/ports';

export class MockContactRepository implements ContactRepositoryPort {
  async getContacts(): Promise<Contact[]> {
    return MockStateStore.getState().contacts;
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    return MockStateStore.getState().contacts.find(c => c.id === id);
  }

  async getContactByPhone(phoneE164: PhoneE164): Promise<Contact | undefined> {
    return MockStateStore.getState().contacts.find(c => c.phoneE164 === phoneE164);
  }

  async matchOrCreateContact(name: string, phoneRaw: string): Promise<Contact> {
    const normalizedE164 = normalizePhone(phoneRaw);
    const existing = await this.getContactByPhone(normalizedE164);
    if (existing) {
      return existing;
    }

    const newContact: Contact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: MockStateStore.getState().organization.id,
      name: name.trim(),
      phoneE164: normalizedE164,
      createdAt: new Date().toISOString(),
    };

    MockStateStore.updateState(state => ({
      ...state,
      contacts: [newContact, ...state.contacts],
    }));

    return newContact;
  }
}

export const contactRepository = new MockContactRepository();
