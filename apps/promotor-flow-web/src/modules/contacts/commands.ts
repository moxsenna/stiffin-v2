import { ContactRepositoryPort } from './ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { normalizePhone } from '@promotor/platform-core';

export interface CreateContactInput {
  organizationId: string;
  name: string;
  rawPhone: string;
  sourceChannel?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateContactResult {
  contact: FlowContact;
  isExisting: boolean;
}

export function createContactCommands(repo: ContactRepositoryPort) {
  return {
    async createContact(input: CreateContactInput): Promise<CreateContactResult> {
      const phoneE164 = normalizePhone(input.rawPhone);

      // Check if canonical contact already exists
      const existing = await repo.findContactByPhone(input.organizationId, phoneE164);
      if (existing) {
        return {
          contact: existing,
          isExisting: true,
        };
      }

      // Create new contact
      const newContact: Omit<FlowContact, 'createdAt' | 'updatedAt'> = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        organizationId: input.organizationId,
        name: input.name.trim(),
        phoneE164,
        stage: 'NEW',
        classification: 'PROSPECT',
        sourceChannel: input.sourceChannel || 'Manual Entry',
        notes: input.notes,
        tags: input.tags || ['New Lead'],
      };

      const created = await repo.createContact(newContact);
      return {
        contact: created,
        isExisting: false,
      };
    },

    async updateContactIdentity(contactId: string, updates: Partial<FlowContact>): Promise<FlowContact> {
      return repo.updateContact(contactId, updates);
    },
  };
}
