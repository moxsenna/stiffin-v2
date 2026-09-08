import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MockStateStore } from '../adapters/mock/mock-state-store';
import { MockClock } from '../adapters/mock/mock-clock';
import { MockNextActionRepository } from '../adapters/mock/next-action-repository';
import { MockActivityRepository } from '../adapters/mock/activity-repository';
import { MockLifecycleRepository } from '../adapters/mock/lifecycle-repository';
import { MockMessagingRepository } from '../adapters/mock/messaging-repository';
import { createMessagingCommands } from '../modules/messaging/commands';

function setupMockLocalStorage() {
  const storageMap = new Map<string, string>();
  const mockLs = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };
  (globalThis as any).window = { localStorage: mockLs };
  (globalThis as any).localStorage = mockLs;
  return storageMap;
}

function setupMessaging() {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();
  const clock = new MockClock('2026-08-12T10:00:00+07:00');
  const actionRepo = new MockNextActionRepository(store);
  const activityRepo = new MockActivityRepository(store);
  const lifecycleRepo = new MockLifecycleRepository(store);
  const messagingRepo = new MockMessagingRepository(actionRepo, activityRepo, clock, lifecycleRepo);
  const messagingCmd = createMessagingCommands(messagingRepo);
  return { store, clock, actionRepo, activityRepo, messagingCmd };
}

describe('C1 wa-outcome (mock messaging)', () => {
  it('INTERESTED_TEST menutup action, stage INTERESTED, follow-up Ajak booking', async () => {
    const { store, actionRepo, messagingCmd } = setupMessaging();
    const target = (await actionRepo.getContactNextActions('contact_ayu')).find((a) => a.id === 'act_ayu_1');
    assert.ok(target);

    await messagingCmd.confirmWhatsAppSent({
      contactId: 'contact_ayu',
      actionId: target!.id,
      messageText: 'Halo Ayu',
      outcome: 'INTERESTED_TEST',
    });

    const updated = (await actionRepo.getContactNextActions('contact_ayu')).find((a) => a.id === 'act_ayu_1');
    assert.equal(updated?.status, 'COMPLETED');
    assert.equal(store.getContacts().find((c) => c.id === 'contact_ayu')?.stage, 'INTERESTED');

    const pending = (await actionRepo.getContactNextActions('contact_ayu')).filter((a) => a.status === 'PENDING');
    assert.ok(pending.some((a) => a.title === 'Ajak booking Tes STIFIn' && a.actionType === 'FOLLOW_UP'));
  });

  it('ASK_SCHEDULE membuat MANUAL Kunci jadwal, tanpa delay manual', async () => {
    const { actionRepo, messagingCmd } = setupMessaging();
    const target = (await actionRepo.getContactNextActions('contact_ayu')).find((a) => a.id === 'act_ayu_1');
    assert.ok(target);

    await messagingCmd.confirmWhatsAppSent({
      contactId: 'contact_ayu',
      actionId: target!.id,
      messageText: 'Halo Ayu',
      outcome: 'ASK_SCHEDULE',
    });

    const pending = (await actionRepo.getContactNextActions('contact_ayu')).filter((a) => a.status === 'PENDING');
    assert.ok(pending.some((a) => a.actionType === 'MANUAL' && a.title === 'Kunci jadwal konsultasi'));
  });

  it('WAIT_PAYDAY default +3 hari bila tanpa pilihan manual', async () => {
    const { clock, actionRepo, messagingCmd } = setupMessaging();

    await messagingCmd.confirmWhatsAppSent({
      contactId: 'contact_ayu',
      actionId: 'act_ayu_1',
      messageText: 'Halo Ayu',
      outcome: 'WAIT_PAYDAY',
    });

    const pending = (await actionRepo.getContactNextActions('contact_ayu')).filter((a) => a.status === 'PENDING');
    const created = pending.find((a) => a.title === 'Follow-up 3 hari lagi');
    assert.ok(created);
    assert.equal(clock.formatDayDate(created!.dueAt), 'Sabtu, 15 Agustus');
  });

  it('NO_RESPONSE default +2 hari; pilihan manual menang', async () => {
    const { actionRepo, messagingCmd } = setupMessaging();

    await messagingCmd.confirmWhatsAppSent({
      contactId: 'contact_nina',
      actionId: 'act_nina_1',
      messageText: 'Halo Nina',
      outcome: 'NO_RESPONSE',
    });

    const pending = (await actionRepo.getContactNextActions('contact_nina')).filter((a) => a.status === 'PENDING');
    assert.ok(pending.some((a) => a.title === 'Follow-up 2 hari lagi'));
    assert.equal(pending.length, 1);
  });

  it('tanpa outcome backward-compatible: hanya delay manual', async () => {
    const { actionRepo, messagingCmd } = setupMessaging();

    await messagingCmd.confirmWhatsAppSent({
      contactId: 'contact_ayu',
      actionId: 'act_ayu_1',
      messageText: 'Halo Ayu',
      scheduleNextFollowUpDays: 5,
    });

    const pending = (await actionRepo.getContactNextActions('contact_ayu')).filter((a) => a.status === 'PENDING');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].title, 'Follow-up 5 hari lagi');
  });
});
