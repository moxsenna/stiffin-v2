import { MessageTemplate, NextActionType } from '@promotor/promotor-flow-fixtures';

export interface MessageTemplateRepositoryPort {
  listTemplates(): Promise<MessageTemplate[]>;
  getTemplateByCategory(category: NextActionType): Promise<MessageTemplate | null>;
}

export interface MessagingPort {
  recordWhatsAppOpened(contactId: string, phoneE164: string): Promise<void>;
  confirmWhatsAppSent(input: {
    contactId: string;
    nextActionId?: string;
    messageText: string;
    scheduleNextFollowUpDays?: number;
  }): Promise<{ success: boolean; nextActionId?: string }>;
}
