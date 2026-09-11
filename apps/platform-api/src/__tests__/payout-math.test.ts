// apps/platform-api/src/__tests__/payout-math.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calcNetAmount, assertPayoutTransition } from '../services/payout/payout-math';

describe('payout math', () => {
  it('subtracts processor fee and 3000 flat', () => {
    assert.strictEqual(calcNetAmount(100000, 2000), 95000);
  });

  it('treats null processor fee as zero', () => {
    assert.strictEqual(calcNetAmount(50000, null), 47000);
  });

  it('allows DRAFT to PROCESSING', () => {
    assert.doesNotThrow(() => assertPayoutTransition('DRAFT', 'PROCESSING'));
  });

  it('rejects DRAFT straight to PAID', () => {
    assert.throws(() => assertPayoutTransition('DRAFT', 'PAID'));
  });
});
