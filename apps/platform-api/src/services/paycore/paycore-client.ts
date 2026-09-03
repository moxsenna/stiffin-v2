import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '../../core/errors';

export interface PaycoreConfig {
  baseUrl: string;
  appUuid: string;
  keyId: string;
  appSecret: string;
  webhookSecret: string;
}

const FORBIDDEN_PLACEHOLDERS = new Set([
  'secret_default',
  'whsec_default',
  'key_default',
  '00000000-0000-0000-0000-000000000000',
  'dummy',
  'placeholder',
]);

export function validatePaycoreConfig(
  env: Record<string, unknown> | undefined,
  appEnv = 'production'
): PaycoreConfig {
  if (!env) {
    throw new DomainError('CONFIGURATION_ERROR', 'Konfigurasi environment Paycore tidak ditemukan');
  }

  const baseUrl = typeof env.PAYCORE_BASE_URL === 'string' ? env.PAYCORE_BASE_URL.trim() : '';
  const appUuid = typeof env.PAYCORE_APP_UUID === 'string' ? env.PAYCORE_APP_UUID.trim() : '';
  const keyId = typeof env.PAYCORE_KEY_ID === 'string' ? env.PAYCORE_KEY_ID.trim() : '';
  const appSecret = typeof env.PAYCORE_APP_SECRET === 'string' ? env.PAYCORE_APP_SECRET.trim() : '';
  const webhookSecret = typeof env.PAYCORE_WEBHOOK_SECRET === 'string' ? env.PAYCORE_WEBHOOK_SECRET.trim() : '';

  if (!baseUrl) throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_BASE_URL wajib diisi');
  if (!appUuid) throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_APP_UUID wajib diisi');
  if (!keyId) throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_KEY_ID wajib diisi');
  if (!appSecret) throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_APP_SECRET wajib diisi');
  if (!webhookSecret) throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_WEBHOOK_SECRET wajib diisi');

  if (FORBIDDEN_PLACEHOLDERS.has(appSecret.toLowerCase())) {
    throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_APP_SECRET tidak boleh menggunakan nilai default atau dummy');
  }
  if (FORBIDDEN_PLACEHOLDERS.has(webhookSecret.toLowerCase())) {
    throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_WEBHOOK_SECRET tidak boleh menggunakan nilai default atau dummy');
  }
  if (FORBIDDEN_PLACEHOLDERS.has(keyId.toLowerCase())) {
    throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_KEY_ID tidak boleh menggunakan nilai default atau dummy');
  }
  if (FORBIDDEN_PLACEHOLDERS.has(appUuid.toLowerCase())) {
    throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_APP_UUID tidak boleh menggunakan nilai dummy');
  }

  const isProductionOrStaging = appEnv === 'production' || appEnv === 'staging';
  if (isProductionOrStaging) {
    if (!baseUrl.startsWith('https://')) {
      throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_BASE_URL harus menggunakan protokol HTTPS pada staging/production');
    }
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      throw new DomainError('CONFIGURATION_ERROR', 'PAYCORE_BASE_URL tidak boleh mengarah ke localhost pada staging/production');
    }
  }

  return { baseUrl, appUuid, keyId, appSecret, webhookSecret };
}

export interface PaycoreCreateOrderInput {
  externalOrderId: string;
  productKey: string;
  description: string;
  amount: number;
  currency?: 'IDR';
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  returnUrl?: string;
  fulfillmentData?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface PaycoreCreateOrderOutput {
  order_id: string;
  external_order_id: string;
  payment_status: string;
  fulfillment_status: string;
  provider: string;
  provider_variant: string;
  payment_method: string | null;
  checkout_url: string;
  expires_at: string;
}

export interface PaycoreWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: {
    order_id: string;
    external_order_id: string;
    app_id: string;
    provider: string;
    amount: number;
    currency: string;
    paid_at: string;
    fulfillment_data?: Record<string, unknown>;
  };
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function hmacSha256Hex(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}

export function buildPaycoreRequestSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  rawBody: string
): string {
  const bodyHash = sha256Hex(rawBody);
  const canonical = `${timestamp}.${method.toUpperCase()}.${path}.${bodyHash}`;
  return hmacSha256Hex(secret, canonical);
}

export function buildPaycoreWebhookSignature(secret: string, timestamp: string, rawBody: string): string {
  const canonical = `${timestamp}.${rawBody}`;
  return hmacSha256Hex(secret, canonical);
}

