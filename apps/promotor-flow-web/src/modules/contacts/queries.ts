import { ContactRepositoryPort } from './ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';

export function createContactQueries(repo: ContactRepositoryPort) {
  return {
    async listContacts(search?: string, filter?: 'ALL' | 'PROSPECT' | 'CLIENT', organizationId?: string): Promise<FlowContact[]> {
      return repo.listContacts(search, filter, organizationId);
    },

    async getContactDetail(contactId: string, organizationId?: string): Promise<FlowContact | null> {
      return repo.getContactDetail(contactId, organizationId);
    },

    async findContactByPhone(phoneE164: string, organizationId?: string): Promise<FlowContact | null> {
      return repo.findContactByPhone(phoneE164, organizationId);
    },
  };
}
