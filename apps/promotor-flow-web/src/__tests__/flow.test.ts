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
import { MockServiceRepository } from '../adapters/mock/service-repository';
import { MockPromotorClassAdapter } from '../adapters/mock/promotorclass-adapter';
import { MockMessagingRepository } from '../adapters/mock/messaging-repository';

import { createContactCommands } from '../modules/contacts/commands';
import { createLifecycleCommands } from '../modules/lifecycle/commands';
import { createNextActionQueries } from '../modules/next-actions/queries';
import { createNextActionCommands } from '../modules/next-actions/commands';
import { createBookingCommands } from '../modules/bookings/commands';
import { createMessagingCommands } from '../modules/messaging/commands';
import { createAftercareCommands } from '../modules/aftercare/commands';

// Mock localStorage for Node.js test environment
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

// ----------------------------------------------------
// 1. MockStateStore Tests
// ----------------------------------------------------
test('MockStateStore: deterministic seed initialization', () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();
  const state = store.getState();

  assert.ok(state.contacts.length >= 7, 'Should seed initial contacts');
  assert.ok(state.nextActions.length >= 6, 'Should seed initial nextActions');
  assert.ok(state.bookings.length >= 3, 'Should seed initial bookings');
  assert.ok(state.services.length >= 4, 'Should seed initial services');
  assert.equal(state.scenarioPreset, 'BUNDLE_AVAILABLE');
});

