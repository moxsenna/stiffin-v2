// apps/platform-api/src/services/payout/payout-service.ts
import { z } from 'zod';
import { DomainError } from '../../core/errors';
import { calcNetAmount, assertPayoutTransition } from './payout-math';
import type { PayoutRepository } from '../../repositories/payout-repository';
import type { CommerceRepository } from '../../repositories/commerce-repository';

const UuidSchema = z.string().uuid();

function parseUuid(value: string, label: string): string {
  const parsed = UuidSchema.safeParse(value);
  if (!parsed.success) throw new DomainError('VALIDATION_ERROR', `${label} tidak valid`);
  return parsed.data;
}

export function createPayoutService(deps: { payoutRepo: PayoutRepository; commerceRepo: CommerceRepository }) {
  return {
    async createBatch(input: { organizationId: string; orderIds: string[]; bankAccountId: string }) {
      const orgId = parseUuid(input.organizationId, 'Organisasi');
      const bankId = parseUuid(input.bankAccountId, 'Rekening');
      const orderIds = [...new Set(input.orderIds)];
      if (orderIds.length === 0) throw new DomainError('VALIDATION_ERROR', 'Pilih minimal 1 order');
      if (orderIds.length > 100) throw new DomainError('VALIDATION_ERROR', 'Maksimal 100 order per batch');

      const bank = await deps.payoutRepo.findBankById(orgId, bankId);
      if (!bank || !bank.isActive) {
        throw new DomainError('VALIDATION_ERROR', 'Rekening tujuan tidak ditemukan atau nonaktif. Tambahkan rekening dulu.');
      }
      const avail = await deps.payoutRepo.findAvailableOrdersByIds(orgId, orderIds);
      if (avail.length !== orderIds.length) {
        throw new DomainError('CONFLICT', 'Sebagian order sudah dicairkan atau belum lunas');
      }
      const items = avail.map((a) => ({
        orderId: a.order.id,
        netAmount: Math.max(0, calcNetAmount(a.order.amount, a.processorFee)),
      }));
      const totalNet = items.reduce((s, i) => s + i.netAmount, 0);
      try {
        return await deps.payoutRepo.createBatchWithItems(
          {
            organizationId: orgId,
            status: 'DRAFT',
            totalNet,
            orderCount: items.length,
            bankAccountId: bank.id,
            destBankName: bank.bankName,
            destAccountNumber: bank.accountNumber,
            destHolderName: bank.accountHolderName,
          },
          items
        );
      } catch (err: any) {
        if (String(err?.code ?? err?.cause?.code) === '23505') {
          throw new DomainError('CONFLICT', 'Sebagian order sudah masuk batch lain');
        }
        throw err;
      }
    },

    async submitBatch(input: { organizationId: string; batchId: string }) {
      const batch = await deps.payoutRepo.getBatchById(input.organizationId, input.batchId);
      if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
      assertPayoutTransition(batch.status as any, 'PROCESSING');
      return await deps.payoutRepo.updateBatch(batch.id, { status: 'PROCESSING' });
    },

    async markPaid(input: { organizationId: string; batchId: string; proofUrl: string }) {
      const proof = (input.proofUrl ?? '').trim();
      if (!proof || !/^https?:\/\//i.test(proof)) {
        throw new DomainError('VALIDATION_ERROR', 'Bukti transfer wajib berupa URL sebelum PAID');
      }
      const batch = await deps.payoutRepo.getBatchById(input.organizationId, input.batchId);
      if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
      assertPayoutTransition(batch.status as any, 'PAID');
      const nowIso = new Date().toISOString();
      const updated = await deps.payoutRepo.updateBatch(batch.id, {
        status: 'PAID',
        proofUrl: proof,
        paidAt: nowIso,
      });
      const orderIds = await deps.payoutRepo.listBatchOrderIds(batch.id);
      for (const orderId of orderIds) {
        await deps.commerceRepo.updatePlatformFeeStatus(orderId, 'BILLED', { billedAt: nowIso }).catch(() => null);
      }
      return updated;
    },

    async markFailed(input: { organizationId: string; batchId: string }) {
      const batch = await deps.payoutRepo.getBatchById(input.organizationId, input.batchId);
      if (!batch) throw new DomainError('NOT_FOUND', 'Batch pencairan tidak ditemukan');
      assertPayoutTransition(batch.status as any, 'FAILED');
      return await deps.payoutRepo.updateBatch(batch.id, { status: 'FAILED' });
    },
  };
}
