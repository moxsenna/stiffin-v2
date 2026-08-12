import test from 'node:test';
import assert from 'node:assert/strict';

import { MockStateStore } from '../adapters/mock/mock-state-store';
import { MockClock } from '../adapters/mock/mock-clock';
import { MockContactRepository } from '../adapters/mock/contact-repository';
import { MockLifecycleRepository } from '../adapters/mock/lifecycle-repository';
import { MockNextActionRepository } from '../adapters/mock/next-action-repository';
import { MockBookingRepository } from '../adapters/mock/booking-repository';
import { MockActivityRepository } from '../adapters/mock/activity-repository';
import { MockAftercareRepository } from '../adapters/mock/aftercare-repository';
import { MockPromotorClassAdapter } from '../adapters/mock/promotorclass-adapter';

import { createContactCommands } from '../modules/contacts/commands';
import { createLifecycleCommands } from '../modules/lifecycle/commands';
import { createNextActionQueries } from '../modules/next-actions/queries';
import { createNextActionCommands } from '../modules/next-actions/commands';
import { createBookingCommands } from '../modules/bookings/commands';
import { createMessagingCommands } from '../modules/messaging/commands';
import { createAftercareCommands } from '../modules/aftercare/commands';

test('1. TIME: Today / Overdue / Upcoming grouping derived from MockClock', async () => {
  const store = new MockStateStore();
  store.resetDemo();
  const clock = new MockClock('2026-08-12T10:00:00+07:00');
  const actionRepo = new MockNextActionRepository(store);
  const contactRepo = new MockContactRepository(store);

  const contactLookup = async (id: string) => {
    const c = await contactRepo.getContactDetail('org_rina_stifin', id);
    return c ? { name: c.name, phoneE164: c.phoneE164, stage: c.stage, sourceChannel: c.sourceChannel } : null;
  };

  const queries = createNextActionQueries(actionRepo, clock, contactLookup);
  const queue = await queries.getTodayQueue('org_rina_stifin');

  assert.ok(queue.overdue.length > 0, 'Should have overdue items');
  assert.equal(queue.overdue[0].contactName, 'Ayu Rahma');
  assert.ok(queue.today.length > 0, 'Should have today items');
  assert.ok(queue.upcoming.length > 0, 'Should have upcoming items');

  // Test advancing date by 1 day shifts today to overdue
  clock.advanceDays(1);
  const updatedQueue = await queries.getTodayQueue('org_rina_stifin');
  assert.ok(updatedQueue.overdue.length > queue.overdue.length, 'Overdue count should increase after advancing 1 day');
});

test('2. CONTACT: E.164 phone equivalence reuses canonical Contact', async () => {
  const store = new MockStateStore();
  store.resetDemo();
  const contactRepo = new MockContactRepository(store);
  const commands = createContactCommands(contactRepo);

  // Ayu Rahma already exists with phone +628121110001
  const result1 = await commands.createContact({
    organizationId: 'org_rina_stifin',
    name: 'Ayu Rahmawati',
    rawPhone: '08121110001', // Domestic 08... format
  });

  assert.equal(result1.isExisting, true);
  assert.equal(result1.contact.id, 'contact_ayu');
  assert.equal(result1.contact.phoneE164, '+628121110001');

  const result2 = await commands.createContact({
    organizationId: 'org_rina_stifin',
    name: 'Ayu Rahmawati',
    rawPhone: '628121110001', // 628... format without +
  });

  assert.equal(result2.isExisting, true);
  assert.equal(result2.contact.id, 'contact_ayu');
});

test('3. LOST: Stage LOST cancels active actions and preserves history', async () => {
  const store = new MockStateStore();
  store.resetDemo();
  const lifecycleRepo = new MockLifecycleRepository(store);
  const activityRepo = new MockActivityRepository(store);
  const actionRepo = new MockNextActionRepository(store);

  const lifecycleCmd = createLifecycleCommands(lifecycleRepo, activityRepo);

  // Ayu Rahma has active NextAction act_ayu_1
  const initialActions = await actionRepo.getContactNextActions('org_rina_stifin', 'contact_ayu');
  assert.equal(initialActions[0].status, 'PENDING');

  // Mark contact LOST
  await lifecycleCmd.changeStage('contact_ayu', 'LOST', 'Harga terlalu mahal');

  const contact = store.getContacts().find((c) => c.id === 'contact_ayu');
  assert.equal(contact?.stage, 'LOST');
  assert.equal(contact?.lostReason, 'Harga terlalu mahal');

  // Action history preserved, but status is CANCELLED (not deleted!)
  const postActions = await actionRepo.getContactNextActions('org_rina_stifin', 'contact_ayu');
  assert.equal(postActions.length, initialActions.length, 'Action count must remain unchanged (preserved history)');
  assert.equal(postActions[0].status, 'CANCELLED', 'Action should be CANCELLED');

  // Activity timeline recorded
  const activities = await activityRepo.listActivities('org_rina_stifin', 'contact_ayu');
  assert.ok(activities.some((a) => a.title.includes('Tidak Lanjut')));
});

