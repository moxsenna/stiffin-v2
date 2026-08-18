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
    async recordWhatsAppOpened(contactId: string, phoneE164: string): Promise<void> {
      return messagingPort.recordWhatsAppOpened(contactId, phoneE164);
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
