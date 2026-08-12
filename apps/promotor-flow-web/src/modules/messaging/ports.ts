import { MessageTemplate, NextActionType } from '@promotor/promotor-flow-fixtures';

export interface MessageTemplateRepositoryPort {
  listTemplates(): Promise<MessageTemplate[]>;
  getTemplateByCategory(category: NextActionType): Promise<MessageTemplate | null>;
}
