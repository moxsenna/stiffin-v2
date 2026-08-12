import { Contact } from '@promotor/contracts';

export interface ContactPort {
  getContacts(): Promise<Contact[]>;
  getContactById(id: string): Promise<Contact | undefined>;
  findContactByPhone(phone: string): Promise<Contact | undefined>;
  matchOrCreateContact(name: string, rawPhone: string, email?: string): Promise<Contact>;
}