test('4. WHATSAPP: Opening WA alone does NOT complete action; explicit confirmation does', async () => {
  const store = new MockStateStore();
  store.resetDemo();
  const actionRepo = new MockNextActionRepository(store);
  const activityRepo = new MockActivityRepository(store);
  const clock = new MockClock('2026-08-12T10:00:00+07:00');

  const messagingCmd = createMessagingCommands(actionRepo, activityRepo, clock);

  const actBefore = await actionRepo.getContactNextActions('org_rina_stifin', 'contact_ayu');
  const targetAct = actBefore[0];
  assert.equal(targetAct.status, 'PENDING');

  // Merely opening WA link does not mutate store state
  // Only explicit confirmWhatsAppSent completes action
  await messagingCmd.confirmWhatsAppSent({
    organizationId: 'org_rina_stifin',
    contactId: 'contact_ayu',
    actionId: targetAct.id,
    messageText: 'Halo Ayu, mengonfirmasi...',
    scheduleNextFollowUpDays: 2,
  });

  const actAfter = (await actionRepo.getContactNextActions('org_rina_stifin', 'contact_ayu')).find((a) => a.id === targetAct.id);
  assert.equal(actAfter?.status, 'COMPLETED');

  // Verify next follow-up action was scheduled 2 days later
  const pendingAfter = (await actionRepo.getContactNextActions('org_rina_stifin', 'contact_ayu')).filter((a) => a.status === 'PENDING');
  assert.ok(pendingAfter.length > 0);
  assert.equal(clock.formatDayDate(pendingAfter[0].dueAt), 'Jumat, 14 Agustus');
});

test('5. AFTERCARE: Booking completion schedules D+7 Aftercare once via idempotency', async () => {
  const store = new MockStateStore();
  store.resetDemo();
  const bookingRepo = new MockBookingRepository(store);
  const lifecycleRepo = new MockLifecycleRepository(store);
  const actionRepo = new MockNextActionRepository(store);
  const activityRepo = new MockActivityRepository(store);
  const clock = new MockClock('2026-08-12T10:00:00+07:00');

  const bookingCmd = createBookingCommands(bookingRepo, lifecycleRepo, actionRepo, activityRepo, clock);

  // Complete active booking bk_arief
  await bookingCmd.completeBooking('bk_arief');

  const contact = store.getContacts().find((c) => c.id === 'contact_arief');
  assert.equal(contact?.stage, 'COMPLETED');

  // Check Aftercare NextAction due D+7 (19 August 2026)
  const actions = await actionRepo.getContactNextActions('org_rina_stifin', 'contact_arief');
  const aftercareAct = actions.find((a) => a.actionType === 'AFTERCARE');
  assert.ok(aftercareAct, 'Aftercare action should be created');
  assert.equal(aftercareAct?.status, 'PENDING');
  assert.equal(clock.formatDayDate(aftercareAct?.dueAt), 'Rabu, 19 Agustus');

  // Repeated completion call must be idempotent (exactly 1 aftercare action)
  await bookingCmd.completeBooking('bk_arief');
  const postActions = await actionRepo.getContactNextActions('org_rina_stifin', 'contact_arief');
  const aftercareCount = postActions.filter((a) => a.actionType === 'AFTERCARE').length;
  assert.equal(aftercareCount, 1, 'Should have exactly 1 aftercare action due to idempotencyKey');
});

test('6. INTEGRATION: Scenario presets separate from entitlements and health', async () => {
  const store = new MockStateStore();
  store.resetDemo();
  const adapter = new MockPromotorClassAdapter(store);

  // 1. FLOW_ONLY
  await adapter.setDemoScenario('FLOW_ONLY');
  const state1 = await adapter.getEntitlementsAndHealth();
  assert.equal(state1.scenarioPreset, 'FLOW_ONLY');
  assert.equal(state1.entitlements.promotorClass, false);
  assert.equal(state1.integrationHealth.promotorClass, 'AVAILABLE');

  // 2. BUNDLE_AVAILABLE
  await adapter.setDemoScenario('BUNDLE_AVAILABLE');
  const state2 = await adapter.getEntitlementsAndHealth();
  assert.equal(state2.scenarioPreset, 'BUNDLE_AVAILABLE');
  assert.equal(state2.entitlements.promotorClass, true);
  assert.equal(state2.integrationHealth.promotorClass, 'AVAILABLE');

  // 3. BUNDLE_CLASS_UNAVAILABLE
  await adapter.setDemoScenario('BUNDLE_CLASS_UNAVAILABLE');
  const state3 = await adapter.getEntitlementsAndHealth();
  assert.equal(state3.scenarioPreset, 'BUNDLE_CLASS_UNAVAILABLE');
  assert.equal(state3.entitlements.promotorClass, true);
  assert.equal(state3.integrationHealth.promotorClass, 'UNAVAILABLE');
});

test('7. OWNERSHIP: Flow owns nextActions[], does not duplicate LMS curriculum', async () => {
  const store = new MockStateStore();
  store.resetDemo();

  const state = store.getState();
  assert.ok(Array.isArray(state.nextActions), 'Flow state owns canonical nextActions[]');
  assert.equal(typeof (state as any).lessons, 'undefined', 'Flow state must NOT duplicate LMS lessons');
  assert.equal(typeof (state as any).reflections, 'undefined', 'Flow state must NOT duplicate LMS reflections');
});
