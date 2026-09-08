import { MessageTemplate, NextActionType } from '@promotor/promotor-flow-fixtures';
import type { ContactWaOutcome, MessageTemplateTone } from '@promotor/contracts';

export interface MessageTemplateRepositoryPort {
  listTemplates(): Promise<MessageTemplate[]>;
  getTemplateByCategory(category: NextActionType, tone?: MessageTemplateTone | null): Promise<MessageTemplate | null>;
}

export interface MessagingPort {
  recordWhatsAppOpened(contactId: string, rawText: string): Promise<void>;
  confirmWhatsAppSent(input: {
    contactId: string;
    nextActionId?: string;
    messageText: string;
    scheduleNextFollowUpDays?: number;
    outcome?: ContactWaOutcome;
  }): Promise<{ success: boolean; nextActionId?: string }>;
}
