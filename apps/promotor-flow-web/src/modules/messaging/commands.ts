import { MessagingPort } from './ports';
import type { ContactWaOutcome } from '@promotor/contracts';

export interface ConfirmWASentInput {
  organizationId?: string;
  contactId: string;
  actionId?: string;
  messageText: string;
  scheduleNextFollowUpDays?: number;
  outcome?: ContactWaOutcome;
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
        outcome: input.outcome,
      });
    },
  };
}
