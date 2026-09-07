import { ContactRepositoryPort, ContactFilterQuery } from '@/modules/contacts/ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient, ApiError } from '@promotor/api-client';

export class HttpContactRepository implements ContactRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listContacts(
    search?: string,
    filter?: ContactFilterQuery,
    _organizationId?: string
  ): Promise<FlowContact[]> {
    let classification: 'PROSPECT' | 'CLIENT' | undefined;
    let stage: any = undefined;
    let neverContacted: boolean | undefined = undefined;
    let followUpOverdue: boolean | undefined = undefined;

    if (typeof filter === 'string') {
      if (filter === 'PROSPECT' || filter === 'CLIENT') {
        classification = filter;
      } else if (filter && filter !== 'ALL') {
        const sp = new URLSearchParams(filter);
        if (sp.has('classification')) classification = sp.get('classification') as any;
        if (sp.has('stage')) stage = sp.get('stage') as any;
        if (sp.has('neverContacted')) neverContacted = sp.get('neverContacted') === 'true';
        if (sp.has('followUpOverdue')) followUpOverdue = sp.get('followUpOverdue') === 'true';
      }
    } else if (filter && typeof filter === 'object') {
      classification = filter.classification;
      stage = filter.stage;
      neverContacted = filter.neverContacted;
      followUpOverdue = filter.followUpOverdue;
    }

    const res = await this.api.listContacts({
      search,
      classification,
      stage,
      neverContacted,
      followUpOverdue,
    });
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

  async addNote(contactId: string, body: string): Promise<any> {
    return this.api.addContactNote(contactId, { body });
  }

  private mapToFlowContact(c: any): FlowContact {
    const payload = c.context ?? c.contactFlow ?? c;
    const contact = payload.contact ?? payload;
    return {
      id: contact.id ?? payload.contactId,
      organizationId: contact.organizationId ?? payload.organizationId,
      name: contact.name ?? '',
      phoneE164: contact.phoneE164 ?? '',
      classification: payload.classification ?? contact.classification ?? 'PROSPECT',
      stage: payload.stage ?? contact.stage ?? 'NEW',
      notes: payload.notes ?? contact.notes ?? payload.interest ?? undefined,
      sourceChannel: payload.sourceChannel ?? contact.sourceChannel ?? undefined,
      createdAt: contact.createdAt ?? new Date().toISOString(),
      updatedAt: contact.updatedAt ?? new Date().toISOString(),
    };
  }
}
