import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeRevenueSummary } from '../domain/flow/revenue-summary';

describe('computeRevenueSummary', () => {
  const bookings = [
    { paymentStatus: 'PAID', paidAt: '2026-09-02T04:00:00.000Z', amount: 600000 },  // Sep, WIB 11:00
    { paymentStatus: 'PAID', paidAt: '2026-08-20T04:00:00.000Z', amount: 350000 },  // Agustus
    { paymentStatus: 'UNPAID', paidAt: '2026-09-03T04:00:00.000Z', amount: 999999 },
    { paymentStatus: 'PAID', paidAt: '2026-09-03T04:00:00.000Z', amount: 1200000 },
  ];

  it('bulan kalender (WIB) hanya memasukkan PAID bulan ini', () => {
    const res = computeRevenueSummary(bookings as any[], { period: 'MONTH', now: new Date('2026-09-06T00:00:00.000Z'), commissionPercent: 10 });
    assert.equal(res.paidCount, 2);
    assert.equal(res.grossAmount, 600000 + 1200000);
    assert.equal(res.estimatedCommission, 180000);
  });

  it('minggu berjalan (Senin sebagai awal, WIB)', () => {
    // 2026-09-06 adalah Minggu WIB → minggu mulai Senin 2026-08-31 WIB; kedua PAID Sept masih masuk
    const res = computeRevenueSummary(bookings as any[], { period: 'WEEK', now: new Date('2026-09-06T00:00:00.000Z'), commissionPercent: 0 });
    assert.equal(res.paidCount, 2);
  });

  it('komisi 0 → estimatedCommission 0', () => {
    const res = computeRevenueSummary([], { period: 'MONTH', now: new Date(), commissionPercent: 0 });
    assert.equal(res.estimatedCommission, 0);
  });
});
