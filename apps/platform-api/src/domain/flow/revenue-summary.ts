export interface RevenueSummary {
  period: 'WEEK' | 'MONTH';
  paidCount: number;
  grossAmount: number;
  commissionPercent: number;
  estimatedCommission: number;
}

// Batas periode dihitung di Asia/Jakarta (UTC+7) sesuai DEFAULT_ORGANIZATION_TIMEZONE
function wibOffsetMs(): number { return 7 * 3600_000; }

function startOfMonthWib(now: Date): Date {
  const wib = new Date(now.getTime() + wibOffsetMs());
  const start = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1, 0, 0, 0);
  return new Date(start - wibOffsetMs());
}

function startOfWeekWib(now: Date): Date {
  const wib = new Date(now.getTime() + wibOffsetMs());
  const dayOfWeek = wib.getUTCDay(); // 0=Min
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const start = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - daysSinceMonday, 0, 0, 0);
  return new Date(start - wibOffsetMs());
}

export function computeRevenueSummary(
  bookings: Array<{ paymentStatus: string; paidAt: string | null; amount: number }>,
  input: { period: 'WEEK' | 'MONTH'; now: Date; commissionPercent: number }
): RevenueSummary {
  const from = input.period === 'MONTH' ? startOfMonthWib(input.now) : startOfWeekWib(input.now);
  let paidCount = 0;
  let grossAmount = 0;
  for (const b of bookings) {
    if (b.paymentStatus !== 'PAID' || !b.paidAt) continue;
    if (new Date(b.paidAt).getTime() < from.getTime()) continue;
    paidCount += 1;
    grossAmount += b.amount;
  }
  const commissionPercent = Math.max(0, Math.min(100, input.commissionPercent));
  return {
    period: input.period,
    paidCount,
    grossAmount,
    commissionPercent,
    estimatedCommission: Math.floor((grossAmount * commissionPercent) / 100),
  };
}
