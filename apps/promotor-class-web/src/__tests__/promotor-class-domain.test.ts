import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MockStateStore } from '../adapters/mock/mock-state-store';
import { contactRepository } from '../adapters/mock/contact-repository';
import { learnerRepository } from '../adapters/mock/learner-repository';
import { programRepository } from '../adapters/mock/program-repository';
import { promotorFlowAdapter } from '../adapters/mock/promotorflow-adapter';
import { getActiveLearnerContactId, clearActiveLearnerSession, setActiveLearnerSession } from '../lib/session';
import { normalizePhone, formatPhoneDisplay } from '@promotor/platform-core';
import { evaluateIntentFromEvents } from '../modules/signals/rules';
import { extractYoutubeId } from '../lib/video/parse-youtube-url';
import {
  IntegrationEventEnvelopeSchema,
  EnrollContactInputSchema,
  LearningActivityProjectionSchema,
} from '@promotor/contracts';

describe('PromotorClass F0.1.1 Contract, Idempotency & Domain Alignment Test Suite', () => {
  beforeEach(() => {
    MockStateStore.resetDemo();
  });

  it('1. Seed Loading: MockStateStore initializes with canonical collections & learningEvents', () => {
    const state = MockStateStore.getState();
    assert.strictEqual(state.programs.length, 5);
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

  it('5. Lesson Completion Idempotency: Repeated completeLesson call produces 0 duplicate reflections/events', async () => {
    const enrBefore = await learnerRepository.getEnrollmentById('enr_ayu_7hari');
    assert.strictEqual(enrBefore?.progressPercent, 33);

    const initialReflCount = MockStateStore.getState().reflections.length;
    const initialEvtCount = MockStateStore.getState().learningEvents.length;

    // 1st completion
    await learnerRepository.completeLesson('enr_ayu_7hari', 'les_1_2', 'Refleksi sesi 2');

    const reflCountAfter1st = MockStateStore.getState().reflections.length;
    const evtCountAfter1st = MockStateStore.getState().learningEvents.length;
    assert.strictEqual(reflCountAfter1st, initialReflCount + 1);
    assert.strictEqual(evtCountAfter1st > initialEvtCount, true);

    // 2nd duplicate completion
    await learnerRepository.completeLesson('enr_ayu_7hari', 'les_1_2', 'Refleksi sesi 2 duplicate');

    const reflCountAfter2nd = MockStateStore.getState().reflections.length;
    const evtCountAfter2nd = MockStateStore.getState().learningEvents.length;

    assert.strictEqual(reflCountAfter2nd, reflCountAfter1st, 'Duplicate lesson completion MUST NOT write duplicate Reflection');
    assert.strictEqual(evtCountAfter2nd, evtCountAfter1st, 'Duplicate lesson completion MUST NOT write duplicate LearningEvent');
  });

  it('6. CTA Click Idempotency: Repeated recordCtaClick call produces 0 duplicate events', async () => {
    const initialEventsCount = MockStateStore.getState().learningEvents.length;

    // 1st click
    await learnerRepository.recordCtaClick('enr_ayu_7hari', 'les_1_2', 'https://wa.me/...');
    const countAfter1st = MockStateStore.getState().learningEvents.length;
    assert.strictEqual(countAfter1st, initialEventsCount + 1);

    // 2nd duplicate click
    await learnerRepository.recordCtaClick('enr_ayu_7hari', 'les_1_2', 'https://wa.me/...');
    const countAfter2nd = MockStateStore.getState().learningEvents.length;
    assert.strictEqual(countAfter2nd, countAfter1st, 'Duplicate CTA click MUST NOT record duplicate LearningEvent');
  });

  it('7. Outbox Idempotency with idempotencyKey: Repeated reevaluateSignal produces 0 duplicate pending outbox items', async () => {
    // Complete lesson to cross 60% intent threshold
    await learnerRepository.completeLesson('enr_nina_7hari', 'les_2_1', 'Komitmen pendampingan anak');

    const outbox1 = MockStateStore.getState().integrationOutbox;
    const initialPendingCount = outbox1.filter(o => o.status === 'PENDING').length;
    assert.strictEqual(initialPendingCount > 0, true);

    // Repeated re-evaluation
    await learnerRepository.reevaluateSignal('contact_nina', 'enr_nina_7hari');
    const outbox2 = MockStateStore.getState().integrationOutbox;
    const secondPendingCount = outbox2.filter(o => o.status === 'PENDING').length;

    assert.strictEqual(secondPendingCount, initialPendingCount, 'Duplicate reevaluateSignal MUST NOT create duplicate pending outbox item');
  });

  it('8. Cross-Enrollment Intent Isolation: Activity in Program A does NOT inflate Program B score', async () => {
    // Create second enrollment for Ayu in Program B
    const newProgB = await programRepository.createProgram('Program B Parenting', 'Sub B', 'Desc B', 'free');
    const enrB = await learnerRepository.createEnrollment('contact_ayu', newProgB.id);

    const eventsAyuB = MockStateStore.getState().learningEvents.filter(e => e.enrollmentId === enrB.id);
    const scoreResultB = evaluateIntentFromEvents(eventsAyuB);

    assert.strictEqual(scoreResultB.intentScore, 10, 'Program B intent score MUST only count Program B events (enrolled = 10)');
  });

  it('9. Session Default Fix: No session returns null without fallback impersonation', () => {
    clearActiveLearnerSession();
    assert.strictEqual(getActiveLearnerContactId(), null, 'Anonymous learner session MUST return null');

    setActiveLearnerSession({ contactId: 'contact_nina', workspaceSlug: 'rina' });
    assert.strictEqual(getActiveLearnerContactId(), 'contact_nina');
  });

  it('10. Canonical IntegrationEventEnvelope Schema Validation', () => {
    const validEnvelope = {
      schemaVersion: 1,
      eventId: 'env_123',
      eventType: 'program.completed',
      sourceApp: 'PROMOTORCLASS', // Exact uppercase string
      organizationId: 'org_stifin_parenting',
      contactId: 'contact_nina',
      occurredAt: '2026-08-12T10:00:00.000Z',
      subject: {
        programId: 'prog_7_hari_belajar',
        enrollmentId: 'enr_nina_7hari',
      },
      payload: { intentScore: 80 },
    };

    const parsed = IntegrationEventEnvelopeSchema.safeParse(validEnvelope);
    assert.strictEqual(parsed.success, true, 'Valid canonical envelope MUST pass Zod validation');

    const invalidSourceApp = { ...validEnvelope, sourceApp: 'promotor-class' };
    assert.strictEqual(IntegrationEventEnvelopeSchema.safeParse(invalidSourceApp).success, false, 'Lowercase sourceApp MUST fail validation');
  });

  it('11. Canonical PromotorFlowAdapter methods', async () => {
    const context = await promotorFlowAdapter.getContactContext('contact_ayu');
    assert.strictEqual(context.contactId, 'contact_ayu');
    assert.strictEqual(context.classification, 'PROSPECT');

    const status = await promotorFlowAdapter.getAssessmentStatus('contact_nina');
    assert.strictEqual(status, 'COMPLETED');

    const nextActionRef = await promotorFlowAdapter.createNextAction({
      organizationId: 'org_stifin_parenting',
      contactId: 'contact_ayu',
      source: 'PROMOTORCLASS',
      sourceEventId: 'evt_test_1',
      actionType: 'FOLLOW_UP',
      title: 'Follow-up Sesi 1',
      reason: 'Learner completed lesson 1',
      idempotencyKey: 'key_test_123',
      context: { programId: 'prog_7_hari_belajar' },
    });

    assert.strictEqual(nextActionRef.id, 'key_test_123');
  });

  it('12. Canonical LearningActivityProjection Validation', () => {
    const validActivity = {
      organizationId: 'org_stifin_parenting',
      contactId: 'contact_nina',
      source: 'PROMOTORCLASS' as const,
      sourceEventId: 'evt_123',
      eventType: 'PROGRAM_COMPLETED' as const,
      summary: 'Nina telah menyelesaikan 100% materi program.',
      context: { programId: 'prog_7_hari_belajar' },
      idempotencyKey: 'promotorclass:evt_123:program_completed',
    };

    // 1. Canonical projection passes
    assert.strictEqual(LearningActivityProjectionSchema.safeParse(validActivity).success, true);

    // 2. Missing sourceEventId fails
    const missingSourceEventId = { ...validActivity, sourceEventId: undefined };
    assert.strictEqual(LearningActivityProjectionSchema.safeParse(missingSourceEventId).success, false);

    // 3. Missing idempotencyKey fails
    const missingIdempotencyKey = { ...validActivity, idempotencyKey: undefined };
    assert.strictEqual(LearningActivityProjectionSchema.safeParse(missingIdempotencyKey).success, false);

    // 4. Unsupported eventType fails
    const unsupportedEventType = { ...validActivity, eventType: 'HIGH_INTENT_MILESTONE' };
    assert.strictEqual(LearningActivityProjectionSchema.safeParse(unsupportedEventType).success, false);
  });

  it('13. Canonical EnrollContactInput Schema Validation', () => {
    const validEnrollInput = {
      organizationId: 'org_stifin_parenting',
      contactId: 'contact_ayu',
      programId: 'prog_7_hari_belajar',
      source: 'PROMOTORFLOW_AFTERSALES' as const,
      idempotencyKey: 'key_enroll_123',
    };

    const parsed = EnrollContactInputSchema.safeParse(validEnrollInput);
    assert.strictEqual(parsed.success, true, 'Valid EnrollContactInput MUST pass Zod validation');

    const invalidSource = { ...validEnrollInput, source: 'MANUAL' };
    assert.strictEqual(EnrollContactInputSchema.safeParse(invalidSource).success, false, 'Invalid source MUST fail Zod validation');
  });

  it('14. YouTube URL Parser Utility', () => {
    assert.strictEqual(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  it('15. resetDemo() restores original seed state deterministically', () => {
    MockStateStore.updateState(state => ({ ...state, contacts: [] }));
    assert.strictEqual(MockStateStore.getState().contacts.length, 0);

    MockStateStore.resetDemo();
    assert.strictEqual(MockStateStore.getState().contacts.length, 3);
  });
});
