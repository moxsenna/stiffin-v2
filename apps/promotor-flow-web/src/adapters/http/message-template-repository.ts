import { MessageTemplateRepositoryPort } from '@/modules/messaging/ports';
import { MessageTemplate, NextActionType } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpMessageTemplateRepository implements MessageTemplateRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listTemplates(): Promise<MessageTemplate[]> {
    const res = await this.api.listMessageTemplates();
    return (res.templates || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      category: t.category as NextActionType,
      templateText: t.templateText ?? t.bodyText ?? '',
    }));
  }

  async getTemplateByCategory(category: NextActionType): Promise<MessageTemplate | null> {
    const res = await this.api.listMessageTemplates({ category: category as any });
    const match = (res.templates || [])[0];
    if (!match) return null;
    return {
      id: match.id,
      title: match.title,
      category: match.category as NextActionType,
      templateText: match.templateText ?? match.bodyText ?? '',
    };
  }
}
