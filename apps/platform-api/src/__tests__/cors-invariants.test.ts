import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../app';

describe('P0-3 — CORS Must Fail Closed Invariants', () => {
  const TEST_ENV = {
    BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
    BETTER_AUTH_URL: 'http://localhost:8787',
    BETTER_AUTH_TRUSTED_ORIGINS: 'https://custom-trusted-domain.com, http://localhost:3000',
  };

  const app = createApp({
    dbHealthProbe: async () => ({ serverTime: new Date().toISOString() }),
  });

  const checkCorsOrigin = async (origin: string | undefined): Promise<string | null> => {
    const headers: Record<string, string> = {};
    if (origin !== undefined) {
      headers['Origin'] = origin;
    }
    const res = await app.request('/api/auth/ok', { method: 'OPTIONS', headers }, TEST_ENV as any);
    return res.headers.get('access-control-allow-origin');
  };

  it('1. Class production origin ALLOW', async () => {
    const allowOrigin = await checkCorsOrigin('https://stiffin-promotor-class.moxsenna.workers.dev');
    assert.strictEqual(allowOrigin, 'https://stiffin-promotor-class.moxsenna.workers.dev');
  });

  it('2. Flow production origin ALLOW', async () => {
    const allowOrigin = await checkCorsOrigin('https://stiffin-promotor-flow.moxsenna.workers.dev');
    assert.strictEqual(allowOrigin, 'https://stiffin-promotor-flow.moxsenna.workers.dev');
  });

  it('3. Class staging origin ALLOW', async () => {
    const allowOrigin = await checkCorsOrigin('https://promotor-class-staging.moxsenna.workers.dev');
    assert.strictEqual(allowOrigin, 'https://promotor-class-staging.moxsenna.workers.dev');
  });

  it('4. Flow staging origin ALLOW', async () => {
    const allowOrigin = await checkCorsOrigin('https://promotor-flow-staging.moxsenna.workers.dev');
    assert.strictEqual(allowOrigin, 'https://promotor-flow-staging.moxsenna.workers.dev');
  });

  it('5. Approved localhost dev origins ALLOW', async () => {
    const o3000 = await checkCorsOrigin('http://localhost:3000');
    assert.strictEqual(o3000, 'http://localhost:3000');

    const o3001 = await checkCorsOrigin('http://localhost:3001');
    assert.strictEqual(o3001, 'http://localhost:3001');

    const o5173 = await checkCorsOrigin('http://localhost:5173');
    assert.strictEqual(o5173, 'http://localhost:5173');
  });

  it('6. Custom BETTER_AUTH_TRUSTED_ORIGINS ALLOW', async () => {
    const custom = await checkCorsOrigin('https://custom-trusted-domain.com');
    assert.strictEqual(custom, 'https://custom-trusted-domain.com');
  });

  it('7. https://evil.example DENY (no reflection, fails closed)', async () => {
    const allowOrigin = await checkCorsOrigin('https://evil.example');
    assert.strictEqual(allowOrigin, null, 'Must NOT reflect evil.example');
  });

  it('8. Random attacker workers.dev origin DENY', async () => {
    const allowOrigin = await checkCorsOrigin('https://attacker-app.moxsenna.workers.dev');
    assert.strictEqual(allowOrigin, null, 'Must NOT allow arbitrary workers.dev');

    const allowOrigin2 = await checkCorsOrigin('https://random.workers.dev');
    assert.strictEqual(allowOrigin2, null, 'Must NOT allow random workers.dev');
  });

  it('9. Missing / untrusted Origin handled safely', async () => {
    const allowOrigin = await checkCorsOrigin(undefined);
    assert.strictEqual(allowOrigin, null, 'Missing origin must result in null allow-origin header');
  });
});
