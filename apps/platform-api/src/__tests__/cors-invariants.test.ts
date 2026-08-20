import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../app';

describe('P1-6 — CORS Environment Separation & Fail-Closed Invariants', () => {
  const DEV_ENV = {
    NODE_ENV: 'development',
    APP_ENV: 'development',
    BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
    BETTER_AUTH_URL: 'http://localhost:8787',
    BETTER_AUTH_TRUSTED_ORIGINS: 'https://custom-trusted-domain.com',
  };

  const PROD_ENV = {
    NODE_ENV: 'production',
    APP_ENV: 'production',
    BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
    BETTER_AUTH_URL: 'https://stiffin-promotor-api.moxsenna.workers.dev',
    BETTER_AUTH_TRUSTED_ORIGINS: 'https://custom-trusted-domain.com',
  };

  const STAGING_ENV = {
    NODE_ENV: 'production',
    APP_ENV: 'staging',
    BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
    BETTER_AUTH_URL: 'https://stiffin-promotor-api-staging.moxsenna.workers.dev',
    BETTER_AUTH_TRUSTED_ORIGINS: 'https://staging-trusted.com',
  };

  const UNKNOWN_ENV = {
    BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
  };

  const app = createApp({
    dbHealthProbe: async () => ({ serverTime: new Date().toISOString() }),
  });

  const checkCorsOrigin = async (origin: string | undefined, env: any = DEV_ENV): Promise<string | null> => {
    const headers: Record<string, string> = {};
    if (origin !== undefined) {
      headers['Origin'] = origin;
    }
    const res = await app.request('/api/auth/ok', { method: 'OPTIONS', headers }, env);
    return res.headers.get('access-control-allow-origin');
  };

  it('1. Production Class origin ALLOW in production', async () => {
    const allowOrigin = await checkCorsOrigin('https://stiffin-promotor-class.moxsenna.workers.dev', PROD_ENV);
    assert.strictEqual(allowOrigin, 'https://stiffin-promotor-class.moxsenna.workers.dev');
  });

  it('2. Production Flow origin ALLOW in production', async () => {
    const allowOrigin = await checkCorsOrigin('https://stiffin-promotor-flow.moxsenna.workers.dev', PROD_ENV);
    assert.strictEqual(allowOrigin, 'https://stiffin-promotor-flow.moxsenna.workers.dev');
  });

  it('3. Localhost origins DENIED in production', async () => {
    const o3000 = await checkCorsOrigin('http://localhost:3000', PROD_ENV);
    assert.strictEqual(o3000, null, 'localhost:3000 must be DENIED in production');

    const o3001 = await checkCorsOrigin('http://localhost:3001', PROD_ENV);
    assert.strictEqual(o3001, null, 'localhost:3001 must be DENIED in production');

    const o5173 = await checkCorsOrigin('http://localhost:5173', PROD_ENV);
    assert.strictEqual(o5173, null, 'localhost:5173 must be DENIED in production');
  });

  it('4. Localhost origins ALLOWED in development', async () => {
    const o3000 = await checkCorsOrigin('http://localhost:3000', DEV_ENV);
    assert.strictEqual(o3000, 'http://localhost:3000');

    const o3001 = await checkCorsOrigin('http://localhost:3001', DEV_ENV);
    assert.strictEqual(o3001, 'http://localhost:3001');

    const o5173 = await checkCorsOrigin('http://localhost:5173', DEV_ENV);
    assert.strictEqual(o5173, 'http://localhost:5173');
  });

  it('5. Staging environment allows staging Class & Flow origins and denies localhost', async () => {
    const sClass = await checkCorsOrigin('https://promotor-class-staging.moxsenna.workers.dev', STAGING_ENV);
    assert.strictEqual(sClass, 'https://promotor-class-staging.moxsenna.workers.dev');

    const sFlow = await checkCorsOrigin('https://promotor-flow-staging.moxsenna.workers.dev', STAGING_ENV);
    assert.strictEqual(sFlow, 'https://promotor-flow-staging.moxsenna.workers.dev');

    // Localhost denied in staging
    const sLocal = await checkCorsOrigin('http://localhost:3000', STAGING_ENV);
    assert.strictEqual(sLocal, null);
  });

  it('6. Staging origin in production DENIED', async () => {
    const sClassInProd = await checkCorsOrigin('https://promotor-class-staging.moxsenna.workers.dev', PROD_ENV);
    assert.strictEqual(sClassInProd, null, 'Staging Class origin must be DENIED in production');

    const sFlowInProd = await checkCorsOrigin('https://promotor-flow-staging.moxsenna.workers.dev', PROD_ENV);
    assert.strictEqual(sFlowInProd, null, 'Staging Flow origin must be DENIED in production');
  });

  it('7. Custom configured BETTER_AUTH_TRUSTED_ORIGINS ALLOW in production (excluding localhost/staging)', async () => {
    const custom = await checkCorsOrigin('https://custom-trusted-domain.com', PROD_ENV);
    assert.strictEqual(custom, 'https://custom-trusted-domain.com');
  });

  it('8. https://evil.example DENY (no reflection, fails closed)', async () => {
    const allowOrigin = await checkCorsOrigin('https://evil.example', PROD_ENV);
    assert.strictEqual(allowOrigin, null, 'Must NOT reflect evil.example');
  });

  it('9. Random attacker workers.dev origin DENY', async () => {
    const allowOrigin = await checkCorsOrigin('https://attacker-app.moxsenna.workers.dev', PROD_ENV);
    assert.strictEqual(allowOrigin, null, 'Must NOT allow arbitrary workers.dev');

    const allowOrigin2 = await checkCorsOrigin('https://random.workers.dev', PROD_ENV);
    assert.strictEqual(allowOrigin2, null, 'Must NOT allow random workers.dev');
  });

  it('10. Scheme-relative and protocol attack DENY', async () => {
    const allowOrigin = await checkCorsOrigin('//evil.example', PROD_ENV);
    assert.strictEqual(allowOrigin, null);

    const allowOrigin2 = await checkCorsOrigin('javascript:alert(1)', PROD_ENV);
    assert.strictEqual(allowOrigin2, null);
  });

  it('11. Missing / unknown APP_ENV fails safe (strict production fallback)', async () => {
    const localhostResult = await checkCorsOrigin('http://localhost:3000', UNKNOWN_ENV);
    assert.strictEqual(localhostResult, null, 'Missing APP_ENV must FAIL CLOSED and deny localhost');

    const evilResult = await checkCorsOrigin('https://evil.example', UNKNOWN_ENV);
    assert.strictEqual(evilResult, null, 'Missing APP_ENV must deny evil origins');

    const prodClassResult = await checkCorsOrigin('https://stiffin-promotor-class.moxsenna.workers.dev', UNKNOWN_ENV);
    assert.strictEqual(prodClassResult, 'https://stiffin-promotor-class.moxsenna.workers.dev');
  });

  it('12. Missing / untrusted Origin handled safely', async () => {
    const allowOrigin = await checkCorsOrigin(undefined, PROD_ENV);
    assert.strictEqual(allowOrigin, null, 'Missing origin must result in null allow-origin header');
  });

  it('13. Static configuration test: production wrangler.jsonc does not leak localhost or staging', () => {
    const wranglerPath = path.resolve(process.cwd(), 'wrangler.jsonc');
    const content = fs.readFileSync(wranglerPath, 'utf8');
    const config = JSON.parse(content);

    assert.strictEqual(config.vars?.APP_ENV, 'production', 'Production wrangler.jsonc must have vars.APP_ENV = "production"');
    const trustedOrigins = config.vars?.BETTER_AUTH_TRUSTED_ORIGINS || '';
    assert.ok(!trustedOrigins.includes('localhost'), 'Production trusted origins must NOT include localhost');
    assert.ok(!trustedOrigins.includes('127.0.0.1'), 'Production trusted origins must NOT include 127.0.0.1');
    assert.ok(!trustedOrigins.includes('staging'), 'Production trusted origins must NOT include staging');
  });
});
