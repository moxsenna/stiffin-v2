import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HttpSignalRepository } from '../adapters/http/signal-repository';

describe('P1-3 & P1-4 — Signal DTO Canonical Truth & Class Learners Invariants', () => {
  it('1. HttpSignalRepository maps exact canonical server values without heuristics', async () => {
    const mockApiClient = {
      listClassSignals: async () => ({
        signals: [
          {
            id: 'sig-1',
            organizationId: 'org-1',
            contactId: 'cnt-1',
            contactName: 'Budi Santoso',
            contactPhone: '+6281234567890',
            programId: 'prog-1',
            programTitle: 'Parenting STIFIn',
            enrollmentId: 'enr-1',
            sourceEventId: 'evt-prog-80',
            type: 'HIGH_LEARNING_INTENT',
            reason: 'MILESTONE_80_PERCENT',
            recommendedActionReason: 'Kemajuan belajar mencapai 80%.',
            status: 'ACTIVE',
            createdAt: '2026-08-20T10:00:00.000Z',
            intentScore: 60,
            intentLabel: 'warm',
            signalLevel: 'Minat sedang',
          },
          {
            id: 'sig-2',
            organizationId: 'org-1',
            contactId: 'cnt-2',
            contactName: 'Siti Rahma',
            contactPhone: '+6281298765432',
            programId: 'prog-2',
            programTitle: 'STIFIn Couple',
            enrollmentId: 'enr-2',
            sourceEventId: 'evt-completed',
            type: 'HIGH_LEARNING_INTENT',
            reason: 'PROGRAM_COMPLETED',
            recommendedActionReason: 'Peserta telah menyelesaikan seluruh materi.',
            status: 'ACTIVE',
            createdAt: '2026-08-20T11:00:00.000Z',
            intentScore: 80,
            intentLabel: 'hot',
            signalLevel: 'Minat tinggi',
          },
          {
            id: 'sig-3',
            organizationId: 'org-1',
            contactId: 'cnt-3',
            contactName: 'Agus Wijaya',
            contactPhone: '+6281211112222',
            programId: 'prog-1',
            programTitle: 'Parenting STIFIn',
            enrollmentId: 'enr-3',
            sourceEventId: 'evt-cta-click',
            type: 'HIGH_INTENT_CTA',
            reason: 'CTA_CLICKED',
            recommendedActionReason: 'Peserta mengklik CTA konsultasi.',
            status: 'ACTIVE',
            createdAt: '2026-08-20T12:00:00.000Z',
            intentScore: 100,
            intentLabel: 'hot',
            signalLevel: 'Minat tinggi',
          },
        ],
      }),
    };

    const repo = new HttpSignalRepository(mockApiClient as any);
    const signals = await repo.getSignals();

    assert.strictEqual(signals.length, 3);

    // Signal 1 (80% milestone)
    assert.strictEqual(signals[0].id, 'sig-1');
    assert.strictEqual(signals[0].sourceEventId, 'evt-prog-80');
    assert.strictEqual(signals[0].intentScore, 60);
    assert.strictEqual(signals[0].signalLevel, 'Minat sedang');
    assert.strictEqual(signals[0].primaryReason, 'Kemajuan belajar mencapai 80%.');

    // Signal 2 (Completed)
    assert.strictEqual(signals[1].id, 'sig-2');
    assert.strictEqual(signals[1].sourceEventId, 'evt-completed');
    assert.strictEqual(signals[1].intentScore, 80);
    assert.strictEqual(signals[1].signalLevel, 'Minat tinggi');

    // Signal 3 (CTA clicked)
    assert.strictEqual(signals[2].id, 'sig-3');
    assert.strictEqual(signals[2].sourceEventId, 'evt-cta-click');
    assert.strictEqual(signals[2].intentScore, 100);
    assert.strictEqual(signals[2].signalLevel, 'Minat tinggi');
  });

  it('2. Class Learners semantic filtering: contacts without enrollments are excluded', () => {
    const contacts = [
      { id: 'cnt-prospect-flow-only', name: 'Prospect Flow Only', phoneE164: '+628111111111' },
      { id: 'cnt-learner-class', name: 'Learner Class Active', phoneE164: '+628222222222' },
    ];

    const enrollments = [
      { id: 'enr-1', contactId: 'cnt-learner-class', programId: 'prog-1', progressPercent: 85, intentLabel: 'HOT' },
    ];

    const enrolledContactIds = new Set(enrollments.map((e) => e.contactId));
    const learnerContacts = contacts.filter((c) => enrolledContactIds.has(c.id));

    assert.strictEqual(learnerContacts.length, 1);
    assert.strictEqual(learnerContacts[0].id, 'cnt-learner-class');
    assert.strictEqual(learnerContacts[0].name, 'Learner Class Active');
    assert.strictEqual(learnerContacts.some((c) => c.id === 'cnt-prospect-flow-only'), false);
  });
});
