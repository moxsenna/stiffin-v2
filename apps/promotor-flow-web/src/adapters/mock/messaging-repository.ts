import { MessagingPort } from '@/modules/messaging/ports';
import { NextActionRepositoryPort } from '@/modules/next-actions/ports';
import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { LifecycleRepositoryPort } from '@/modules/lifecycle/ports';
import { ClockPort } from '@/modules/clock/ports';
import type {
  ContactWaOutcome,
  WaStatusResponse,
  WaPairingStartResponse,
  SendWaMessageResponse,
  WaInboxMessage,
  MarkWaInboxReadResponse,
} from '@promotor/contracts';

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
  private pairingRequestedAt: number | null = null;
  private mockInbox: WaInboxMessage[] = [
    {
      id: 'mock-inbox-1',
      contactId: 'mock-contact-1',
      contactName: 'Budi Santoso',
      phoneE164: '+6281234567890',
      type: 'text',
      text: 'Halo kak, tes STIFIn hari Sabtu besok masih ada slot?',
      receivedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      isRead: false,
    },
  ];

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

  async getWhatsAppStatus(): Promise<WaStatusResponse> {
    if (!this.pairingRequestedAt) {
      return {
        stage: 'not_connected',
        phone: null,
        deviceId: null,
      };
    }
    const elapsed = Date.now() - this.pairingRequestedAt;
    if (elapsed < 2000) {
      return {
        stage: 'connecting',
        phone: null,
        deviceId: 'mock-device-id',
      };
    }
    return {
      stage: 'connected',
      phone: '+6281234567890',
      deviceId: 'mock-device-id',
    };
  }

  async startWhatsAppPairing(): Promise<WaPairingStartResponse> {
    this.pairingRequestedAt = Date.now();
    return {
      deviceId: 'mock-device-id',
      pairingToken: 'mock-pairing-token',
      gatewayUrl: 'http://localhost:3000/mock-gateway',
    };
  }

  async sendWhatsApp(input: {
    contactId: string;
    text: string;
    nextActionId?: string;
    outcome?: ContactWaOutcome;
    scheduleNextFollowUpDays?: number;
  }): Promise<SendWaMessageResponse> {
    if (input.nextActionId) {
      await this.confirmWhatsAppSent({
        contactId: input.contactId,
        nextActionId: input.nextActionId,
        messageText: input.text,
        scheduleNextFollowUpDays: input.scheduleNextFollowUpDays,
        outcome: input.outcome,
      });
    } else {
      await this.activityRepo.appendActivity({
        contactId: input.contactId,
        organizationId: '',
        title: 'WhatsApp dikirim',
        detail: input.text,
        timestamp: this.clock.nowIso(),
        type: 'WA_SENT',
      });
    }
    return {
      messageId: `mock-msg-${Date.now()}`,
      status: 'sent',
    };
  }

  async listWhatsAppInbox(): Promise<WaInboxMessage[]> {
    return [...this.mockInbox];
  }

  async markWhatsAppInboxRead(): Promise<MarkWaInboxReadResponse> {
    this.mockInbox.forEach((m) => {
      m.isRead = true;
    });
    return { ok: true };
  }
}
