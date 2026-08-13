import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../app';
import { executeDbHealthProbe } from '../db/client';

describe('Milestone B0 — Platform API Health Endpoint Contract Test Suite', () => {
  it('1. GET /health returns 200 OK JSON without invoking DB probe', async () => {
    let probeCalled = false;
    const app = createApp({
      dbHealthProbe: async () => {
        probeCalled = true;
        return { serverTime: new Date().toISOString() };
      },
    });

    const res = await app.request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('cache-control'), 'no-store');

    const data = (await res.json()) as any;
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'stiffin-promotor-api');
    assert.strictEqual(typeof data.timestamp, 'string');
    assert.strictEqual(probeCalled, false, 'GET /health MUST NOT call DB probe');
  });

  it('2. GET /health/db returns 200 OK when DB probe succeeds', async () => {
    const mockServerTime = '2026-08-13T08:00:00.000Z';
    const app = createApp({
      dbHealthProbe: async () => ({ serverTime: mockServerTime }),
    });

    const res = await app.request('/health/db');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('cache-control'), 'no-store');

    const data = (await res.json()) as any;
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.db, 'connected');
    assert.strictEqual(data.service, 'stiffin-promotor-api');
    assert.strictEqual(data.serverTime, mockServerTime);
  });

  it('3. GET /health/db returns 503 Service Unavailable when DB probe fails without leaking error details', async () => {
    const app = createApp({
      dbHealthProbe: async () => {
        throw new Error('FATAL: connection to server at "10.0.0.1", port 5432 failed: password authentication failed for user "secret_role"');
      },
    });

    const res = await app.request('/health/db');
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.headers.get('cache-control'), 'no-store');

    const data = (await res.json()) as any;
    assert.strictEqual(data.status, 'error');
    assert.strictEqual(data.db, 'disconnected');
    assert.strictEqual(data.service, 'stiffin-promotor-api');

    const rawResponseText = JSON.stringify(data);
    assert.strictEqual(rawResponseText.includes('10.0.0.1'), false);
    assert.strictEqual(rawResponseText.includes('secret_role'), false);
    assert.strictEqual(rawResponseText.includes('FATAL'), false);
  });

  it('4. executeDbHealthProbe throws explicit error when env.HYPERDRIVE is missing', async () => {
    await assert.rejects(
      async () => {
        await executeDbHealthProbe({});
      },
      (err: any) => {
        assert.match(err.message, /Hyperdrive connection binding/);
        return true;
      }
    );
  });
});