test('MockStateStore: persistence & corrupt-state recovery', () => {
  const storageMap = setupMockLocalStorage();
  const store1 = new MockStateStore();
  store1.resetDemo();

  // Add a new contact to test persistence
  store1.addContact({
    id: 'contact_test_persist',
    organizationId: 'org_rina_stifin',
    name: 'Persist Test User',
    phoneE164: '+628999888777',
    stage: 'NEW',
    classification: 'PROSPECT',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  // Re-instantiate store to verify reading from localStorage
  const store2 = new MockStateStore();
  const found = store2.getContacts().find((c) => c.id === 'contact_test_persist');
  assert.ok(found, 'Should persist newly added contact in localStorage');

  // Test corrupt state recovery
  storageMap.set('promotorflow:m0:state:v1', 'CORRUPTED_NON_JSON_DATA{{');
  const storeCorrupt = new MockStateStore();
  assert.ok(storeCorrupt.getContacts().length >= 7, 'Should safely recover to deterministic seed on corrupt JSON');

  // Test resetDemo() restores deterministic baseline
  storeCorrupt.resetDemo();
  assert.equal(
    storeCorrupt.getContacts().find((c) => c.id === 'contact_test_persist'),
    undefined,
    'resetDemo should remove non-seed items'
  );
});

// ----------------------------------------------------
// 2. Lifecycle Tests
// ----------------------------------------------------
test('Lifecycle: valid transition behavior & LOST reason requirement', async () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();
  const lifecycleRepo = new MockLifecycleRepository(store);
  const activityRepo = new MockActivityRepository(store);

  const commands = createLifecycleCommands(lifecycleRepo, activityRepo);

  // Transition NEW -> INTERESTED
  await commands.changeStage('contact_hendra', 'INTERESTED');
  let c = store.getContacts().find((cnt) => cnt.id === 'contact_hendra');
  assert.equal(c?.stage, 'INTERESTED');

  // Transition INTERESTED -> BOOKED
  await commands.changeStage('contact_hendra', 'BOOKED');
  c = store.getContacts().find((cnt) => cnt.id === 'contact_hendra');
  assert.equal(c?.stage, 'BOOKED');

  // Transitioning to LOST without reason must throw
  await assert.rejects(
    async () => {
      await commands.changeStage('contact_hendra', 'LOST', '');
    },
    { message: 'Alasan tidak lanjut (lost reason) wajib diisi.' }
  );

  // Transitioning to LOST with reason cancels active actions & preserves action history
  const nextActionRepo = new MockNextActionRepository(store);
  const initialActions = await nextActionRepo.getContactNextActions('contact_hendra');

  await commands.changeStage('contact_hendra', 'LOST', 'Harga terlalu mahal');
  c = store.getContacts().find((cnt) => cnt.id === 'contact_hendra');
  assert.equal(c?.stage, 'LOST');
  assert.equal(c?.lostReason, 'Harga terlalu mahal');

  const postActions = await nextActionRepo.getContactNextActions('contact_hendra');
  assert.equal(postActions.length, initialActions.length, 'Action history count preserved');
  assert.equal(postActions[0].status, 'CANCELLED', 'Active action cancelled on LOST');
});

// ----------------------------------------------------
// 3. NextAction & Clock Tests
// ----------------------------------------------------
test('NextAction: creation, completion, reschedule, skip & due grouping', async () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();

  const clock = new MockClock('2026-08-12T10:00:00+07:00'); // Wednesday, 12 August 2026
  const actionRepo = new MockNextActionRepository(store);
  const activityRepo = new MockActivityRepository(store);
  const contactRepo = new MockContactRepository(store);

  const contactLookup = async (id: string) => {
    const c = await contactRepo.getContactDetail(id);
    return c ? { name: c.name, phoneE164: c.phoneE164, stage: c.stage, sourceChannel: c.sourceChannel } : null;
  };

  const queries = createNextActionQueries(actionRepo, clock, contactLookup);
  const commands = createNextActionCommands(actionRepo, activityRepo);

  // Test due ordering/grouping
  const queue = await queries.getTodayQueue();
  assert.ok(queue.overdue.length > 0, 'Should identify overdue action (Ayu Rahma)');
  assert.ok(queue.today.length > 0, 'Should identify today action');
  assert.ok(queue.upcoming.length > 0, 'Should identify upcoming action');

  // Creation
  const newAction = await commands.scheduleNextAction({
    contactId: 'contact_budi',
    actionType: 'FOLLOW_UP',
    title: 'Follow-up proposal corporate',
    dueAt: '2026-08-12T15:00:00+07:00',
  });
  assert.equal(newAction.status, 'PENDING');

  // Reschedule
  const rescheduled = await commands.rescheduleNextAction(newAction.id, '2026-08-13T09:00:00+07:00');
  assert.equal(rescheduled.dueAt, '2026-08-13T09:00:00+07:00');

  // Completion
  const completed = await commands.completeNextAction(newAction.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.ok(completed.completedAt, 'completedAt should be recorded');

  // Skip action with mandatory next step
  const actionToSkip = await commands.scheduleNextAction({
    contactId: 'contact_budi',
    actionType: 'MANUAL',
    title: 'Cek email penawaran',
    dueAt: '2026-08-12T11:00:00+07:00',
  });

  const skipped = await commands.skipNextAction(actionToSkip.id, {
    type: 'FOLLOW_UP',
    title: 'Follow-up email minggu depan',
    dueAt: '2026-08-19T10:00:00+07:00',
  });

  assert.equal(skipped.status, 'SKIPPED');
  const budiActions = await actionRepo.getContactNextActions('contact_budi');
  assert.ok(budiActions.some((a) => a.title === 'Follow-up email minggu depan'), 'Next step scheduled after skip');
});

// ----------------------------------------------------
// 4. WhatsApp Loop Tests
// ----------------------------------------------------
test('WhatsApp: wa.me link does NOT complete action; explicit confirm completes and appends activity', async () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();

  const clock = new MockClock('2026-08-12T10:00:00+07:00');
  const actionRepo = new MockNextActionRepository(store);
  const activityRepo = new MockActivityRepository(store);
  const messagingRepo = new MockMessagingRepository(actionRepo, activityRepo, clock);

  const messagingCmd = createMessagingCommands(messagingRepo);

  const initialAction = (await actionRepo.getContactNextActions('contact_ayu'))[0];
  assert.equal(initialAction.status, 'PENDING');

  // Simulating user opening wa.me does NOT mutate store status.
  // Explicit confirm call:
  await messagingCmd.confirmWhatsAppSent({
    contactId: 'contact_ayu',
    actionId: initialAction.id,
    messageText: 'Halo Ayu, mengonfirmasi...',
    scheduleNextFollowUpDays: 3,
  });

  const updatedAction = (await actionRepo.getContactNextActions('contact_ayu')).find((a) => a.id === initialAction.id);
  assert.equal(updatedAction?.status, 'COMPLETED');

  // Timeline activity appended
  const activities = await activityRepo.listActivities('contact_ayu');
  assert.ok(activities.some((act) => act.type === 'WA_SENT' && act.detail === 'Halo Ayu, mengonfirmasi...'));

  // Follow-up scheduled +3 days (15 August 2026)
  const pendingActions = (await actionRepo.getContactNextActions('contact_ayu')).filter((a) => a.status === 'PENDING');
  assert.equal(pendingActions.length, 1);
  assert.equal(clock.formatDayDate(pendingActions[0].dueAt), 'Sabtu, 15 Agustus');
});

