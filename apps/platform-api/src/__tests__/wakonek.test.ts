import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import {
  extractInboundText,
  verifyWakonekSignature,
  getWaStatus,
  sendWaText,
  provisionOrReuseDevice,
} from '../services/wakonek-service';
import { registerWebhookRoutes } from '../routes/webhook-routes';
import { registerFlowRoutes } from '../routes/flow-routes';
import { DomainError } from '../core/errors';
import type { AppEnv } from '../app';
import type { Env } from '../env';

describe('Wakonek Service — extractInboundText', () => {
  it('extracts direct conversation text', () => {
    const payload = { conversation: 'Halo admin, mau tanya kelas ini' };
    const res = extractInboundText(payload);
    assert.strictEqual(res.text, 'Halo admin, mau tanya kelas ini');
    assert.strictEqual(res.type, 'text');
  });

  it('extracts extendedTextMessage text', () => {
    const payload = {
      extendedTextMessage: {
        text: 'Ini respon dari promotor flow',
      },
    };
    const res = extractInboundText(payload);
    assert.strictEqual(res.text, 'Ini respon dari promotor flow');
    assert.strictEqual(res.type, 'text');
  });

  it('unwraps ephemeralMessage', () => {
    const payload = {
      ephemeralMessage: {
        message: {
          conversation: 'Pesan ephemeral sementara',
        },
      },
    };
    const res = extractInboundText(payload);
    assert.strictEqual(res.text, 'Pesan ephemeral sementara');
    assert.strictEqual(res.type, 'text');
  });

  it('unwraps nested viewOnceMessage and viewOnceMessageV2', () => {
    const payload1 = {
      viewOnceMessage: {
        message: {
          extendedTextMessage: {
            text: 'Pesan view once rahasia',
          },
        },
      },
    };
    const res1 = extractInboundText(payload1);
    assert.strictEqual(res1.text, 'Pesan view once rahasia');
    assert.strictEqual(res1.type, 'text');

    const payload2 = {
      viewOnceMessageV2: {
        message: {
          conversation: 'Pesan view once V2',
        },
      },
    };
    const res2 = extractInboundText(payload2);
    assert.strictEqual(res2.text, 'Pesan view once V2');
    assert.strictEqual(res2.type, 'text');
  });

  it('unwraps multiple layers: ephemeralMessage inside viewOnceMessage', () => {
    const payload = {
      ephemeralMessage: {
        message: {
          viewOnceMessage: {
            message: {
              conversation: 'Nested deeply',
            },
          },
        },
      },
    };
    const res = extractInboundText(payload);
    assert.strictEqual(res.text, 'Nested deeply');
    assert.strictEqual(res.type, 'text');
  });

  it('extracts image caption or defaults type to image', () => {
    const withCaption = {
      imageMessage: {
        caption: 'Bukti pembayaran',
      },
    };
    const res1 = extractInboundText(withCaption);
    assert.strictEqual(res1.text, 'Bukti pembayaran');
    assert.strictEqual(res1.type, 'image');

    const withoutCaption = {
      imageMessage: {},
    };
    const res2 = extractInboundText(withoutCaption);
    assert.strictEqual(res2.text, '');
    assert.strictEqual(res2.type, 'image');
  });

  it('extracts document caption', () => {
    const payload = {
      documentMessage: {
        caption: 'Lampiran PDF modul',
      },
    };
    const res = extractInboundText(payload);
    assert.strictEqual(res.text, 'Lampiran PDF modul');
    assert.strictEqual(res.type, 'document');
  });

  it('handles location, audio, video, sticker message placeholders', () => {
    assert.deepStrictEqual(extractInboundText({ locationMessage: {} }), {
      text: '[Lokasi]',
      type: 'location',
    });
    assert.deepStrictEqual(extractInboundText({ audioMessage: {} }), {
      text: '[Pesan suara]',
      type: 'audio',
    });
    assert.deepStrictEqual(extractInboundText({ videoMessage: { caption: 'Video seru' } }), {
      text: 'Video seru',
      type: 'video',
    });
    assert.deepStrictEqual(extractInboundText({ videoMessage: {} }), {
      text: '[Video]',
      type: 'video',
    });
    assert.deepStrictEqual(extractInboundText({ stickerMessage: {} }), {
      text: '[Stiker]',
      type: 'sticker',
    });
  });

  it('returns unknown for unrecognized or empty payloads', () => {
    assert.deepStrictEqual(extractInboundText(null), { text: '', type: 'unknown' });
    assert.deepStrictEqual(extractInboundText(undefined), { text: '', type: 'unknown' });
    assert.deepStrictEqual(extractInboundText({}), { text: '', type: 'unknown' });
    assert.deepStrictEqual(extractInboundText({ unknownPayload: 123 }), { text: '', type: 'unknown' });
  });
});

