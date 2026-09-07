import { FlowContact } from '@promotor/promotor-flow-fixtures';

export type ContactFilterQuery =
  | 'ALL'
  | 'PROSPECT'
  | 'CLIENT'
  | string
  | {
      classification?: 'PROSPECT' | 'CLIENT';
      stage?: string;
      neverContacted?: boolean;
      followUpOverdue?: boolean;
    };

export interface ContactRepositoryPort {
  listContacts(search?: string, filter?: ContactFilterQuery, organizationId?: string): Promise<FlowContact[]>;
  getContactDetail(contactId: string, organizationId?: string): Promise<FlowContact | null>;
  findContactByPhone(phoneE164: string, organizationId?: string): Promise<FlowContact | null>;
  createContact(contact: Omit<FlowContact, 'createdAt' | 'updatedAt'>): Promise<FlowContact>;
  updateContact(contactId: string, updates: Partial<FlowContact>): Promise<FlowContact>;
  addNote?(contactId: string, body: string): Promise<any>;
}
