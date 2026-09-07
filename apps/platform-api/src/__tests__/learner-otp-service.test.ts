// apps/platform-api/src/__tests__/learner-otp-service.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLearnerOtpService } from '../services/class/learner-otp-service';
import type { OtpSender } from '../services/class/otp-sender';
import { DomainError } from '../core/errors';

const now = new Date('2026-09-06T03:00:00Z');

function makeDeps(overrides: Partial<{ contact: any; sent: string[] }> = {}) {
  const sent: string[] = [];
  const sender: OtpSender = { async send(phoneE164, code) { sent.push(`${phoneE164}:${code}`); } };
  const challengeRows: any[] = [];
  return {
    deps: {
      clock: () => now,
      sender,
      otpRepo: {
        async countRecentByPhone() { return 0; },
        async createChallenge(input: any) {
          const row = { id: 'ch1', ...input, consumedAt: null, attempts: 0 };
          challengeRows.push(row);
          return row;
        },
        async findLatestActiveByPhone() { return challengeRows[challengeRows.length - 1] ?? null; },
        async atomicConsume(id: string, codeHash: string, at: Date) {
          const row = challengeRows.find((r) => r.id === id);
          if (!row) return null;
          if (row.codeHash !== codeHash) { row.attempts += 1; return null; }
          row.consumedAt = at;
          return row;
        },
      },
      contactFinder: {
        async findLearnerByPhone(_phoneE164: string) {
          return overrides.contact === undefined
            ? { contactId: 'c1', organizationId: 'o1', workspaceSlug: 'rina-stifin', displayName: 'Budi' }
            : overrides.contact;
        },
      },
      createSession: async (_organizationId: string, _contactId: string) => ({ sessionToken: 'lsess_test' }),
    },
    sent,
  };
}

describe('learner-otp-service', () => {
  it('request: membuat challenge 6 digit, mengirim via sender, expiry 5 menit', async () => {
    const { deps, sent } = makeDeps();
    const svc = createLearnerOtpService({} as any, deps as any);
    const res = await svc.requestChallenge({ phoneRaw: '081234567890' });
    assert.match(sent[0], /^\+6281234567890:\d{6}$/);
    assert.equal(new Date(res.expiresAt).getTime() - now.getTime(), 5 * 60_000);
  });

  it('request: rate limit 3 permintaan per 15 menit', async () => {
    const { deps } = makeDeps();
    const svc = createLearnerOtpService({} as any, { ...deps, otpRepo: { ...deps.otpRepo, async countRecentByPhone() { return 3; } } } as any);
    await assert.rejects(() => svc.requestChallenge({ phoneRaw: '081234567890' }),
      (e: unknown) => e instanceof DomainError && e.code === 'OTP_RATE_LIMITED');
  });

  it('request: nomor tanpa enrollment → LEARNER_NOT_FOUND (tanpa membocorkan info)', async () => {
    const { deps } = makeDeps({ contact: null });
    const svc = createLearnerOtpService({} as any, deps as any);
    await assert.rejects(() => svc.requestChallenge({ phoneRaw: '080000000000' }),
      (e: unknown) => e instanceof DomainError && e.code === 'LEARNER_NOT_FOUND');
  });

  it('verify: kode benar menghasilkan sesi + workspaceSlug', async () => {
    const { deps, sent } = makeDeps();
    const svc = createLearnerOtpService({} as any, deps as any);
    await svc.requestChallenge({ phoneRaw: '081234567890' });
    const code = sent[0].split(':')[1];
    assert.ok(code);
    const res = await svc.verifyChallenge({ phoneRaw: '081234567890', code });
    assert.equal(res.contactId, 'c1');
    assert.equal(res.workspaceSlug, 'rina-stifin');
  });

  it('verify: kode salah → OTP_INVALID', async () => {
    const { deps } = makeDeps();
    const svc = createLearnerOtpService({} as any, deps as any);
    await svc.requestChallenge({ phoneRaw: '081234567890' });
    await assert.rejects(() => svc.verifyChallenge({ phoneRaw: '081234567890', code: '000000' }),
      (e: unknown) => e instanceof DomainError && e.code === 'OTP_INVALID');
  });

  it('verify: kode kedaluwarsa (>5 menit) → OTP_EXPIRED', async () => {
    const { deps, sent } = makeDeps();
    let t = now.getTime();
    const svc = createLearnerOtpService({} as any, {
      ...deps,
      clock: () => new Date(t),
    } as any);
    await svc.requestChallenge({ phoneRaw: '081234567890' });
    const code = sent[0].split(':')[1];
    t += 6 * 60_000;
    await assert.rejects(() => svc.verifyChallenge({ phoneRaw: '081234567890', code }),
      (e: unknown) => e instanceof DomainError && e.code === 'OTP_EXPIRED');
  });
});