describe('Wakonek Service — HMAC Signature Verification', () => {
  const secret = 'whsec_test_secret_key_12345';
  const body = JSON.stringify({
    event: 'message.received',
    message: { id: 'msg-001', chatJid: '628123456789@s.whatsapp.net' },
  });

  it('accepts valid HMAC signature within 5 minutes', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', secret)
      .update(`${nowSec}.${body}`)
      .digest('hex');
    const header = `t=${nowSec}, v1=${signature}`;

    const isValid = verifyWakonekSignature(body, header, secret);
    assert.strictEqual(isValid, true);
  });

  it('rejects header with invalid signature', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const invalidSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    const header = `t=${nowSec}, v1=${invalidSignature}`;

    const isValid = verifyWakonekSignature(body, header, secret);
    assert.strictEqual(isValid, false);
  });

  it('rejects expired timestamp (> 300 seconds ago)', () => {
    const pastSec = Math.floor(Date.now() / 1000) - 301;
    const signature = createHmac('sha256', secret)
      .update(`${pastSec}.${body}`)
      .digest('hex');
    const header = `t=${pastSec}, v1=${signature}`;

    const isValid = verifyWakonekSignature(body, header, secret);
    assert.strictEqual(isValid, false);
  });

  it('rejects future timestamp (> 300 seconds ahead)', () => {
    const futureSec = Math.floor(Date.now() / 1000) + 301;
    const signature = createHmac('sha256', secret)
      .update(`${futureSec}.${body}`)
      .digest('hex');
    const header = `t=${futureSec}, v1=${signature}`;

    const isValid = verifyWakonekSignature(body, header, secret);
    assert.strictEqual(isValid, false);
  });

  it('rejects tampered body', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', secret)
      .update(`${nowSec}.${body}`)
      .digest('hex');
    const header = `t=${nowSec}, v1=${signature}`;
    const tamperedBody = body + ' ';

    const isValid = verifyWakonekSignature(tamperedBody, header, secret);
    assert.strictEqual(isValid, false);
  });

  it('rejects missing or malformed header or secret', () => {
    assert.strictEqual(verifyWakonekSignature(body, '', secret), false);
    assert.strictEqual(verifyWakonekSignature(body, null, secret), false);
    assert.strictEqual(verifyWakonekSignature(body, 't=123', secret), false);
    assert.strictEqual(verifyWakonekSignature(body, 'v1=abc', secret), false);
    assert.strictEqual(verifyWakonekSignature(body, 't=123, v1=abc', ''), false);
    assert.strictEqual(verifyWakonekSignature(body, 't=123, v1=abc', null), false);
  });
});