export function verifyPaycoreWebhookSignature(
  rawBody: string,
  timestampHeader: string | undefined | null,
  signatureHeader: string | undefined | null,
  webhookSecret: string,
  maxSkewSeconds = 300
): boolean {
  if (!rawBody || !timestampHeader || !signatureHeader || !webhookSecret) {
    return false;
  }

  // Verify timestamp freshness
  const eventTime = new Date(timestampHeader).getTime();
  if (isNaN(eventTime)) return false;
  const now = Date.now();
  if (Math.abs(now - eventTime) > maxSkewSeconds * 1000) {
    return false;
  }

  // Signature header format: "sha256=<hex>"
  let receivedHex = signatureHeader.trim();
  if (receivedHex.startsWith('sha256=')) {
    receivedHex = receivedHex.substring(7);
  }

  const expectedHex = buildPaycoreWebhookSignature(webhookSecret, timestampHeader, rawBody);

  try {
    const receivedBuf = Buffer.from(receivedHex, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (receivedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export interface PaycoreClient {
  createOrder(input: PaycoreCreateOrderInput): Promise<PaycoreCreateOrderOutput>;
  getOrder(orderId: string): Promise<PaycoreCreateOrderOutput>;
  verifyWebhook(rawBody: string, timestampHeader?: string | null, signatureHeader?: string | null): boolean;
}

export function createPaycoreClient(config: PaycoreConfig): PaycoreClient {
  if (!config.baseUrl || !config.appUuid || !config.keyId || !config.appSecret || !config.webhookSecret) {
    throw new DomainError('CONFIGURATION_ERROR', 'PaycoreClient requires complete configuration');
  }
  if (
    FORBIDDEN_PLACEHOLDERS.has(config.appSecret.toLowerCase()) ||
    FORBIDDEN_PLACEHOLDERS.has(config.webhookSecret.toLowerCase()) ||
    FORBIDDEN_PLACEHOLDERS.has(config.appUuid.toLowerCase())
  ) {
    throw new DomainError('CONFIGURATION_ERROR', 'PaycoreClient cannot be instantiated with dummy default secrets');
  }

  return {
    async createOrder(input: PaycoreCreateOrderInput): Promise<PaycoreCreateOrderOutput> {
      const path = '/v1/orders';
      const timestamp = new Date().toISOString();
      const idempotencyKey = input.idempotencyKey || `idem-${input.externalOrderId}`;

      const payload = {
        external_order_id: input.externalOrderId,
        product_key: input.productKey,
        description: input.description,
        amount: Math.round(input.amount),
        currency: 'IDR' as const,
        customer: {
          name: input.customer.name,
          email: input.customer.email || undefined,
          phone: input.customer.phone,
        },
        return_url: input.returnUrl || undefined,
        fulfillment_data: input.fulfillmentData || {},
      };

      const rawBody = JSON.stringify(payload);
      const signature = buildPaycoreRequestSignature(config.appSecret, timestamp, 'POST', path, rawBody);

      const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PayCore-App': config.appUuid,
          'X-PayCore-Key-Id': config.keyId,
          'X-PayCore-Timestamp': timestamp,
          'X-PayCore-Signature': `sha256=${signature}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: rawBody,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Paycore createOrder failed (${res.status}): ${errText}`);
      }

      return (await res.json()) as PaycoreCreateOrderOutput;
    },

    async getOrder(orderId: string): Promise<PaycoreCreateOrderOutput> {
      const path = `/v1/orders/${encodeURIComponent(orderId)}`;
      const timestamp = new Date().toISOString();
      const signature = buildPaycoreRequestSignature(config.appSecret, timestamp, 'GET', path, '');

      const url = `${config.baseUrl.replace(/\/$/, '')}${path}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-PayCore-App': config.appUuid,
          'X-PayCore-Key-Id': config.keyId,
          'X-PayCore-Timestamp': timestamp,
          'X-PayCore-Signature': `sha256=${signature}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Paycore getOrder failed (${res.status}): ${errText}`);
      }

      return (await res.json()) as PaycoreCreateOrderOutput;
    },

    verifyWebhook(rawBody: string, timestampHeader?: string | null, signatureHeader?: string | null): boolean {
      return verifyPaycoreWebhookSignature(rawBody, timestampHeader, signatureHeader, config.webhookSecret);
    },
  };
}
