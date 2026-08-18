import { NextActionRepositoryPort } from '../next-actions/ports';
import { ActivityRepositoryPort } from '../activities/ports';
import { ClockPort } from '../clock/ports';
import { NextActionType } from '@promotor/promotor-flow-fixtures';

export interface ConfirmWASentInput {
  organizationId?: string;
  contactId: string;
  actionId: string;
  messageText: string;
  scheduleNextFollowUpDays?: number;
  nextActionType?: NextActionType;
  nextActionTitle?: string;
}

export function createMessagingCommands(
  actionRepo: NextActionRepositoryPort,
  activityRepo: ActivityRepositoryPort,
  clock: ClockPort
) {
  return {
    async confirmWhatsAppSent(input: ConfirmWASentInput): Promise<void> {
      // 1. Complete action via semantic completeAction port
      await actionRepo.completeAction(input.actionId);

      // In mock mode, append timeline activity and handle follow-up
      if (process.env.NEXT_PUBLIC_API_MODE !== 'http') {
        await activityRepo.appendActivity({
          organizationId: input.organizationId || '',
          contactId: input.contactId,
          title: 'WhatsApp dikirim',
          detail: input.messageText,
          timestamp: clock.nowIso(),
          type: 'WA_SENT',
        });

        if (input.scheduleNextFollowUpDays && input.scheduleNextFollowUpDays > 0) {
          const dueAt = clock.addDays(clock.now(), input.scheduleNextFollowUpDays).toISOString();
          await actionRepo.createNextAction({
            organizationId: input.organizationId || '',
            contactId: input.contactId,
            actionType: input.nextActionType || 'FOLLOW_UP',
            title: input.nextActionTitle || `Follow-up ${input.scheduleNextFollowUpDays} hari lagi`,
            dueAt,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
          });
        }
      }
    },
  };
}