describe('Wakonek Service — Stage Mapping & getWaStatus', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const validEnv: Env = {
    WAKONEK_GATEWAY_URL: 'https://wakonek.test',
    WAKONEK_API_KEY: 'test-api-key',
  };

  it('returns unconfigured when env vars are missing', async () => {
    const mockDb: any = {};
    const res = await getWaStatus(mockDb, {}, 'org-1');
    assert.deepStrictEqual(res, { stage: 'unconfigured', phone: null, deviceId: null });

    const res2 = await getWaStatus(mockDb, { WAKONEK_GATEWAY_URL: 'https://test' }, 'org-1');
    assert.deepStrictEqual(res2, { stage: 'unconfigured', phone: null, deviceId: null });
  });

  it('returns not_connected when no device row exists in db', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    };

    const res = await getWaStatus(mockDb, validEnv, 'org-no-device');
    assert.deepStrictEqual(res, { stage: 'not_connected', phone: null, deviceId: null });
  });

  it('maps connected status from gateway', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
                phoneE164: '+628111111111',
                status: 'connected',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async (url: any) => {
      assert.strictEqual(url, 'https://wakonek.test/v1/devices/me');
      return new Response(
        JSON.stringify({
          deviceId: 'dev-1',
          status: 'connected',
          phone: '+628111111111',
        }),
        { status: 200 }
      );
    }) as any;

    const res = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(res.stage, 'connected');
    assert.strictEqual(res.phone, '+628111111111');
    assert.strictEqual(res.deviceId, 'dev-1');
  });

  it('maps qr and connecting status to connecting', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
                phoneE164: null,
                status: 'needs_pairing',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ deviceId: 'dev-1', status: 'qr', phone: null }), {
        status: 200,
      });
    }) as any;

    const resQr = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(resQr.stage, 'connecting');

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ deviceId: 'dev-1', status: 'connecting', phone: null }),
        { status: 200 }
      );
    }) as any;

    const resConn = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(resConn.stage, 'connecting');
  });

  it('maps disconnected status based on presence of phone', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
                phoneE164: null,
                status: 'needs_pairing',
              },
            ],
          }),
        }),
      }),
    };

    // Disconnected with phone -> disconnected (gateway will auto-reconnect)
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ deviceId: 'dev-1', status: 'disconnected', phone: '+628123456789' }),
        { status: 200 }
      );
    }) as any;

    const resWithPhone = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(resWithPhone.stage, 'disconnected');

    // Disconnected without phone -> needs_pairing
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ deviceId: 'dev-1', status: 'disconnected', phone: null }),
        { status: 200 }
      );
    }) as any;

    const resWithoutPhone = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(resWithoutPhone.stage, 'needs_pairing');
  });

  it('maps logged_out status to needs_pairing', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
                phoneE164: null,
                status: 'needs_pairing',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ deviceId: 'dev-1', status: 'logged_out', phone: null }),
        { status: 200 }
      );
    }) as any;

    const res = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(res.stage, 'needs_pairing');
  });

  it('maps 403/404 from gateway to needs_pairing', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
                phoneE164: null,
                status: 'needs_pairing',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async () => new Response('Forbidden', { status: 403 })) as any;
    const res403 = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(res403.stage, 'needs_pairing');

    globalThis.fetch = (async () => new Response('Not Found', { status: 404 })) as any;
    const res404 = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(res404.stage, 'needs_pairing');
  });

  it('maps network fetch throw to error', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
                phoneE164: null,
                status: 'needs_pairing',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async () => {
      throw new Error('Network error: ECONNREFUSED');
    }) as any;

    const res = await getWaStatus(mockDb, validEnv, 'org-1');
    assert.strictEqual(res.stage, 'error');
  });
});

