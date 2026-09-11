// apps/platform-api/src/__tests__/payout-service.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createPayoutService } from '../services/payout/payout-service';

const orgId = '00000000-0000-4000-8000-000000000010';
const bankId = '00000000-0000-4000-8000-000000000011';

function harness() {
  const batches = new Map<string, any>();
  const payoutRepo: any = {
    findBankById: async () => ({
      id: bankId, organizationId: orgId, bankName: 'BCA',
      accountNumber: '123', accountHolderName: 'Promotor', isActive: true,
    }),
    findAvailableOrdersByIds: async (_o: string, ids: string[]) =>
      ids.map((id) => ({ order: { id, organizationId: orgId, amount: 100000, status: 'PAID' }, processorFee: 2000 })),
    createBatchWithItems: async (b: any, items: any[]) => {
      const batch = { id: 'batch-1', ...b };
      batches.set(batch.id, batch);
      return { batch, items };
    },
    getBatchById: async (id: string) => batches.get(id) ?? null,
    updateBatch: async (id: string, patch: any) => ({ id, ...batches.get(id), ...patch }),
  };
  const commerceRepo: any = {
    updatePlatformFeeStatus: async () => null,
  };
  return { payoutRepo, commerceRepo };
}

describe('payout service', () => {
  it('computes totalNet 95000 per 100k order with 2k processor fee', async () => {
    const { payoutRepo, commerceRepo } = harness();
    const svc = createPayoutService({ payoutRepo, commerceRepo } as any);
    const { batch } = await svc.createBatch({
      organizationId: orgId,
      orderIds: ['00000000-0000-4000-8000-000000000021'],
      bankAccountId: bankId,
    });
    assert.strictEqual(batch.totalNet, 95000);
    assert.strictEqual(batch.orderCount, 1);
    assert.strictEqual(batch.status, 'DRAFT');
  });

  it('requires proofUrl for markPaid', async () => {
    const { payoutRepo, commerceRepo } = harness();
    const svc = createPayoutService({ payoutRepo, commerceRepo } as any);
    await svc.createBatch({
      organizationId: orgId,
      orderIds: ['00000000-0000-4000-8000-000000000022'],
      bankAccountId: bankId,
    });
    await assert.rejects(() => svc.markPaid({ organizationId: orgId, batchId: 'batch-1', proofUrl: '' }));
  });
});
