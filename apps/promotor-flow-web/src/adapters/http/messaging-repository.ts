import { MessagingPort } from '@/modules/messaging/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpMessagingRepository implements MessagingPort {
  constructor(private api: PromotorFlowApiClient) {}

  async recordWhatsAppOpened(contactId: string, rawText: string): Promise<void> {
    await this.api.recordWhatsAppOpened({ contactId, rawText: rawText || 'Opening WhatsApp' });
  }

  async confirmWhatsAppSent(input: {
    contactId: string;
    nextActionId?: string;
    messageText: string;
    scheduleNextFollowUpDays?: number;
  }): Promise<{ success: boolean; nextActionId?: string }> {
    if (!input.nextActionId) {
      throw new Error('nextActionId is required to confirm WhatsApp sent');
    }
    const res = await this.api.confirmWhatsAppSent({
      nextActionId: input.nextActionId,
    });
    return {
      success: res.success,
      nextActionId: res.nextActionId,
    };
  }
}
