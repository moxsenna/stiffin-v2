import { MessagingPort } from './ports';

export interface ConfirmWASentInput {
  organizationId?: string;
  contactId: string;
  actionId?: string;
  messageText: string;
  scheduleNextFollowUpDays?: number;
}

export function createMessagingCommands(messagingPort: MessagingPort) {
  return {
    async recordWhatsAppOpened(contactId: string, rawText: string): Promise<void> {
      return messagingPort.recordWhatsAppOpened(contactId, rawText);
    },

    async confirmWhatsAppSent(input: ConfirmWASentInput): Promise<void> {
      await messagingPort.confirmWhatsAppSent({
        contactId: input.contactId,
        nextActionId: input.actionId,
        messageText: input.messageText,
        scheduleNextFollowUpDays: input.scheduleNextFollowUpDays,
      });
    },
  };
}
