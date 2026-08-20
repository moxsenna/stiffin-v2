import { PromotorApiClient } from '@promotor/api-client';
import { Contact, PhoneE164 } from '@promotor/contracts';
import { ContactRepositoryPort } from '@/modules/contacts/ports';

export class HttpContactRepository implements ContactRepositoryPort {
  constructor(private readonly client: PromotorApiClient) {}

  async getContacts(): Promise<Contact[]> {
    const res = await this.client.listClassContacts();
    return res.contacts as Contact[];
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    const contacts = await this.getContacts();
    return contacts.find((c) => c.id === id);
  }

  async getContactByPhone(phoneE164: PhoneE164): Promise<Contact | undefined> {
    const contacts = await this.getContacts();
    return contacts.find((c) => c.phoneE164 === phoneE164);
  }

  async matchOrCreateContact(name: string, phoneRaw: string): Promise<Contact> {
    const contacts = await this.getContacts();
    const existing = contacts.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() || c.phoneE164 === phoneRaw
    );
    if (existing) return existing;
    throw new Error('Pencocokan dan pembuatan kontak harus melalui endpoint pendaftaran Platform API di mode HTTP');
  }
}
