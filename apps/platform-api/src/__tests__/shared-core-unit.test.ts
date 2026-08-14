import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizePhone,
  normalizeEmail,
  formatPhoneDisplay,
  isValidIanaTimezone,
  DEFAULT_ORGANIZATION_TIMEZONE,
} from '@promotor/platform-core';
import { PhoneE164Schema, ContactSchema } from '@promotor/contracts';

describe('B1 — Shared Core unit invariants (no DB)', () => {
  it('normalizePhone produces canonical E.164 for all ID prefix variants', () => {
    assert.strictEqual(normalizePhone('0812 1234 5678'), '+6281212345678');
    assert.strictEqual(normalizePhone('+62 812 1234 5678'), '+6281212345678');
    assert.strictEqual(normalizePhone('6281212345678'), '+6281212345678');
    assert.strictEqual(normalizePhone('812-1234-5678'), '+6281212345678');
  });

  it('normalizePhone rejects invalid input', () => {
    assert.throws(() => normalizePhone(''), /tidak boleh kosong/);
    assert.throws(() => normalizePhone('12345'), /tidak valid/);
    assert.throws(() => normalizePhone('nomor-apa-ini'), /tidak valid/);
  });

  it('normalized values satisfy the canonical PhoneE164Schema', () => {
    const normalized = normalizePhone('+62 812 1234 5678');
    assert.doesNotThrow(() => PhoneE164Schema.parse(normalized));
  });

  it('normalizeEmail is canonical trim + lowercase', () => {
    assert.strictEqual(normalizeEmail('  Ayu@Example.com '), 'ayu@example.com');
    assert.strictEqual(normalizeEmail('AYU@EXAMPLE.COM'), 'ayu@example.com');
    assert.strictEqual(normalizeEmail('ayu@example.com'), 'ayu@example.com');
  });

  it('a canonical contact produced by B1 satisfies the frozen ContactSchema', () => {
    const contact = {
      id: 'a1b2c3d4-0000-0000-0000-000000000000',
      organizationId: 'b2c3d4e5-0000-0000-0000-000000000000',
      name: 'Ayu Rahma',
      phoneE164: normalizePhone('081212345678'),
      createdAt: new Date().toISOString(),
    };
    assert.doesNotThrow(() => ContactSchema.parse(contact));
  });

  it('formatPhoneDisplay renders +62 style', () => {
    assert.strictEqual(formatPhoneDisplay('+6281212345678'), '+62 812-1234-5678');
  });

  it('isValidIanaTimezone accepts real IANA ids and rejects garbage', () => {
    assert.strictEqual(isValidIanaTimezone('Asia/Jakarta'), true);
    assert.strictEqual(isValidIanaTimezone('America/New_York'), true);
    assert.strictEqual(isValidIanaTimezone('Not/AZone'), false);
    assert.strictEqual(isValidIanaTimezone(''), false);
  });

  it('default organization timezone is Asia/Jakarta (contract §11)', () => {
    assert.strictEqual(DEFAULT_ORGANIZATION_TIMEZONE, 'Asia/Jakarta');
  });
});
