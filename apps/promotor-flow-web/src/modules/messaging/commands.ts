import { MessagingPort } from './ports';
import type {
  ContactWaOutcome,
  SendWaMessageResponse,
  WaPairingStartResponse,
  MarkWaInboxReadResponse,
} from '@promotor/contracts';

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

    async sendWhatsApp(input: {
      contactId: string;
      text: string;
      nextActionId?: string;
      outcome?: ContactWaOutcome;
      scheduleNextFollowUpDays?: number;
    }): Promise<SendWaMessageResponse> {
      return messagingPort.sendWhatsApp(input);
    },

    async startWhatsAppPairing(): Promise<WaPairingStartResponse> {
      return messagingPort.startWhatsAppPairing();
    },

    async markWhatsAppInboxRead(): Promise<MarkWaInboxReadResponse> {
      return messagingPort.markWhatsAppInboxRead();
    },
  };
}