describe('Wakonek Service — provisionOrReuseDevice', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const validEnv: Env = {
    WAKONEK_GATEWAY_URL: 'https://wakonek.test',
    WAKONEK_API_KEY: 'test-api-key',
  };

  it('reuses existing device without calling gateway POST /v1/devices', async () => {
    let gatewayFetchCalled = false;
    globalThis.fetch = (async () => {
      gatewayFetchCalled = true;
      return new Response('{}', { status: 200 });
    }) as any;

    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-existing',
                organizationId: 'org-existing',
                deviceId: 'dev-existing',
                deviceToken: 'tok-existing',
              },
            ],
          }),
        }),
      }),
    };

    const res = await provisionOrReuseDevice(mockDb, validEnv, 'org-existing');
    assert.strictEqual(res.deviceId, 'dev-existing');
    assert.strictEqual(res.deviceToken, 'tok-existing');
    assert.strictEqual(gatewayFetchCalled, false, 'Must NOT call gateway when row exists');
  });

  it('calls gateway POST /v1/devices ONLY when no row exists and stores device', async () => {
    let insertedValues: any = null;
    let gatewayBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      assert.strictEqual(url, 'https://wakonek.test/v1/devices');
      assert.strictEqual(init.method, 'POST');
      gatewayBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          deviceId: 'dev-new-123',
          deviceToken: 'wk_dev_newtoken123',
          pairingToken: 'wk_pair_pairingtoken123',
        }),
        { status: 201 }
      );
    }) as any;

    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: async (vals: any) => {
          insertedValues = vals;
          return [vals];
        },
      }),
    };

    const res = await provisionOrReuseDevice(mockDb, validEnv, 'org-new-123');
    assert.strictEqual(res.deviceId, 'dev-new-123');
    assert.strictEqual(res.deviceToken, 'wk_dev_newtoken123');
    assert.strictEqual(res.pairingToken, 'wk_pair_pairingtoken123');
    assert.strictEqual(gatewayBody.externalUserId, 'org-new-123');
    assert.strictEqual(insertedValues.deviceId, 'dev-new-123');
    assert.strictEqual(insertedValues.deviceToken, 'wk_dev_newtoken123');
    assert.strictEqual(insertedValues.status, 'needs_pairing');
  });
});

describe('Wakonek Service — sendWaText', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const validEnv: Env = {
    WAKONEK_GATEWAY_URL: 'https://wakonek.test',
    WAKONEK_API_KEY: 'test-api-key',
  };

  it('throws UNCONFIGURED when env is missing', async () => {
    const mockDb: any = {};
    await assert.rejects(
      async () => sendWaText(mockDb, {}, 'org-1', { target: '+628123456789', text: 'Halo' }),
      (err: any) => err.code === 'UNCONFIGURED'
    );
  });

  it('throws NOT_CONNECTED when no device row exists', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
    };

    await assert.rejects(
      async () =>
        sendWaText(mockDb, validEnv, 'org-no-device', {
          target: '+628123456789',
          text: 'Halo',
        }),
      (err: any) => err.code === 'NOT_CONNECTED'
    );
  });

  it('maps gateway 400 "Device is not connected" to NOT_CONNECTED error', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: 'Device is not connected' }), { status: 400 });
    }) as any;

    await assert.rejects(
      async () =>
        sendWaText(mockDb, validEnv, 'org-1', {
          target: '+628123456789',
          text: 'Halo',
        }),
      (err: any) => err.code === 'NOT_CONNECTED'
    );
  });

  it('returns status failed when gateway returns 500 failed', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          messageId: 'msg-failed-123',
          status: 'failed',
          error: 'Socket disconnected mid-send',
        }),
        { status: 500 }
      );
    }) as any;

    const res = await sendWaText(mockDb, validEnv, 'org-1', {
      target: '+628123456789',
      text: 'Halo',
    });
    assert.strictEqual(res.messageId, 'msg-failed-123');
    assert.strictEqual(res.status, 'failed');
  });

  it('returns messageId and status sent on successful gateway response', async () => {
    const mockDb: any = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'row-1',
                organizationId: 'org-1',
                deviceId: 'dev-1',
                deviceToken: 'tok-1',
              },
            ],
          }),
        }),
      }),
    };

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          messageId: 'msg-success-789',
          status: 'sent',
        }),
        { status: 200 }
      );
    }) as any;

    const res = await sendWaText(mockDb, validEnv, 'org-1', {
      target: '+628123456789',
      text: 'Halo selamat datang!',
    });
    assert.strictEqual(res.messageId, 'msg-success-789');
    assert.strictEqual(res.status, 'sent');
  });
});

