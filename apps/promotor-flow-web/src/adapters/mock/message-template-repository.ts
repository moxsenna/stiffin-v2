import { MessageTemplateRepositoryPort } from '@/modules/messaging/ports';
import { MessageTemplate, NextActionType } from '@promotor/promotor-flow-fixtures';
import type { MessageTemplateTone } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';
import { pickTemplateByTone } from '@/modules/messaging/queries';

export class MockMessageTemplateRepository implements MessageTemplateRepositoryPort {
  constructor(private store: MockStateStore) {}

  async listTemplates(): Promise<MessageTemplate[]> {
    return this.store.getMessageTemplates();
  }

  async getTemplateByCategory(category: NextActionType, tone?: MessageTemplateTone | null): Promise<MessageTemplate | null> {
    const templates = this.store.getMessageTemplates();
    return pickTemplateByTone(templates, category, tone) ?? null;
  }
}
