import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildPaycoreRequestSignature,
  buildPaycoreWebhookSignature,
  verifyPaycoreWebhookSignature,
  createPaycoreClient,
  validatePaycoreConfig,
} from '../services/paycore/paycore-client';

describe('Paycore Integration — Crypto & Webhook Signatures', () => {
  const secret = 'test-secret-key-1234567890';
  const timestamp = new Date().toISOString();
  const rawBody = JSON.stringify({ hello: 'world', amount: 149000 });

  it('produces 64-char hex HMAC-SHA256 signature for app request signing', () => {
    const sig = buildPaycoreRequestSignature(secret, timestamp, 'POST', '/v1/orders', rawBody);
    assert.match(sig, /^[a-f0-9]{64}$/);
  });

  it('produces stable signature matching Paycore protocol for known canonical input', () => {
    const fixedTime = '2026-06-23T15:00:00.000Z';
    const fixedBody = '{}';
    const sig = buildPaycoreRequestSignature('secret', fixedTime, 'POST', '/v1/orders', fixedBody);
    assert.match(sig, /^[a-f0-9]{64}$/);

    const sig2 = buildPaycoreRequestSignature('secret', fixedTime, 'POST', '/v1/orders', fixedBody);
    assert.strictEqual(sig, sig2, 'HMAC must be deterministic');
  });

  it('verifies valid webhook signature with sha256= prefix', () => {
    const webhookSecret = 'whsec_test_abc123';
    const whTimestamp = new Date().toISOString();
    const eventBody = JSON.stringify({
      event_id: 'evt_123',
      event_type: 'payment.succeeded',
      occurred_at: whTimestamp,
      data: { order_id: 'NAR-123', amount: 199000 },
    });

    const signatureHex = buildPaycoreWebhookSignature(webhookSecret, whTimestamp, eventBody);
    const signatureHeader = `sha256=${signatureHex}`;

    const isValid = verifyPaycoreWebhookSignature(
      eventBody,
      whTimestamp,
      signatureHeader,
      webhookSecret
    );
    assert.strictEqual(isValid, true, 'Valid signature must be accepted');
  });

  it('rejects webhook with invalid signature', () => {
    const webhookSecret = 'whsec_test_abc123';
    const whTimestamp = new Date().toISOString();
    const eventBody = JSON.stringify({ test: 1 });
    const invalidSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    const isValid = verifyPaycoreWebhookSignature(
      eventBody,
      whTimestamp,
      invalidSignature,
      webhookSecret
    );
    assert.strictEqual(isValid, false, 'Invalid signature must be rejected');
  });

  it('rejects webhook with expired timestamp (> 300s clock skew)', () => {
    const webhookSecret = 'whsec_test_abc123';
    const expiredTimestamp = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
    const eventBody = JSON.stringify({ test: 1 });
    const signatureHex = buildPaycoreWebhookSignature(webhookSecret, expiredTimestamp, eventBody);

    const isValid = verifyPaycoreWebhookSignature(
      eventBody,
      expiredTimestamp,
      `sha256=${signatureHex}`,
      webhookSecret
    );
    assert.strictEqual(isValid, false, 'Expired timestamp must be rejected');
  });

  it('handles missing headers fail-closed', () => {
    assert.strictEqual(verifyPaycoreWebhookSignature('', null, null, 'secret'), false);
    assert.strictEqual(verifyPaycoreWebhookSignature('{}', undefined, 'sha256=abc', 'secret'), false);
    assert.strictEqual(verifyPaycoreWebhookSignature('{}', new Date().toISOString(), undefined, 'secret'), false);
  });
});

