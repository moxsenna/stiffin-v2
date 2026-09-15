import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Hono } from 'hono';
import { registerAdminRoutes } from '../routes/admin-routes';
import { DomainError } from '../core/errors';
import type { AppEnv } from '../app';

const TEST_ADMIN_KEY = 'secret-test-admin-key-12345';

function createMockAdminApp() {
  const app = new Hono<AppEnv>();

  // Mock env & variables
  app.use('*', async (c, next) => {
    (c.env as any) = {
      ADMIN_API_KEY: TEST_ADMIN_KEY,
      APP_ENV: 'test',
    };

    const createQueryMock = () => {
      const q: any = {
        from: () => q,
        innerJoin: () => q,
        leftJoin: () => q,
        where: () => q,
        groupBy: () => q,
        orderBy: () => q,
        limit: () => q,
        then: (resolve: any, reject: any) => Promise.resolve([]).then(resolve, reject),
      };
      return q;
    };

    c.set('db', {
      select: () => createQueryMock(),
      execute: async () => [],
      insert: () => ({ values: () => ({ returning: async () => [{ id: 'mock-id' }], catch: () => null }) }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
    } as any);
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof DomainError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'FORBIDDEN' ? 403 : 400;
      return c.json({ error: { code: err.code, message: err.message } }, status as any);
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  });

  registerAdminRoutes(app);
  return app;
}

describe('Admin API Routes & Auth Guardrails', () => {
  it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
    const app = createMockAdminApp();
    const res = await app.request('/api/v1/admin/dashboard/overview');
    assert.strictEqual(res.status, 401);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  it('rejects wrong admin key with 401', async () => {
    const app = createMockAdminApp();
    const res = await app.request('/api/v1/admin/dashboard/overview', {
      headers: { 'x-admin-key': 'wrong-key' },
    });
    assert.strictEqual(res.status, 401);
  });

  it('allows access with valid x-admin-key header', async () => {
    const app = createMockAdminApp();
    const res = await app.request('/api/v1/admin/dashboard/overview', {
      headers: { 'x-admin-key': TEST_ADMIN_KEY },
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(body.metrics);
  });

  it('POST /api/v1/admin/auth/login succeeds with valid adminKey and sets cookie', async () => {
    const app = createMockAdminApp();
    const res = await app.request('/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: TEST_ADMIN_KEY }),
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.admin.role, 'superadmin');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie?.includes('ralivo_admin_session='));
  });

  it('POST /api/v1/admin/auth/login fails with invalid adminKey', async () => {
    const app = createMockAdminApp();
    const res = await app.request('/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey: 'invalid-password' }),
    });
    assert.strictEqual(res.status, 401);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  it('GET /api/v1/admin/engine/health returns operational metrics', async () => {
    const app = createMockAdminApp();
    const res = await app.request('/api/v1/admin/engine/health', {
      headers: { 'x-admin-key': TEST_ADMIN_KEY },
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.ok(body.health);
    assert.strictEqual(body.health.environment, 'test');
  });
});
