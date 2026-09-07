import { ContactRepositoryPort } from './ports';
import { ActivityRepositoryPort } from '../activities/ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { normalizePhone } from '@promotor/platform-core';

export interface CreateContactInput {
  name: string;
  rawPhone: string;
  organizationId?: string;
  sourceChannel?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateContactResult {
  contact: FlowContact;
  isExisting: boolean;
}

export function createContactCommands(
  repo: ContactRepositoryPort,
  activityRepo?: ActivityRepositoryPort
) {
  return {
    async createContact(input: CreateContactInput): Promise<CreateContactResult> {
      const phoneE164 = normalizePhone(input.rawPhone);

      // Check if canonical contact already exists in mock mode
      if (process.env.NEXT_PUBLIC_API_MODE !== 'http') {
        const existing = await repo.findContactByPhone(phoneE164, input.organizationId);
        if (existing) {
          return {
            contact: existing,
            isExisting: true,
          };
        }
      }

      // Create new contact
      const newContact: Omit<FlowContact, 'createdAt' | 'updatedAt'> = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        organizationId: input.organizationId || '',
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

    async addContactNote(contactId: string, body: string, organizationId?: string): Promise<any> {
      const trimmed = body ? body.trim() : '';
      if (!trimmed) {
        throw new Error('Catatan tidak boleh kosong.');
      }
      if (trimmed.length > 1000) {
        throw new Error('Catatan maksimal 1000 karakter.');
      }

      if (process.env.NEXT_PUBLIC_API_MODE !== 'http') {
        if (activityRepo) {
          await activityRepo.appendActivity({
            organizationId: organizationId || '',
            contactId,
            title: 'Catatan Cepat Ditambahkan',
            detail: trimmed,
            timestamp: new Date().toISOString(),
            type: 'NOTE_ADDED',
          });
        }
        return { success: true };
      }

      if (repo.addNote) {
        return await repo.addNote(contactId, trimmed);
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      const res = await fetch(`${baseUrl}/api/v1/flow/contacts/${encodeURIComponent(contactId)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Gagal menyimpan catatan.');
      }
      return await res.json();
    },
  };
}
