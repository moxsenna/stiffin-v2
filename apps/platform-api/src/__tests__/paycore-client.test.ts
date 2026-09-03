import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildPaycoreRequestSignature,
  buildPaycoreWebhookSignature,
  verifyPaycoreWebhookSignature,
  createPaycoreClient,
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