describe('Wakonek Webhook & Inbox Deduplication Logic', () => {
  it('deduplicates inbound messages by waMessageId', async () => {
    const inboxStore = new Map<string, any>();

    const insertInbox = async (entry: any) => {
      if (inboxStore.has(entry.waMessageId)) {
        return { inserted: false };
      }
      inboxStore.set(entry.waMessageId, entry);
      return { inserted: true };
    };

    // First arrival
    const msg1 = {
      waMessageId: 'wk_msg_duplicate_1',
      organizationId: 'org-1',
      chatJid: '628123456789@s.whatsapp.net',
      phoneE164: '+628123456789',
      text: 'Halo pertama',
      type: 'text',
    };
    const res1 = await insertInbox(msg1);
    assert.strictEqual(res1.inserted, true);
    assert.strictEqual(inboxStore.size, 1);

    // Second arrival (retry from dispatcher)
    const msg2 = {
      waMessageId: 'wk_msg_duplicate_1',
      organizationId: 'org-1',
      chatJid: '628123456789@s.whatsapp.net',
      phoneE164: '+628123456789',
      text: 'Halo pertama (retry)',
      type: 'text',
    };
    const res2 = await insertInbox(msg2);
    assert.strictEqual(res2.inserted, false, 'Duplicate waMessageId must not insert duplicate row');
    assert.strictEqual(inboxStore.size, 1);
  });
});

