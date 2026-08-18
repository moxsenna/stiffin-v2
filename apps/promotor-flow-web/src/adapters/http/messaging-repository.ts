import { MessagingPort } from '@/modules/messaging/ports';
import { PromotorFlowApiClient } from '@promotor/api-client';

export class HttpMessagingRepository implements MessagingPort {
  constructor(private api: PromotorFlowApiClient) {}

  async recordWhatsAppOpened(contactId: string, phoneE164: string): Promise<void> {
    await this.api.recordWhatsAppOpened({ contactId, phoneE164 });
  }

  async confirmWhatsAppSent(input: {
    contactId: string;
    nextActionId?: string;
    messageText: string;
    scheduleNextFollowUpDays?: number;
  }): Promise<{ success: boolean; nextActionId?: string }> {
    const res = await this.api.confirmWhatsAppSent({
      contactId: input.contactId,
      nextActionId: input.nextActionId,
      messageText: input.messageText,
      scheduleNextFollowUpDays: input.scheduleNextFollowUpDays,
    });
    return {
      success: res.success,
      nextActionId: res.nextActionId,
    };
  }
}
