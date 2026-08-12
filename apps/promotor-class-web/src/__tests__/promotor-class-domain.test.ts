import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MockStateStore } from '../adapters/mock/mock-state-store.js';
import { contactRepository } from '../adapters/mock/contact-repository.js';
import { learnerRepository } from '../adapters/mock/learner-repository.js';
import { programRepository } from '../adapters/mock/program-repository.js';
import { promotorFlowAdapter } from '../adapters/mock/promotorflow-adapter.js';
import { normalizePhone, formatPhoneDisplay } from '@promotor/platform-core';
import { evaluateSignalRules } from '../modules/signals/rules.js';
import { SEED_PROGRAMS } from '@promotor/promotor-class-fixtures';

describe('PromotorClass Full Domain & Integration Test Suite', () => {
  beforeEach(() => {
    MockStateStore.resetDemo();
  });

  it('1. Seed Loading: MockStateStore initializes with deterministic seeds', () => {
    const state = MockStateStore.getState();
    assert.strictEqual(state.programs.length, 1);
    assert.strictEqual(state.contacts.length, 3);
    assert.strictEqual(state.enrollments.length, 2);
    assert.strictEqual(state.learningSignals.length, 2);
  });

  it('2. Guardrail Check: No canonical nextActions collection exists in Class store', () => {
    const state = MockStateStore.getState();
    assert.strictEqual('nextActions' in state, false, 'Class state schema MUST NOT contain nextActions');
  });

  it('3. Phone Normalization (E.164) & Formatting', () => {
    assert.strictEqual(normalizePhone('08123456789'), '+628123456789');
    assert.strictEqual(normalizePhone('628123456789'), '+628123456789');
    assert.strictEqual(normalizePhone('+62 812-3456-789'), '+628123456789');
    assert.strictEqual(formatPhoneDisplay('+628123456789'), '0812-3456-789');
  });

  it('4. Contact Matching: Same normalized phone returns existing contact_id', async () => {
    const c1 = await contactRepository.matchOrCreateContact('Ayu Duplicate', '081987654321');
    assert.strictEqual(c1.id, 'contact_ayu');

    const c2 = await contactRepository.matchOrCreateContact('Siti New', '08999888777');
    assert.notStrictEqual(c2.id, 'contact_ayu');
    assert.strictEqual(c2.phone, '+628999888777');
  });

  it('5. Reflection Lock: Completing lesson without reflection throws Error', async () => {
    // les_1_1 has reflection required
    await assert.rejects(
      async () => {
        await learnerRepository.completeLesson('enr_nina_7hari', 'les_1_1', '');
      },
      (err: Error) => {
        assert.match(err.message, /Refleksi wajib diisi/);
        return true;
      }
    );
  });

  it('6. Completion & Progress: Completing lesson updates progress & generates LearningEvent', async () => {
    const enrBefore = await learnerRepository.getEnrollmentById('enr_nina_7hari');
    assert.strictEqual(enrBefore?.progressPercent, 66);

    const enrAfter = await learnerRepository.completeLesson(
      'enr_nina_7hari',
      'les_2_1',
      'Saya berkomitmen mendampingi anak belajar tanpa emosi'
    );

    assert.strictEqual(enrAfter.progressPercent, 100);
    assert.strictEqual(enrAfter.status, 'selesai');

    // Verify outbox envelope created
    const outbox = MockStateStore.getState().integrationOutbox;
    assert.strictEqual(outbox.length > 0, true);
    assert.strictEqual(outbox[0].payload.eventType, 'PROGRAM_COMPLETED');
  });

  it('7. Idempotency: Completing the same lesson twice produces no duplicate LearningEvent', async () => {
    const initialOutboxCount = MockStateStore.getState().integrationOutbox.length;

    await learnerRepository.completeLesson('enr_ayu_7hari', 'les_1_1', 'Refleksi awal');
    const secondOutboxCount = MockStateStore.getState().integrationOutbox.length;

    assert.strictEqual(initialOutboxCount, secondOutboxCount, 'Duplicate completion must not add new outbox event');
  });

  it('8. Signal Calculation: Learner completion updates Minat status to Minat tinggi', () => {
    const signalResult = evaluateSignalRules(100, true, false);
    assert.strictEqual(signalResult.minatStatus, 'Minat tinggi');
    assert.strictEqual(signalResult.primaryReason, 'Program selesai');
  });

  it('9. Integration Scenarios: CLASS_ONLY, BUNDLE_AVAILABLE, BUNDLE_FLOW_UNAVAILABLE', async () => {
    // Test CLASS_ONLY
    promotorFlowAdapter.setIntegrationMode('CLASS_ONLY');
    assert.strictEqual(promotorFlowAdapter.getIntegrationMode(), 'CLASS_ONLY');
    const refClassOnly = await promotorFlowAdapter.createNextActionReference('contact_ayu', 'Follow-up');
    assert.strictEqual(refClassOnly, null);

    // Test BUNDLE_AVAILABLE
    promotorFlowAdapter.setIntegrationMode('BUNDLE_AVAILABLE');
    assert.strictEqual(promotorFlowAdapter.getIntegrationMode(), 'BUNDLE_AVAILABLE');
    const refBundle = await promotorFlowAdapter.createNextActionReference('contact_ayu', 'Follow-up');
    assert.notStrictEqual(refBundle, null);
    assert.strictEqual(refBundle?.contactId, 'contact_ayu');

    // Test BUNDLE_FLOW_UNAVAILABLE
    promotorFlowAdapter.setIntegrationMode('BUNDLE_FLOW_UNAVAILABLE');
    assert.strictEqual(promotorFlowAdapter.getIntegrationMode(), 'BUNDLE_FLOW_UNAVAILABLE');
    assert.strictEqual(MockStateStore.getState().integrationHealth.status, 'degraded');
  });

  it('10. resetDemo() restores original seed state deterministically', () => {
    MockStateStore.updateState(state => ({ ...state, contacts: [] }));
    assert.strictEqual(MockStateStore.getState().contacts.length, 0);

    MockStateStore.resetDemo();
    assert.strictEqual(MockStateStore.getState().contacts.length, 3);
  });
});
