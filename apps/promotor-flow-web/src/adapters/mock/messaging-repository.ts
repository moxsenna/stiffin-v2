import { MessagingPort } from '@/modules/messaging/ports';
import { NextActionRepositoryPort } from '@/modules/next-actions/ports';
import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { ClockPort } from '@/modules/clock/ports';

export class MockMessagingRepository implements MessagingPort {
  constructor(
    private actionRepo: NextActionRepositoryPort,
    private activityRepo: ActivityRepositoryPort,
    private clock: ClockPort
  ) {}

  async recordWhatsAppOpened(_contactId: string, _rawText: string): Promise<void> {
    // In mock mode, opening WhatsApp does not mutate action state
  }

  async confirmWhatsAppSent(input: {
    contactId: string;
    nextActionId?: string;
    messageText: string;
    scheduleNextFollowUpDays?: number;
  }): Promise<{ success: boolean; nextActionId?: string }> {
    if (input.nextActionId) {
      await this.actionRepo.completeAction(input.nextActionId);
    }

    await this.activityRepo.appendActivity({
      contactId: input.contactId,
      organizationId: '',
      title: 'WhatsApp dikirim',
      detail: input.messageText,
      timestamp: this.clock.nowIso(),
      type: 'WA_SENT',
    });

    if (input.scheduleNextFollowUpDays && input.scheduleNextFollowUpDays > 0) {
      const dueAt = this.clock.addDays(this.clock.now(), input.scheduleNextFollowUpDays).toISOString();
      await this.actionRepo.createNextAction({
        contactId: input.contactId,
        organizationId: '',
        actionType: 'FOLLOW_UP',
        title: `Follow-up ${input.scheduleNextFollowUpDays} hari lagi`,
        dueAt,
        status: 'PENDING',
        source: 'PROMOTORFLOW',
      });
    }

    return {
      success: true,
      nextActionId: input.nextActionId,
    };
  }
}
