// apps/platform-api/src/__tests__/payout-contracts.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PayoutBatchSchema, DashboardSummarySchema } from '@promotor/contracts';

describe('payout contracts', () => {
  it('accepts a DRAFT batch', () => {
    const parsed = PayoutBatchSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000001',
      organizationId: '00000000-0000-4000-8000-000000000002',
      status: 'DRAFT',
      totalNet: 100000,
      orderCount: 2,
      bankAccountId: null,
      destBankName: 'BCA',
      destAccountNumber: '123',
      destHolderName: 'Promotor',
      proofUrl: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(parsed.success, true);
  });

  it('accepts a dashboard summary', () => {
    const parsed = DashboardSummarySchema.safeParse({
      monthlyOmzet: 500000,
      pesertaCount: 10,
      completionPercent: 42.5,
      growthPercent: -5,
      programAktif: [],
      aktivitasTerbaru: [],
    });
    assert.strictEqual(parsed.success, true);
  });
});
