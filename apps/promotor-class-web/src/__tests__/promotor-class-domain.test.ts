import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MockStateStore } from '../adapters/mock/mock-state-store';
import { contactRepository } from '../adapters/mock/contact-repository';
import { learnerRepository } from '../adapters/mock/learner-repository';
import { programRepository } from '../adapters/mock/program-repository';
import { promotorFlowAdapter } from '../adapters/mock/promotorflow-adapter';
import { normalizePhone, formatPhoneDisplay } from '@promotor/platform-core';
import { evaluateIntentFromEvents } from '../modules/signals/rules';
import { extractYoutubeId } from '../lib/video/parse-youtube-url';

describe('PromotorClass F0.1 Domain & Contract Alignment Test Suite', () => {
  beforeEach(() => {
    MockStateStore.resetDemo();
  });

  it('1. Seed Loading: MockStateStore initializes with canonical collections & learningEvents', () => {
    const state = MockStateStore.getState();
    assert.strictEqual(state.programs.length, 1);
    assert.strictEqual(state.contacts.length, 3);
    assert.strictEqual(state.enrollments.length, 2);
    assert.strictEqual(state.reflections.length, 2);
    assert.strictEqual(state.learningEvents.length, 8);
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
    assert.strictEqual(formatPhoneDisplay('+628123456789'), '+62 812-3456-789');

    assert.throws(() => normalizePhone('invalid'), /Nomor HP "invalid" tidak valid/);
  });

  it('4. Contact Matching: Same normalized phone returns existing contact_id', async () => {
    const c1 = await contactRepository.matchOrCreateContact('Ayu Duplicate', '081987654321');
    assert.strictEqual(c1.id, 'contact_ayu');

    const c2 = await contactRepository.matchOrCreateContact('Siti New', '08999888777');
    assert.notStrictEqual(c2.id, 'contact_ayu');
    assert.strictEqual(c2.phoneE164, '+628999888777');
  });

  it('5. Reflection Lock & Persistence: Completing lesson requires & saves reflection', async () => {
    // Missing reflection -> throws
    await assert.rejects(
      async () => {
        await learnerRepository.completeLesson('enr_nina_7hari', 'les_1_1', '');
      },
      (err: Error) => {
        assert.match(err.message, /Refleksi wajib diisi/);
        return true;
      }
    );

    // Valid reflection -> persists into reflections[] collection
    const initialReflCount = MockStateStore.getState().reflections.length;
    await learnerRepository.completeLesson('enr_nina_7hari', 'les_2_1', 'Komitmen belajar bersama anak');

    const finalReflCount = MockStateStore.getState().reflections.length;
    assert.strictEqual(finalReflCount, initialReflCount + 1);
  });

  it('6. Event History Intent Scoring: Deterministic intent score evaluation', () => {
    const events: any[] = [
      { eventType: 'learner.enrolled' },
      { eventType: 'lesson.completed' },
      { eventType: 'program.progress_50' },
      { eventType: 'program.progress_80' },
      { eventType: 'program.completed' },
    ];

    const result = evaluateIntentFromEvents(events);
    assert.strictEqual(result.intentScore, 80); // 10 + 10 + 20 + 20 + 20 = 80
    assert.strictEqual(result.signalLevel, 'Minat tinggi');
    assert.strictEqual(result.primaryReason, 'Program selesai');
  });

  it('7. CTA Click Tracking: Explicit cta.clicked event adds score', async () => {
    const eventsBefore = MockStateStore.getState().learningEvents.filter(e => e.contactId === 'contact_ayu');
    const scoreBefore = evaluateIntentFromEvents(eventsBefore).intentScore;

    await learnerRepository.recordCtaClick('enr_ayu_7hari', 'les_1_2', 'https://wa.me/...');

    const eventsAfter = MockStateStore.getState().learningEvents.filter(e => e.contactId === 'contact_ayu');
    const scoreAfter = evaluateIntentFromEvents(eventsAfter).intentScore;

    assert.strictEqual(scoreAfter, scoreBefore + 20);
  });

  it('8. YouTube URL Parser Utility', () => {
    assert.strictEqual(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  it('9. PromotorFlow Integration Outbox & Health', async () => {
    const health = await promotorFlowAdapter.getIntegrationHealth();
    assert.strictEqual(health.promotorFlow, 'AVAILABLE');
  });

  it('10. resetDemo() restores original seed state deterministically', () => {
    MockStateStore.updateState(state => ({ ...state, contacts: [] }));
    assert.strictEqual(MockStateStore.getState().contacts.length, 0);

    MockStateStore.resetDemo();
    assert.strictEqual(MockStateStore.getState().contacts.length, 3);
  });
});
