import { MessageTemplateRepositoryPort } from '@/modules/messaging/ports';
import { MessageTemplate, NextActionType } from '@promotor/promotor-flow-fixtures';
import type { MessageTemplateTone } from '@promotor/contracts';
import { PromotorFlowApiClient } from '@promotor/api-client';
import { pickTemplateByTone } from '@/modules/messaging/queries';

export class HttpMessageTemplateRepository implements MessageTemplateRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listTemplates(): Promise<MessageTemplate[]> {
    const res = await this.api.listMessageTemplates();
    return (res.templates || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      category: t.category as NextActionType,
      templateText: t.templateText ?? t.bodyText ?? '',
      tone: t.tone ?? null,
      isActive: t.isActive ?? true,
    }));
  }

  async getTemplateByCategory(category: NextActionType, tone?: MessageTemplateTone | null): Promise<MessageTemplate | null> {
    const res = await this.api.listMessageTemplates({ category: category as any });
    const templates: MessageTemplate[] = (res.templates || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      category: t.category as NextActionType,
      templateText: t.templateText ?? t.bodyText ?? '',
      tone: t.tone ?? null,
      isActive: t.isActive ?? true,
    }));
    return pickTemplateByTone(templates, category, tone) ?? null;
  }
}
