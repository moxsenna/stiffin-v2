import { MessageTemplateRepositoryPort } from '@/modules/messaging/ports';
import { MessageTemplate, NextActionType } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockMessageTemplateRepository implements MessageTemplateRepositoryPort {
  constructor(private store: MockStateStore) {}

  async listTemplates(): Promise<MessageTemplate[]> {
    return this.store.getMessageTemplates();
  }

  async getTemplateByCategory(category: NextActionType): Promise<MessageTemplate | null> {
    const match = this.store.getMessageTemplates().find((t) => t.category === category);
    return match || null;
  }
}
