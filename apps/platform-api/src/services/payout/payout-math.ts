// apps/platform-api/src/services/payout/payout-math.ts
import type { PayoutBatchStatus } from '@promotor/contracts';
import { DomainError } from '../../core/errors';

export const PLATFORM_FEE_FLAT = 3000;

export function calcNetAmount(gross: number, processorFee?: number | null): number {
  const fee = processorFee ?? 0;
  return gross - fee - PLATFORM_FEE_FLAT;
}

const ALLOWED: Record<PayoutBatchStatus, PayoutBatchStatus[]> = {
  DRAFT: ['PROCESSING'],
  PROCESSING: ['PAID', 'FAILED'],
  FAILED: ['PROCESSING'],
  PAID: [],
};

export function assertPayoutTransition(from: PayoutBatchStatus, to: PayoutBatchStatus): void {
  if (!ALLOWED[from]?.includes(to)) {
    throw new DomainError('CONFLICT', `Transisi batch tidak valid: ${from} ke ${to}`);
  }
}
