import { FlowContact } from '@promotor/promotor-flow-fixtures';

export interface ContactRepositoryPort {
  listContacts(search?: string, filter?: 'ALL' | 'PROSPECT' | 'CLIENT', organizationId?: string): Promise<FlowContact[]>;
  getContactDetail(contactId: string, organizationId?: string): Promise<FlowContact | null>;
  findContactByPhone(phoneE164: string, organizationId?: string): Promise<FlowContact | null>;
  createContact(contact: Omit<FlowContact, 'createdAt' | 'updatedAt'>): Promise<FlowContact>;
  updateContact(contactId: string, updates: Partial<FlowContact>): Promise<FlowContact>;
}
