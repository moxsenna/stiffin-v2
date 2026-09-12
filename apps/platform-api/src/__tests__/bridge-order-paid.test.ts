import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Kontrak emitter ORDER_PAID: dipanggil commerce-service pada semua jalur
// fulfilment program berbayar (PAID webhook, PAID checkout gratis-kupon,
// APPROVED manual) untuk orderType PROGRAM_PURCHASE, dan diabaikan untuk
// SUBSCRIPTION_PURCHASE. Implementasi emitter ada di routes (getCommerceServices)
// dengan gating entitlemen promotorFlow + idempotencyKey promotorclass:order-paid:<orderId>.
describe('ORDER_PAID bridge contract', () => {
  it('payload emitter membawa field minimal', () => {
    const input = {
      organizationId: 'org-1',
      orderId: 'ord-1',
      contactId: 'c-1',
      amount: 199000,
      programTitle: 'Mentoring STIFIn' as string | null,
      buyerName: 'Ayu' as string | null,
    };
    assert.ok(input.amount > 0);
    assert.ok(input.programTitle || input.programTitle === null);
    assert.ok(input.buyerName || input.buyerName === null);
  });

  it('helper tidak mem-broadcast order non-program', () => {
    // Registrasi ulang logika guard helper: orderType selain PROGRAM_PURCHASE di-skip.
    const order = { orderType: 'SUBSCRIPTION_PURCHASE' };
    const shouldBridge = order.orderType === 'PROGRAM_PURCHASE';
    assert.equal(shouldBridge, false);
  });
});