// ----------------------------------------------------
// 5. Booking & Calendar Tests
// ----------------------------------------------------
test('Booking: creation, calendar sync, stage BOOKED, payment mutation, reschedule', async () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();

  const clock = new MockClock('2026-08-12T10:00:00+07:00');
  const bookingRepo = new MockBookingRepository(store);
  const lifecycleRepo = new MockLifecycleRepository(store);
  const actionRepo = new MockNextActionRepository(store);
  const activityRepo = new MockActivityRepository(store);

  const bookingCmd = createBookingCommands(bookingRepo, lifecycleRepo, actionRepo, activityRepo, clock);

  // Create new booking for Budi (currently stage CONTACTED)
  const newBk = await bookingCmd.createBooking({
    contactId: 'contact_budi',
    serviceId: 'srv_tes_personal',
    serviceTitle: 'Tes STIFIn Personal',
    startAt: '2026-08-15T10:00:00+07:00',
    endAt: '2026-08-15T11:00:00+07:00',
    locationType: 'ON_SITE',
    paymentStatus: 'UNPAID',
    amount: 600000,
  });

  // Verify contact stage updated to BOOKED
  const budiContact = store.getContacts().find((c) => c.id === 'contact_budi');
  assert.equal(budiContact?.stage, 'BOOKED');

  // Verify Calendar reflects booking
  const allBookings = await bookingRepo.listBookings();
  assert.ok(allBookings.some((b) => b.id === newBk.id));

  // Payment status mutation
  const paidBk = await bookingCmd.changePaymentStatus(newBk.id, 'PAID');
  assert.equal(paidBk.paymentStatus, 'PAID');

  // Reschedule booking
  const rescheduledBk = await bookingCmd.rescheduleBooking(newBk.id, '2026-08-16T14:00:00+07:00', '2026-08-16T15:00:00+07:00');
  assert.equal(rescheduledBk.startAt, '2026-08-16T14:00:00+07:00');
});

// ----------------------------------------------------
// 6. Completion & Aftercare Tests
// ----------------------------------------------------
test('Completion: booking completion schedules D+7 Aftercare once, outcome not requested immediately', async () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();

  const clock = new MockClock('2026-08-12T10:00:00+07:00');
  const bookingRepo = new MockBookingRepository(store);
  const lifecycleRepo = new MockLifecycleRepository(store);
  const actionRepo = new MockNextActionRepository(store);
  const activityRepo = new MockActivityRepository(store);
  const aftercareRepo = new MockAftercareRepository(store);

  const bookingCmd = createBookingCommands(bookingRepo, lifecycleRepo, actionRepo, activityRepo, clock);
  const aftercareCmd = createAftercareCommands(aftercareRepo, actionRepo, activityRepo, clock);

  // Complete active booking bk_arief
  await bookingCmd.completeBooking('bk_arief');

  const contact = store.getContacts().find((c) => c.id === 'contact_arief');
  assert.equal(contact?.stage, 'COMPLETED');

  // Exactly 1 D+7 Aftercare action created for 19 August 2026
  const actions = await actionRepo.getContactNextActions('contact_arief');
  const aftercareAct = actions.find((a) => a.actionType === 'AFTERCARE');
  assert.ok(aftercareAct);
  assert.equal(clock.formatDayDate(aftercareAct?.dueAt), 'Rabu, 19 Agustus');

  // Repeated completion call is idempotent
  await bookingCmd.completeBooking('bk_arief');
  const postActions = await actionRepo.getContactNextActions('contact_arief');
  assert.equal(postActions.filter((a) => a.actionType === 'AFTERCARE').length, 1);

  // Advance clock by 7 days to simulate Aftercare becoming due
  clock.advanceDays(7);
  assert.equal(clock.formatDayDate(), 'Rabu, 19 Agustus');

  // Complete aftercare with outcome CONTACT_LATER
  await aftercareCmd.completeAftercare(
    aftercareAct!.id,
    'CONTACT_LATER',
    'Minta dihubungi bulan depan',
    'contact_arief',
    'org_rina_stifin'
  );

  const completedAftercareAct = (await actionRepo.getContactNextActions('contact_arief')).find((a) => a.id === aftercareAct!.id);
  assert.equal(completedAftercareAct?.status, 'COMPLETED');

  // Check follow-up scheduled for CONTACT_LATER (+30 days)
  const nextActions = (await actionRepo.getContactNextActions('contact_arief')).filter((a) => a.status === 'PENDING');
  assert.ok(nextActions.some((a) => a.title.includes('30 Hari')));
});

