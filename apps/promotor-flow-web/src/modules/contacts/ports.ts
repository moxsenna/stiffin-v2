import { FlowContact } from '@promotor/promotor-flow-fixtures';

export interface ContactRepositoryPort {
  listContacts(organizationId: string, search?: string, filter?: 'ALL' | 'PROSPECT' | 'CLIENT'): Promise<FlowContact[]>;
  getContactDetail(organizationId: string, contactId: string): Promise<FlowContact | null>;
  findContactByPhone(organizationId: string, phoneE164: string): Promise<FlowContact | null>;
  createContact(contact: Omit<FlowContact, 'createdAt' | 'updatedAt'>): Promise<FlowContact>;
  updateContact(contactId: string, updates: Partial<FlowContact>): Promise<FlowContact>;
}
