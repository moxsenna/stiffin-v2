import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockMessagingRepository } from '../adapters/mock/messaging-repository';
import { HttpMessagingRepository } from '../adapters/http/messaging-repository';
import { MockNextActionRepository } from '../adapters/mock/next-action-repository';
import { MockActivityRepository } from '../adapters/mock/activity-repository';
import { MockStateStore } from '../adapters/mock/mock-state-store';
import { SystemClock } from '../adapters/system-clock';

class SpyingWhatsAppApiClient {
  calls: Array<{ method: string; path: string; data?: any }> = [];

  async recordWhatsAppOpened(data: any) {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/messaging/whatsapp-opened', data });
    return { success: true, contactId: data.contactId, phoneE164: '+628123456789' };
  }

  async confirmWhatsAppSent(data: any) {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/messaging/confirm-sent', data });
    return { nextAction: { id: data.nextActionId, status: 'COMPLETED' } };
  }

  async getWhatsAppStatus() {
    this.calls.push({ method: 'GET', path: '/api/v1/flow/messaging/wa/status' });
    return { stage: 'connected' as const, phone: '+6281234567890', deviceId: 'dev_123' };
  }

  async startWhatsAppPairing() {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/messaging/wa/pairing/start' });
    return { deviceId: 'dev_123', pairingToken: 'token_abc', gatewayUrl: 'https://gateway.test' };
  }

  async sendWhatsApp(data: any) {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/messaging/wa/send', data });
    return { messageId: 'msg_123', status: 'sent' };
  }

  async listWhatsAppInbox() {
    this.calls.push({ method: 'GET', path: '/api/v1/flow/messaging/wa/inbox' });
    return {
      messages: [
        {
          id: 'inbox_1',
          contactId: 'c_1',
          contactName: 'Test Contact',
          phoneE164: '+6281234567890',
          type: 'text',
          text: 'Halo kak',
          receivedAt: new Date().toISOString(),
          isRead: false,
        },
      ],
    };
  }

  async markWhatsAppInboxRead() {
    this.calls.push({ method: 'POST', path: '/api/v1/flow/messaging/wa/inbox/read' });
    return { ok: true };
  }
}

describe('Wakonek WhatsApp Integration Tests', () => {
  it('MockMessagingRepository: cycles status not_connected -> connecting -> connected and manages inbox', async () => {
    const store = new MockStateStore();
    const clock = new SystemClock();
    const actionRepo = new MockNextActionRepository(store);
    const activityRepo = new MockActivityRepository(store);
    const repo = new MockMessagingRepository(actionRepo, activityRepo, clock);

    // 1. Initial status is not_connected
    const initialStatus = await repo.getWhatsAppStatus();
    assert.equal(initialStatus.stage, 'not_connected');
    assert.equal(initialStatus.phone, null);

    // 2. Start pairing returns credentials
    const pairing = await repo.startWhatsAppPairing();
    assert.ok(pairing.deviceId);
    assert.ok(pairing.pairingToken);
    assert.ok(pairing.gatewayUrl);

    // 3. Immediately after starting, status is connecting (< 2000ms)
    const connectingStatus = await repo.getWhatsAppStatus();
    assert.equal(connectingStatus.stage, 'connecting');

    // 4. Send WhatsApp message returns sent status
    const sendRes = await repo.sendWhatsApp({
      contactId: 'c_test',
      text: 'Pesan pengingat',
    });
    assert.equal(sendRes.status, 'sent');
    assert.ok(sendRes.messageId);

    // 5. List inbox returns canned message
    const inbox = await repo.listWhatsAppInbox();
    assert.ok(Array.isArray(inbox));
    assert.ok(inbox.length > 0);
    assert.equal(inbox[0].isRead, false);

    // 6. Mark read updates messages to read
    const markRes = await repo.markWhatsAppInboxRead();
    assert.equal(markRes.ok, true);
    const inboxAfter = await repo.listWhatsAppInbox();
    assert.equal(inboxAfter[0].isRead, true);
  });

  it('HttpMessagingRepository: calls canonical flow endpoints via ApiClient', async () => {
    const spy = new SpyingWhatsAppApiClient();
    const httpRepo = new HttpMessagingRepository(spy as any);

    // 1. Status
    const status = await httpRepo.getWhatsAppStatus();
    assert.equal(status.stage, 'connected');
    assert.equal(spy.calls[0].path, '/api/v1/flow/messaging/wa/status');

    // 2. Pairing start
    const pairing = await httpRepo.startWhatsAppPairing();
    assert.equal(pairing.deviceId, 'dev_123');
    assert.equal(spy.calls[1].path, '/api/v1/flow/messaging/wa/pairing/start');

    // 3. Send message
    const send = await httpRepo.sendWhatsApp({
      contactId: 'c_abc',
      text: 'Halo follow up',
      nextActionId: 'act_xyz',
      outcome: 'INTERESTED_TEST',
    });
    assert.equal(send.status, 'sent');
    assert.equal(spy.calls[2].path, '/api/v1/flow/messaging/wa/send');
    assert.equal(spy.calls[2].data.contactId, 'c_abc');
    assert.equal(spy.calls[2].data.outcome, 'INTERESTED_TEST');

    // 4. List inbox
    const inbox = await httpRepo.listWhatsAppInbox();
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].contactName, 'Test Contact');
    assert.equal(spy.calls[3].path, '/api/v1/flow/messaging/wa/inbox');

    // 5. Mark read
    const read = await httpRepo.markWhatsAppInboxRead();
    assert.equal(read.ok, true);
    assert.equal(spy.calls[4].path, '/api/v1/flow/messaging/wa/inbox/read');
  });
});