describe('Wakonek Routes — Webhooks & Flow Integration', () => {
  const secret = 'whsec_test_secret_integration_123';
  const orgId = '00000000-0000-0000-0000-000000000001';
  const contactId = '00000000-0000-0000-0000-000000000002';
  const nextActionId = '00000000-0000-0000-0000-000000000003';

  function createTestApp(envOverrides: Partial<Env> = {}) {
    const app = new Hono<AppEnv>();

    app.use('*', async (c, next) => {
      (c.env as any) = {
        WAKONEK_GATEWAY_URL: 'https://wakonek.test',
        WAKONEK_API_KEY: 'wk_app_testkey',
        WAKONEK_WEBHOOK_SECRET: secret,
        ...envOverrides,
      };

      c.set('authContext', {
        organization: { organizationId: orgId },
        actor: { userId: 'usr-1', membershipId: 'mem-1', role: 'admin' },
        user: { id: 'usr-1' },
      } as any);

      // Mock DB
      const createChain = (result: any = []) => {
        const chain: any = {
          from: () => chain,
          leftJoin: () => chain,
          where: () => chain,
          orderBy: () => chain,
          limit: () => Promise.resolve(result),
          values: () => ({
            onConflictDoNothing: () => Promise.resolve([]),
            returning: () => Promise.resolve(result),
          }),
          set: () => ({
            where: () => Promise.resolve([]),
          }),
          then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
        };
        return chain;
      };

      c.set('db', {
        select: (fields?: any) => {
          // If selecting from whatsapp_devices
          return {
            from: (table: any) => ({
              leftJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: () =>
                      Promise.resolve([
                        {
                          id: 'msg-1',
                          contactId,
                          contactName: 'Budi Test',
                          phoneE164: '+628123456789',
                          type: 'text',
                          text: 'Halo admin',
                          receivedAt: '2026-10-03T10:00:00.000Z',
                          isRead: false,
                        },
                      ]),
                  }),
                }),
              }),
              where: () => ({
                limit: () =>
                  Promise.resolve([
                    {
                      id: 'row-1',
                      organizationId: orgId,
                      deviceId: 'dev-1',
                      deviceToken: 'tok-1',
                      phoneE164: '+628123456789',
                      name: 'Budi Test',
                    },
                  ]),
              }),
            }),
          };
        },
        insert: () => ({
          values: () => ({
            onConflictDoNothing: () => Promise.resolve([]),
            returning: () => Promise.resolve([{ id: 'new-row' }]),
          }),
        }),
        update: () => ({
          set: () => ({
            where: () => Promise.resolve([]),
          }),
        }),
      } as any);

      await next();
    });

    app.onError((err, c) => {
      if (err instanceof DomainError) {
        const status =
          err.code === 'UNAUTHORIZED'
            ? 401
            : err.code === 'FORBIDDEN'
              ? 403
              : err.code === 'NOT_FOUND'
                ? 404
                : 400;
        return c.json({ error: { code: err.code, message: err.message } }, status as any);
      }
      return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
    });

    registerWebhookRoutes(app);
    registerFlowRoutes(app);

    return app;
  }

  it('POST /api/v1/webhooks/wakonek rejects request with invalid signature', async () => {
    const app = createTestApp();
    const res = await app.request('/api/v1/webhooks/wakonek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wakonek-signature': 't=123, v1=badsignature',
      },
      body: JSON.stringify({ event: 'ping' }),
    });

    assert.strictEqual(res.status, 401);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'invalid signature');
  });

  it('POST /api/v1/webhooks/wakonek succeeds with valid HMAC and processes inbound message', async () => {
    const app = createTestApp();
    const payload = JSON.stringify({
      event: 'message.received',
      deviceId: 'dev-1',
      appId: 'app-1',
      externalUserId: orgId,
      timestamp: Date.now(),
      message: {
        id: 'msg-inbound-999',
        waMessageId: 'wamid.123',
        chatJid: '628123456789@s.whatsapp.net',
        type: 'text',
        payload: {
          conversation: 'Halo dari WhatsApp!',
        },
        createdAt: '2026-10-03T00:00:00.000Z',
      },
    });

    const nowSec = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256', secret)
      .update(`${nowSec}.${payload}`)
      .digest('hex');

    const res = await app.request('/api/v1/webhooks/wakonek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wakonek-signature': `t=${nowSec}, v1=${sig}`,
      },
      body: payload,
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.ok, true);
  });

  it('GET /api/v1/flow/messaging/wa/inbox returns mapped inbox list', async () => {
    const app = createTestApp();
    const res = await app.request('/api/v1/flow/messaging/wa/inbox');
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(Array.isArray(body.messages));
    assert.strictEqual(body.messages.length, 1);
    assert.strictEqual(body.messages[0].text, 'Halo admin');
    assert.strictEqual(body.messages[0].contactName, 'Budi Test');
  });

  it('POST /api/v1/flow/messaging/wa/inbox/read marks all inbox read', async () => {
    const app = createTestApp();
    const res = await app.request('/api/v1/flow/messaging/wa/inbox/read', {
      method: 'POST',
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.ok, true);
  });

  it('Flow routes handle unconfigured gateway gracefully', async () => {
    const unconfiguredApp = createTestApp({
      WAKONEK_GATEWAY_URL: undefined,
      WAKONEK_API_KEY: undefined,
    });

    // pairing/start returns 200 with stage: unconfigured
    const startRes = await unconfiguredApp.request('/api/v1/flow/messaging/wa/pairing/start', {
      method: 'POST',
    });
    assert.strictEqual(startRes.status, 200);
    const startBody = (await startRes.json()) as any;
    assert.strictEqual(startBody.stage, 'unconfigured');

    // status returns 200 with stage: unconfigured
    const statusRes = await unconfiguredApp.request('/api/v1/flow/messaging/wa/status');
    assert.strictEqual(statusRes.status, 200);
    const statusBody = (await statusRes.json()) as any;
    assert.strictEqual(statusBody.stage, 'unconfigured');

    // send returns 503 with code: UNCONFIGURED
    const sendRes = await unconfiguredApp.request('/api/v1/flow/messaging/wa/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId,
        text: 'Halo',
      }),
    });
    assert.strictEqual(sendRes.status, 503);
    const sendBody = (await sendRes.json()) as any;
    assert.strictEqual(sendBody.code, 'UNCONFIGURED');
  });
});