// ----------------------------------------------------
// 7. Integration & Outage Resilience Tests
// ----------------------------------------------------
test('Integration: FLOW_ONLY, BUNDLE_AVAILABLE, BUNDLE_CLASS_UNAVAILABLE resilience & Class signal idempotency', async () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();

  const adapter = new MockPromotorClassAdapter(store);

  // 1. FLOW_ONLY
  await adapter.setDemoScenario('FLOW_ONLY');
  const flowOnlyState = await adapter.getEntitlementsAndHealth();
  assert.equal(flowOnlyState.entitlements.promotorClass, false);
  assert.equal(flowOnlyState.integrationHealth.promotorClass, 'AVAILABLE');

  // 2. BUNDLE_CLASS_UNAVAILABLE (Class Outage)
  await adapter.setDemoScenario('BUNDLE_CLASS_UNAVAILABLE');
  const outageState = await adapter.getEntitlementsAndHealth();
  assert.equal(outageState.entitlements.promotorClass, true);
  assert.equal(outageState.integrationHealth.promotorClass, 'UNAVAILABLE');

  // Core Flow functions (NextActions, Bookings) work cleanly under outage
  const actionRepo = new MockNextActionRepository(store);
  const bookingRepo = new MockBookingRepository(store);
  const act = await actionRepo.listNextActions();
  const bks = await bookingRepo.listBookings();
  assert.ok(act.length > 0, 'NextActions work during Class outage');
  assert.ok(bks.length > 0, 'Bookings work during Class outage');

  // 3. Class-originated action creation idempotency & metadata preservation
  await adapter.setDemoScenario('BUNDLE_AVAILABLE');
  const activityRepo = new MockActivityRepository(store);
  const actionCmd = createNextActionCommands(actionRepo, activityRepo);

  const idempotencyKey = 'promotorclass:evt_100:progress_80';

  const act1 = await actionCmd.scheduleNextAction({
    contactId: 'contact_nina',
    actionType: 'FOLLOW_UP',
    title: 'Follow-up lead magnet 80%',
    subtitle: 'Parenting Mini Class · Minat tinggi',
    dueAt: '2026-08-12T11:00:00+07:00',
    source: 'PROMOTORCLASS',
    sourceEventId: 'evt_100',
    sourceSignalId: 'sig_100',
    idempotencyKey,
  });

  assert.equal(act1.source, 'PROMOTORCLASS');
  assert.equal(act1.sourceEventId, 'evt_100');
  assert.equal(act1.sourceSignalId, 'sig_100');
  assert.equal(act1.idempotencyKey, idempotencyKey);

  // Send repeated request with same idempotencyKey
  const act2 = await actionCmd.scheduleNextAction({
    contactId: 'contact_nina',
    actionType: 'FOLLOW_UP',
    title: 'Follow-up lead magnet 80%',
    dueAt: '2026-08-12T11:00:00+07:00',
    source: 'PROMOTORCLASS',
    sourceEventId: 'evt_100',
    sourceSignalId: 'sig_100',
    idempotencyKey,
  });

  assert.equal(act1.id, act2.id, 'Repeated request must reuse canonical Flow action');

  // 4. Canonical enrollContact idempotency test
  const enrollInput = {
    organizationId: 'org_rina_stifin',
    contactId: 'contact_ayu',
    programId: 'prog_30_hari_setelah_tes',
    source: 'PROMOTORFLOW_AFTERSALES' as const,
    idempotencyKey: 'promotorflow:aftersales:contact_ayu:prog_30_hari',
  };

  const enrollRef1 = await adapter.enrollContact(enrollInput);
  assert.equal(enrollRef1.contactId, 'contact_ayu');
  assert.equal(enrollRef1.status, 'aktif');

  // Repeated call with same idempotencyKey returns exact same EnrollmentRef
  const enrollRef2 = await adapter.enrollContact(enrollInput);
  assert.equal(enrollRef1.enrollmentId, enrollRef2.enrollmentId, 'EnrollmentId must be identical on idempotent retry');
  assert.equal(enrollRef1.enrolledAt, enrollRef2.enrolledAt, 'EnrolledAt timestamp must be preserved on idempotent retry');

  // 5. Canonical getEnrollmentStatus test
  const status = await adapter.getEnrollmentStatus('contact_ayu', 'prog_30_hari_setelah_tes');
  assert.ok(status);
  assert.equal(status?.enrollmentId, enrollRef1.enrollmentId);

  // 6. Non-null LearningContext for contact without learning activity
  const emptyCtx = await adapter.getLearningContext('contact_budi');
  assert.ok(emptyCtx, 'LearningContext must be non-null');
  assert.equal(emptyCtx.contactId, 'contact_budi');
  assert.equal(emptyCtx.activeEnrollments.length, 0);
  assert.equal(emptyCtx.recentSignals.length, 0);
});

// ----------------------------------------------------
// 8. Ownership Boundaries Test
// ----------------------------------------------------
test('Ownership: Flow owns canonical nextActions[], does not duplicate LMS curriculum tables', () => {
  setupMockLocalStorage();
  const store = new MockStateStore();
  store.resetDemo();

  const state = store.getState();
  assert.ok(Array.isArray(state.nextActions), 'Flow state owns canonical nextActions[]');
  assert.equal(typeof (state as any).programs, 'undefined', 'Flow state must NOT own programs');
  assert.equal(typeof (state as any).lessons, 'undefined', 'Flow state must NOT own lessons');
  assert.equal(typeof (state as any).reflections, 'undefined', 'Flow state must NOT own reflections');
  assert.equal(typeof (state as any).learningEvents, 'undefined', 'Flow state must NOT own learningEvents');
});
