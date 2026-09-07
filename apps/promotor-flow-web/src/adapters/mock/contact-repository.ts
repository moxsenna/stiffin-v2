import { ContactRepositoryPort, ContactFilterQuery } from '@/modules/contacts/ports';
import { FlowContact } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockContactRepository implements ContactRepositoryPort {
  constructor(private store: MockStateStore) {}

  private resolveOrgId(organizationId?: string): string {
    return organizationId || 'org_rina_stifin';
  }

  async listContacts(
    search?: string,
    filter?: ContactFilterQuery,
    organizationId?: string
  ): Promise<FlowContact[]> {
    const orgId = this.resolveOrgId(organizationId);
    let contacts = this.store.getContacts().filter((c) => c.organizationId === orgId);

    let classification: 'PROSPECT' | 'CLIENT' | undefined;
    let stage: string | undefined;
    let neverContacted: boolean | undefined;
    let followUpOverdue: boolean | undefined;

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

    if (classification) {
      contacts = contacts.filter((c) => c.classification === classification);
    }
    if (stage) {
      contacts = contacts.filter((c) => c.stage === stage);
    }
    if (neverContacted) {
      const waContactIds = new Set(
        this.store
          .getActivities()
          .filter((a) => a.type === 'WA_SENT' || (a.type as string) === 'WHATSAPP_SENT')
          .map((a) => a.contactId)
      );
      contacts = contacts.filter((c) => !waContactIds.has(c.id));
    }
    if (followUpOverdue) {
      const nowIso = new Date().toISOString();
      const overdueContactIds = new Set(
        this.store
          .getNextActions()
          .filter((a) => a.status === 'PENDING' && a.dueAt < nowIso)
          .map((a) => a.contactId)
      );
      contacts = contacts.filter((c) => overdueContactIds.has(c.id));
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      contacts = contacts.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phoneE164.includes(q) || (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    return contacts;
  }

  async getContactDetail(contactId: string, organizationId?: string): Promise<FlowContact | null> {
    const orgId = this.resolveOrgId(organizationId);
    const contact = this.store.getContacts().find((c) => c.organizationId === orgId && c.id === contactId);
    return contact || null;
  }

  async findContactByPhone(phoneE164: string, organizationId?: string): Promise<FlowContact | null> {
    const orgId = this.resolveOrgId(organizationId);
    const contact = this.store.getContacts().find(
      (c) => c.organizationId === orgId && c.phoneE164 === phoneE164
    );
    return contact || null;
  }

  async createContact(contactInput: Omit<FlowContact, 'createdAt' | 'updatedAt'>): Promise<FlowContact> {
    const now = new Date().toISOString();
    const contact: FlowContact = {
      ...contactInput,
      createdAt: now,
      updatedAt: now,
    };
    this.store.addContact(contact);
    return contact;
  }

  async updateContact(contactId: string, updates: Partial<FlowContact>): Promise<FlowContact> {
    return this.store.updateContact(contactId, updates);
  }
}
