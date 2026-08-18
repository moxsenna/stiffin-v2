import test from 'node:test';
import assert from 'node:assert/strict';

import { createBookingCommands } from '../modules/bookings/commands';
import { createLifecycleCommands } from '../modules/lifecycle/commands';
import { createNextActionCommands } from '../modules/next-actions/commands';
import { createAftercareCommands } from '../modules/aftercare/commands';
import { createMessagingCommands } from '../modules/messaging/commands';
import { HttpBookingRepository } from '../adapters/http/booking-repository';
import { HttpLifecycleRepository } from '../adapters/http/lifecycle-repository';
import { HttpNextActionRepository } from '../adapters/http/next-action-repository';
import { HttpAftercareRepository } from '../adapters/http/aftercare-repository';
import { HttpMessagingRepository } from '../adapters/http/messaging-repository';
import { HttpActivityRepository } from '../adapters/http/activity-repository';
import { MockClock } from '../adapters/mock/mock-clock';

// Mock PromotorFlowApiClient spying on every HTTP invocation
class SpyingFlowApiClient {
  public calls: Array<{ method: string; path: string; data?: any }> = [];

  async getContactActivities(contactId: string) {
    this.calls.push({ method: 'GET', path: `/api/v1/flow/contacts/${contactId}/activities` });
    return { activities: [] };
  }

