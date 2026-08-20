import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeReturnTo } from '../lib/auth';

describe('P0-1 — Auth returnTo Deterministic Sanitizer (PromotorFlow)', () => {
  it('1. Allows valid internal /app routes', () => {
    assert.strictEqual(sanitizeReturnTo('/app'), '/app');
    assert.strictEqual(sanitizeReturnTo('/app/contacts'), '/app/contacts');
    assert.strictEqual(sanitizeReturnTo('/app/contacts/cnt_123'), '/app/contacts/cnt_123');
    assert.strictEqual(sanitizeReturnTo('/app/calendar?view=week#upcoming'), '/app/calendar?view=week#upcoming');
    assert.strictEqual(sanitizeReturnTo('/app/services'), '/app/services');
    assert.strictEqual(sanitizeReturnTo('/app/settings'), '/app/settings');
  });

  it('2. Fallback to /app for null, undefined, empty, or whitespace inputs', () => {
    assert.strictEqual(sanitizeReturnTo(null), '/app');
    assert.strictEqual(sanitizeReturnTo(undefined), '/app');
    assert.strictEqual(sanitizeReturnTo(''), '/app');
    assert.strictEqual(sanitizeReturnTo('   '), '/app');
  });

  it('3. Rejects external URLs and schemes', () => {
    assert.strictEqual(sanitizeReturnTo('https://evil.example'), '/app');
    assert.strictEqual(sanitizeReturnTo('http://evil.example'), '/app');
    assert.strictEqual(sanitizeReturnTo('//evil.example'), '/app');
    assert.strictEqual(sanitizeReturnTo('//evil.example/app'), '/app');
    assert.strictEqual(sanitizeReturnTo('javascript:alert(1)'), '/app');
    assert.strictEqual(sanitizeReturnTo('data:text/html,<script>alert(1)</script>'), '/app');
    assert.strictEqual(sanitizeReturnTo('vbscript:msgbox(1)'), '/app');
  });

  it('4. Rejects backslash and encoded protocol/bypass variants', () => {
    assert.strictEqual(sanitizeReturnTo('\\evil.example'), '/app');
    assert.strictEqual(sanitizeReturnTo('/app/\\evil.example'), '/app');
    assert.strictEqual(sanitizeReturnTo('/app/test%5cevil'), '/app');
    assert.strictEqual(sanitizeReturnTo('/app/test%5Cevil'), '/app');
    assert.strictEqual(sanitizeReturnTo('/app.evil.example'), '/app');
    assert.strictEqual(sanitizeReturnTo('/application'), '/app');
    assert.strictEqual(sanitizeReturnTo('/appevil'), '/app');
  });

  it('5. Rejects paths outside protected app surface', () => {
    assert.strictEqual(sanitizeReturnTo('/p/demo/book'), '/app');
    assert.strictEqual(sanitizeReturnTo('/login'), '/app');
    assert.strictEqual(sanitizeReturnTo('/api/v1/flow/today'), '/app');
  });
});
