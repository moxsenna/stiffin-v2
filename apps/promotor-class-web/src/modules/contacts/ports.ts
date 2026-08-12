import { Contact, PhoneE164 } from '@promotor/contracts';

export interface ContactRepositoryPort {
  getContacts(): Promise<Contact[]>;
  getContactById(id: string): Promise<Contact | undefined>;
  getContactByPhone(phoneE164: PhoneE164): Promise<Contact | undefined>;
  matchOrCreateContact(name: string, phoneRaw: string): Promise<Contact>;
}