  async createBooking(data: any) {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/bookings', data });
    return {
      booking: {
        id: 'bk_created_server',
        organizationId: 'org_1',
        contactId: data.contactId,
        serviceId: data.serviceId,
        serviceTitle: 'Konsultasi STIFIn',
        startAt: data.startAt,
        endAt: data.endAt,
        locationType: data.locationType,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        amount: 500000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async completeBooking(id: string) {
    this.calls.push({ method: 'POST', path: `/api/v1/flow/bookings/${id}/complete` });
    return {
      booking: {
        id,
        organizationId: 'org_1',
        contactId: 'ct_1',
        serviceId: 'srv_1',
        serviceTitle: 'Konsultasi STIFIn',
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
        locationType: 'ONLINE',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        amount: 500000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async transitionContactStage(contactId: string, data: any) {
    this.calls.push({ method: 'PATCH', path: `/api/v1/flow/contacts/${contactId}/stage`, data });
    return {
      contact: {
        id: contactId,
        organizationId: 'org_1',
        name: 'Test Contact',
        phoneE164: '+6281234567890',
        stage: data.stage,
        classification: 'PROSPECT',
        lostReason: data.lostReason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  async skipNextAction(id: string, data: any) {
    this.calls.push({ method: 'POST', path: `/api/v1/flow/next-actions/${id}/skip`, data });
    return {
      nextAction: {
        id,
        status: 'SKIPPED',
        organizationId: 'org_1',
        contactId: 'ct_1',
        actionType: 'CONTACT_LEAD',
        title: 'Action Skipped',
        dueAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    };
  }

  async completeAftercareAction(id: string, data: any) {
    this.calls.push({ method: 'POST', path: `/api/v1/flow/next-actions/${id}/aftercare-complete`, data });
    return {
      nextAction: {
        id,
        status: 'COMPLETED',
        organizationId: 'org_1',
        contactId: 'ct_1',
        actionType: 'AFTERCARE',
        title: 'Aftercare Selesai',
        dueAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    };
  }

  async recordWhatsAppOpened(data: any) {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/messaging/whatsapp-opened', data });
    return { success: true, contactId: data.contactId, phoneE164: data.phoneE164 };
  }

  async confirmWhatsAppSent(data: any) {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/messaging/confirm-sent', data });
    return { success: true, nextActionId: data.nextActionId };
  }
}

// ----------------------------------------------------
// A11 HTTP Mode Production Composition Invariant Tests
// ----------------------------------------------------
test('HTTP Mode: Booking creation issues exactly ONE server mutation without client-side side-effects', async () => {
  const originalMode = process.env.NEXT_PUBLIC_API_MODE;
  process.env.NEXT_PUBLIC_API_MODE = 'http';

  try {
    const spy = new SpyingFlowApiClient();
    const bookingRepo = new HttpBookingRepository(spy as any);
    const lifecycleRepo = new HttpLifecycleRepository(spy as any);
    const nextActionRepo = new HttpNextActionRepository(spy as any);
    const activityRepo = new HttpActivityRepository(spy as any);
    const clock = new MockClock('2026-08-18T10:00:00+07:00');

    const commands = createBookingCommands(bookingRepo, lifecycleRepo, nextActionRepo, activityRepo, clock);

    const result = await commands.createBooking({
      contactId: 'contact_123',
      serviceId: 'srv_personal',
      serviceTitle: 'Tes Personal',
      startAt: '2026-08-20T10:00:00+07:00',
      endAt: '2026-08-20T11:00:00+07:00',
      locationType: 'ON_SITE',
      paymentStatus: 'UNPAID',
      amount: 999999, // Should NOT be trusted by server request
    });

    assert.equal(result.id, 'bk_created_server');
    assert.equal(spy.calls.length, 1, 'Exactly one HTTP call must be made');
    assert.equal(spy.calls[0].path, '/api/v1/flow/bookings');
    assert.equal(spy.calls[0].method, 'POST');
    assert.equal((spy.calls[0].data as any).amount, undefined, 'Client amount must NOT be sent to server');
  } finally {
    process.env.NEXT_PUBLIC_API_MODE = originalMode;
  }
});

test('HTTP Mode: Booking completion issues exactly ONE complete command without client aftercare creation', async () => {
  const originalMode = process.env.NEXT_PUBLIC_API_MODE;
  process.env.NEXT_PUBLIC_API_MODE = 'http';

  try {
    const spy = new SpyingFlowApiClient();
    const bookingRepo = new HttpBookingRepository(spy as any);
    const lifecycleRepo = new HttpLifecycleRepository(spy as any);
    const nextActionRepo = new HttpNextActionRepository(spy as any);
    const activityRepo = new HttpActivityRepository(spy as any);
    const clock = new MockClock('2026-08-18T10:00:00+07:00');

    const commands = createBookingCommands(bookingRepo, lifecycleRepo, nextActionRepo, activityRepo, clock);

    await commands.completeBooking('bk_123');

    assert.equal(spy.calls.length, 1, 'Exactly one HTTP call made');
    assert.equal(spy.calls[0].path, '/api/v1/flow/bookings/bk_123/complete');
    assert.equal(spy.calls[0].method, 'POST');
  } finally {
    process.env.NEXT_PUBLIC_API_MODE = originalMode;
  }
});

test('HTTP Mode: Lifecycle transition issues ONE stage mutation without client follow-up creation or cancel loops', async () => {
  const originalMode = process.env.NEXT_PUBLIC_API_MODE;
  process.env.NEXT_PUBLIC_API_MODE = 'http';

  try {
    const spy = new SpyingFlowApiClient();
    const lifecycleRepo = new HttpLifecycleRepository(spy as any);
    const activityRepo = new HttpActivityRepository(spy as any);

    const commands = createLifecycleCommands(lifecycleRepo, activityRepo);

    // 1. INTERESTED
    await commands.changeStage('contact_456', 'INTERESTED');
    assert.equal(spy.calls.length, 1);
    assert.equal(spy.calls[0].path, '/api/v1/flow/contacts/contact_456/stage');
    assert.equal(spy.calls[0].data.stage, 'INTERESTED');

    // 2. LOST
    spy.calls = [];
    await commands.changeStage('contact_456', 'LOST', 'Harga terlalu mahal');
    assert.equal(spy.calls.length, 1);
    assert.equal(spy.calls[0].path, '/api/v1/flow/contacts/contact_456/stage');
    assert.equal(spy.calls[0].data.stage, 'LOST');
    assert.equal(spy.calls[0].data.lostReason, 'Harga terlalu mahal');
  } finally {
    process.env.NEXT_PUBLIC_API_MODE = originalMode;
  }
});

test('HTTP Mode: Skip next action issues ONE skip endpoint call with exact user nextStep', async () => {
  const originalMode = process.env.NEXT_PUBLIC_API_MODE;
  process.env.NEXT_PUBLIC_API_MODE = 'http';

  try {
    const spy = new SpyingFlowApiClient();
    const nextActionRepo = new HttpNextActionRepository(spy as any);
    const activityRepo = new HttpActivityRepository(spy as any);

    const commands = createNextActionCommands(nextActionRepo, activityRepo);

    const userNextStep = {
      type: 'FOLLOW_UP' as const,
      title: 'Follow-up minggu depan khusus',
      dueAt: '2026-08-25T10:00:00+07:00',
      description: 'Catatan penting pengguna',
    };

    await commands.skipNextAction('act_999', userNextStep);

    assert.equal(spy.calls.length, 1, 'Only one HTTP skip call executed');
    assert.equal(spy.calls[0].path, '/api/v1/flow/next-actions/act_999/skip');
    assert.deepEqual(spy.calls[0].data.nextStep, userNextStep, 'Exact user nextStep sent without hardcoded replacement');
  } finally {
    process.env.NEXT_PUBLIC_API_MODE = originalMode;
  }
});

test('HTTP Mode: Aftercare completion issues ONE aftercare-complete call without client follow-on creation', async () => {
  const originalMode = process.env.NEXT_PUBLIC_API_MODE;
  process.env.NEXT_PUBLIC_API_MODE = 'http';

  try {
    const spy = new SpyingFlowApiClient();
    const aftercareRepo = new HttpAftercareRepository(spy as any);
    const nextActionRepo = new HttpNextActionRepository(spy as any);
    const activityRepo = new HttpActivityRepository(spy as any);
    const clock = new MockClock('2026-08-18T10:00:00+07:00');

    const commands = createAftercareCommands(aftercareRepo, nextActionRepo, activityRepo, clock);

    await commands.completeAftercare('act_aftercare_1', 'CONTACT_LATER', 'Klien meminta kontak bulan depan');

    assert.equal(spy.calls.length, 1, 'Only one aftercare completion HTTP call');
    assert.equal(spy.calls[0].path, '/api/v1/flow/next-actions/act_aftercare_1/aftercare-complete');
    assert.equal(spy.calls[0].data.outcome, 'CONTACT_LATER');
    assert.equal(spy.calls[0].data.notes, 'Klien meminta kontak bulan depan');
  } finally {
    process.env.NEXT_PUBLIC_API_MODE = originalMode;
  }
});

test('HTTP Mode: Messaging records opened and confirms sent via canonical API endpoints', async () => {
  const originalMode = process.env.NEXT_PUBLIC_API_MODE;
  process.env.NEXT_PUBLIC_API_MODE = 'http';

  try {
    const spy = new SpyingFlowApiClient();
    const messagingRepo = new HttpMessagingRepository(spy as any);
    const commands = createMessagingCommands(messagingRepo);

    // 1. Record opened
    await commands.recordWhatsAppOpened('contact_777', '+6281234567890');
    assert.equal(spy.calls.length, 1);
    assert.equal(spy.calls[0].path, '/api/v1/flow/messaging/whatsapp-opened');
    assert.equal(spy.calls[0].data.contactId, 'contact_777');
    assert.equal(spy.calls[0].data.phoneE164, '+6281234567890');

    // 2. Confirm sent
    spy.calls = [];
    await commands.confirmWhatsAppSent({
      contactId: 'contact_777',
      actionId: 'act_777',
      messageText: 'Pesan konfirmasi dikirim',
      scheduleNextFollowUpDays: 5,
    });

    assert.equal(spy.calls.length, 1);
    assert.equal(spy.calls[0].path, '/api/v1/flow/messaging/confirm-sent');
    assert.equal(spy.calls[0].data.contactId, 'contact_777');
    assert.equal(spy.calls[0].data.nextActionId, 'act_777');
    assert.equal(spy.calls[0].data.messageText, 'Pesan konfirmasi dikirim');
    assert.equal(spy.calls[0].data.scheduleNextFollowUpDays, 5);
  } finally {
    process.env.NEXT_PUBLIC_API_MODE = originalMode;
  }
});
