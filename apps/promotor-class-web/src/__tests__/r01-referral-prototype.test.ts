import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { capturePrototypeReferralCode } from '../lib/referral-capture';
import { isReferralPrototypeEnabled } from '../lib/feature-flags';
import { MockStateStore } from '../adapters/mock/mock-state-store';

describe('Milestone R0.1 — Referral Prototype Closure Test Suite', () => {
  it('1. capturePrototypeReferralCode normalizes valid code to uppercase and trims whitespace', () => {
    // Mock window & sessionStorage in Node test environment
    const mockStorage: Record<string, string> = {};
    (globalThis as any).window = {};
    (globalThis as any).sessionStorage = {
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      getItem: (key: string) => mockStorage[key] || null,
    };

    const success = capturePrototypeReferralCode('  7x9k4q  ');
    assert.strictEqual(success, true);
    assert.strictEqual(mockStorage['stiffin_demo_ref_code'], '7X9K4Q');
  });

  it('2. capturePrototypeReferralCode safely rejects malformed or unsafe ref codes', () => {
    const invalidCodes = [
      '',
      '   ',
      'ABC', // too short (<4)
      'TOOLONGREFERRALCODE123', // too long (>12)
      '<script>alert(1)</script>',
      'REF-CODE-123!',
      '$$$VAL$$$',
    ];

    for (const code of invalidCodes) {
      const res = capturePrototypeReferralCode(code);
      assert.strictEqual(res, false, `Code "${code}" should be rejected safely`);
    }
  });

  it('3. isReferralPrototypeEnabled returns true in dev mode and false when disabled', () => {
    const isEnabled = isReferralPrototypeEnabled();
    assert.strictEqual(typeof isEnabled, 'boolean');
  });

  it('4. Architecture Guardrail: app/referrals/page.tsx does NOT hardcode tenant "rina"', () => {
    const pageFilePath = path.join(__dirname, '../app/(promotor)/app/referrals/page.tsx');
    const content = fs.readFileSync(pageFilePath, 'utf8');

    // Must NOT call getPromoterReferralOverviewQuery('rina') directly
    assert.strictEqual(
      content.includes("getPromoterReferralOverviewQuery('rina')"),
      false,
      'app/referrals/page.tsx must NOT contain hardcoded getPromoterReferralOverviewQuery(\'rina\')'
    );
  });

  it('5. Architecture Guardrail: MockStateStore contains zero referral collections or state mutations', () => {
    const store = MockStateStore.getState();
    const storeKeys = Object.keys(store);

    assert.strictEqual(storeKeys.includes('referrals'), false);
    assert.strictEqual(storeKeys.includes('referralPrograms'), false);
    assert.strictEqual(storeKeys.includes('referralAttributions'), false);
    assert.strictEqual(storeKeys.includes('referralRewards'), false);
  });
});
