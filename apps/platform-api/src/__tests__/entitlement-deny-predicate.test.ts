import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isEntitlementDenied } from '../../tooling/b2-live-acceptance';

/**
 * E-A micro-closure: the --rehearse-auth entitlement-deny predicate must be a
 * single boolean that drives BOTH safeLog and failures++. A 403 with the wrong
 * error code (e.g. WRONG_ERROR_CODE) must NEVER count as acceptance success.
 */
describe('B2 — entitlement-deny acceptance predicate (no false pass)', () => {
  it('403 + ENTITLEMENT_DENIED => PASS', () => {
    assert.strictEqual(
      isEntitlementDenied(403, { error: { code: 'ENTITLEMENT_DENIED' } }),
      true
    );
  });

  it('403 + WRONG_ERROR_CODE => FAIL (false-pass regression guard)', () => {
    assert.strictEqual(
      isEntitlementDenied(403, { error: { code: 'WRONG_ERROR_CODE' } }),
      false
    );
  });

  it('non-403 => FAIL even with ENTITLEMENT_DENIED code', () => {
    assert.strictEqual(
      isEntitlementDenied(200, { error: { code: 'ENTITLEMENT_DENIED' } }),
      false
    );
    assert.strictEqual(
      isEntitlementDenied(401, { error: { code: 'ENTITLEMENT_DENIED' } }),
      false
    );
  });

  it('missing/malformed body => FAIL', () => {
    assert.strictEqual(isEntitlementDenied(403, null), false);
    assert.strictEqual(isEntitlementDenied(403, {}), false);
    assert.strictEqual(isEntitlementDenied(403, { error: undefined }), false);
  });
});