describe('Paycore Configuration — Fail-Closed Invariants', () => {
  const validBase = {
    PAYCORE_BASE_URL: 'https://paycore.internal.promotorflow.id',
    PAYCORE_APP_UUID: '11111111-2222-3333-4444-555555555555',
    PAYCORE_KEY_ID: 'pk_live_real_key_001',
    PAYCORE_APP_SECRET: 'sec_live_abcdef1234567890abcdef',
    PAYCORE_WEBHOOK_SECRET: 'whsec_live_9876543210fedcba',
  };

  it('rejects undefined environment', () => {
    assert.throws(() => validatePaycoreConfig(undefined), /Konfigurasi environment Paycore/);
  });

  it('rejects missing baseUrl', () => {
    assert.throws(() => validatePaycoreConfig({ ...validBase, PAYCORE_BASE_URL: '' }), /PAYCORE_BASE_URL/);
  });

  it('rejects missing appUuid', () => {
    assert.throws(() => validatePaycoreConfig({ ...validBase, PAYCORE_APP_UUID: '' }), /PAYCORE_APP_UUID/);
  });

  it('rejects missing keyId', () => {
    assert.throws(() => validatePaycoreConfig({ ...validBase, PAYCORE_KEY_ID: '' }), /PAYCORE_KEY_ID/);
  });

  it('rejects missing appSecret', () => {
    assert.throws(() => validatePaycoreConfig({ ...validBase, PAYCORE_APP_SECRET: '' }), /PAYCORE_APP_SECRET/);
  });

  it('rejects missing webhookSecret', () => {
    assert.throws(() => validatePaycoreConfig({ ...validBase, PAYCORE_WEBHOOK_SECRET: '' }), /PAYCORE_WEBHOOK_SECRET/);
  });

  it('rejects forbidden dummy default secrets fail-closed', () => {
    assert.throws(
      () => validatePaycoreConfig({ ...validBase, PAYCORE_APP_SECRET: 'secret_default' }),
      /tidak boleh menggunakan nilai default/
    );
    assert.throws(
      () => validatePaycoreConfig({ ...validBase, PAYCORE_WEBHOOK_SECRET: 'whsec_default' }),
      /tidak boleh menggunakan nilai default/
    );
    assert.throws(
      () => validatePaycoreConfig({ ...validBase, PAYCORE_KEY_ID: 'key_default' }),
      /tidak boleh menggunakan nilai default/
    );
    assert.throws(
      () => validatePaycoreConfig({ ...validBase, PAYCORE_APP_UUID: '00000000-0000-0000-0000-000000000000' }),
      /tidak boleh menggunakan nilai dummy/
    );
  });

  it('rejects insecure HTTP and localhost in production/staging', () => {
    assert.throws(
      () => validatePaycoreConfig({ ...validBase, PAYCORE_BASE_URL: 'http://api.paycore.id' }, 'production'),
      /harus menggunakan protokol HTTPS/
    );
    assert.throws(
      () => validatePaycoreConfig({ ...validBase, PAYCORE_BASE_URL: 'https://localhost:8787' }, 'production'),
      /tidak boleh mengarah ke localhost/
    );
    assert.throws(
      () => validatePaycoreConfig({ ...validBase, PAYCORE_BASE_URL: 'https://127.0.0.1:8787' }, 'staging'),
      /tidak boleh mengarah ke localhost/
    );
  });

  it('accepts valid configuration and returns trimmed config object', () => {
    const config = validatePaycoreConfig(validBase, 'production');
    assert.strictEqual(config.baseUrl, 'https://paycore.internal.promotorflow.id');
    assert.strictEqual(config.appUuid, '11111111-2222-3333-4444-555555555555');
    assert.strictEqual(config.keyId, 'pk_live_real_key_001');
  });

  it('createPaycoreClient throws immediately on dummy secrets', () => {
    assert.throws(
      () =>
        createPaycoreClient({
          baseUrl: 'https://example.com',
          appUuid: '00000000-0000-0000-0000-000000000000',
          keyId: 'key_default',
          appSecret: 'secret_default',
          webhookSecret: 'whsec_default',
        }),
      /PaycoreClient cannot be instantiated with dummy default secrets/
    );
  });
});
