import { ContactRepositoryPort } from '@/modules/contacts/ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient, ApiError } from '@promotor/api-client';

export class HttpContactRepository implements ContactRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listContacts(
    search?: string,
    filter?: 'ALL' | 'PROSPECT' | 'CLIENT',
    _organizationId?: string
  ): Promise<FlowContact[]> {
    const classification = filter === 'ALL' || !filter ? undefined : filter;
    const res = await this.api.listContacts({ search, classification });
    return (res.contacts || []).map((c: any) => this.mapToFlowContact(c));
  }

  async getContactDetail(contactId: string, _organizationId?: string): Promise<FlowContact | null> {
    try {
      const res = await this.api.getContact(contactId);
      return this.mapToFlowContact(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async findContactByPhone(phoneE164: string, _organizationId?: string): Promise<FlowContact | null> {
    const res = await this.api.listContacts({ search: phoneE164 });
    const match = (res.contacts || []).find((c: any) => c.contact?.phoneE164 === phoneE164 || c.phoneE164 === phoneE164);
    return match ? this.mapToFlowContact(match) : null;
  }

  async createContact(contact: Omit<FlowContact, 'createdAt' | 'updatedAt'>): Promise<FlowContact> {
    const res = await this.api.createContact({
      name: contact.name,
      phoneRaw: contact.phoneE164,
      sourceChannel: contact.sourceChannel || 'MANUAL',
      interest: contact.notes || 'General Inquiries',
      notes: contact.notes,
    });
    return this.mapToFlowContact(res);
  }

  async updateContact(contactId: string, updates: Partial<FlowContact>): Promise<FlowContact> {
    const res = await this.api.updateContact(contactId, {
      notes: updates.notes,
      sourceChannel: updates.sourceChannel,
      interest: updates.notes,
    });
    return this.mapToFlowContact(res);
  }

  private mapToFlowContact(c: any): FlowContact {
    const contact = c.contact ?? c;
    return {
      id: contact.id,
      organizationId: contact.organizationId,
      name: contact.name,
      phoneE164: contact.phoneE164,
      classification: c.classification ?? (contact.classification || 'PROSPECT'),
      stage: c.stage ?? (contact.stage || 'NEW'),
      notes: c.notes ?? contact.notes ?? undefined,
      sourceChannel: c.sourceChannel ?? contact.sourceChannel ?? undefined,
      createdAt: contact.createdAt ?? new Date().toISOString(),
      updatedAt: contact.updatedAt ?? new Date().toISOString(),
    };
  }
}
