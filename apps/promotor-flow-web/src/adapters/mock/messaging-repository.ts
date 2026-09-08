import { MessagingPort } from '@/modules/messaging/ports';
import { NextActionRepositoryPort } from '@/modules/next-actions/ports';
import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { LifecycleRepositoryPort } from '@/modules/lifecycle/ports';
import { ClockPort } from '@/modules/clock/ports';
import type { ContactWaOutcome } from '@promotor/contracts';

const DAY_MS = 24 * 3600_000;

function resolveMockOutcomeEffect(
  outcome: ContactWaOutcome | undefined,
  now: Date
): {
  stage: 'INTERESTED' | null;
  followUp: { actionType: 'FOLLOW_UP' | 'MANUAL'; title: string; dueAt: Date; idempotencyKey: string } | null;
  nextFollowUpDays: number | null;
} {
  switch (outcome) {
    case 'INTERESTED_TEST':
      return {
        stage: 'INTERESTED',
        followUp: {
          actionType: 'FOLLOW_UP',
          title: 'Ajak booking Tes STIFIn',
          dueAt: new Date(now.getTime() + 2 * DAY_MS),
          idempotencyKey: '',
        },
        nextFollowUpDays: null,
      };
    case 'ASK_SCHEDULE':
      return {
        stage: null,
        followUp: {
          actionType: 'MANUAL',
          title: 'Kunci jadwal konsultasi',
          dueAt: new Date(now.getTime() + 1 * DAY_MS),
          idempotencyKey: '',
        },
        nextFollowUpDays: null,
      };
    case 'WAIT_PAYDAY':
      return { stage: null, followUp: null, nextFollowUpDays: 3 };
    case 'NO_RESPONSE':
      return { stage: null, followUp: null, nextFollowUpDays: 2 };
    default:
      return { stage: null, followUp: null, nextFollowUpDays: null };
  }
}

export class MockMessagingRepository implements MessagingPort {
  constructor(
    private actionRepo: NextActionRepositoryPort,
    private activityRepo: ActivityRepositoryPort,
    private clock: ClockPort,
    private lifecycleRepo?: LifecycleRepositoryPort
  ) {}

  async recordWhatsAppOpened(_contactId: string, _rawText: string): Promise<void> {
    // In mock mode, opening WhatsApp does not mutate action state
  }

  async confirmWhatsAppSent(input: {
    contactId: string;
    nextActionId?: string;
    messageText: string;
    scheduleNextFollowUpDays?: number;
    outcome?: ContactWaOutcome;
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

    const effect = resolveMockOutcomeEffect(input.outcome, this.clock.now());

    // Create explicit follow-up BEFORE the stage change so no generic
    // follow-up duplicates it (mirrors the API INTERESTED entry guard).
    if (effect.followUp && input.nextActionId) {
      const idempotencyKey = `wa-outcome:${input.outcome}:${input.nextActionId}`;
      const dueAt = effect.followUp.dueAt.toISOString();
      const existing = await this.actionRepo.findByIdempotencyKey(idempotencyKey);
      if (!existing) {
        await this.actionRepo.createNextAction({
          contactId: input.contactId,
          organizationId: '',
          actionType: effect.followUp.actionType,
          title: effect.followUp.title,
          dueAt,
          status: 'PENDING',
          source: 'PROMOTORFLOW',
          idempotencyKey,
        });
      }
    } else {
      const days = input.scheduleNextFollowUpDays ?? effect.nextFollowUpDays ?? 0;
      if (days > 0) {
        const keyOutcome = input.outcome ?? 'MANUAL';
        const idempotencyKey = input.nextActionId
          ? `wa-outcome:${keyOutcome}:${input.nextActionId}`
          : undefined;
        const dueAt = this.clock.addDays(this.clock.now(), days).toISOString();
        const existing = idempotencyKey
          ? await this.actionRepo.findByIdempotencyKey(idempotencyKey)
          : null;
        if (!existing) {
          await this.actionRepo.createNextAction({
            contactId: input.contactId,
            organizationId: '',
            actionType: 'FOLLOW_UP',
            title: `Follow-up ${days} hari lagi`,
            dueAt,
            status: 'PENDING',
            source: 'PROMOTORFLOW',
            ...(idempotencyKey ? { idempotencyKey } : {}),
          });
        }
      }
    }

    if (effect.stage && this.lifecycleRepo) {
      await this.lifecycleRepo.updateStage(input.contactId, effect.stage);
    }

    return {
      success: true,
      nextActionId: input.nextActionId,
    };
  }
}
