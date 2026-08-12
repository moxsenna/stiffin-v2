import { ContactRepositoryPort } from './ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';

export function createContactQueries(repo: ContactRepositoryPort) {
  return {
    async listContacts(organizationId: string, search?: string, filter?: 'ALL' | 'PROSPECT' | 'CLIENT'): Promise<FlowContact[]> {
      return repo.listContacts(organizationId, search, filter);
    },

    async getContactDetail(organizationId: string, contactId: string): Promise<FlowContact | null> {
      return repo.getContactDetail(organizationId, contactId);
    },

    async findContactByPhone(organizationId: string, phoneE164: string): Promise<FlowContact | null> {
      return repo.findContactByPhone(organizationId, phoneE164);
    },
  };
}
