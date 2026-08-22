import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { registerClassRoutes } from '../routes/class-routes';
import { registerFlowRoutes } from '../routes/flow-routes';

describe('P1-4 — Truthful Integration Health Invariants', () => {
  it('1. GET /api/v1/class/integration/health returns UNAVAILABLE when promotorFlow entitlement is missing or false', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ promotorFlow: false, promotorClass: true }]),
          }),
        }),
      }),
    };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb as any);
      c.set('authContext', {
        organization: { organizationId: '00000000-0000-0000-0000-000000000001' },
        actor: { userId: 'usr-1', membershipId: 'mem-1', role: 'OWNER' },
        user: { id: 'usr-1' },
      } as any);
      await next();
    });

    registerClassRoutes(app);
    registerFlowRoutes(app);

    const res = await app.request('/api/v1/class/integration/health', {
      method: 'GET',
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.promotorFlow, 'UNAVAILABLE');
  });

  it('2. GET /api/v1/class/integration/health returns AVAILABLE when entitled and outbox is healthy', async () => {
    let callCount = 0;
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => {
            callCount++;
            if (callCount === 1) {
              return {
                limit: () => Promise.resolve([{ promotorFlow: true, promotorClass: true }]),
              };
            }
            return Promise.resolve([{ count: 0 }]);
          },
        }),
      }),
    };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb as any);
      c.set('authContext', {
        organization: { organizationId: '00000000-0000-0000-0000-000000000001' },
        actor: { userId: 'usr-1', membershipId: 'mem-1', role: 'OWNER' },
        user: { id: 'usr-1' },
      } as any);
      await next();
    });

    registerClassRoutes(app);
    registerFlowRoutes(app);

    const res = await app.request('/api/v1/class/integration/health', {
      method: 'GET',
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.promotorFlow, 'AVAILABLE');
  });

  it('3. GET /api/v1/class/integration/health returns UNAVAILABLE when entitled but outbox is degraded with 5+ failures', async () => {
    let callCount = 0;
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => {
            callCount++;
            if (callCount === 1) {
              return {
                limit: () => Promise.resolve([{ promotorFlow: true, promotorClass: true }]),
              };
            }
            return Promise.resolve([{ count: 6 }]);
          },
        }),
      }),
    };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb as any);
      c.set('authContext', {
        organization: { organizationId: '00000000-0000-0000-0000-000000000001' },
        actor: { userId: 'usr-1', membershipId: 'mem-1', role: 'OWNER' },
        user: { id: 'usr-1' },
      } as any);
      await next();
    });

    registerClassRoutes(app);
    registerFlowRoutes(app);

    const res = await app.request('/api/v1/class/integration/health', {
      method: 'GET',
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.promotorFlow, 'UNAVAILABLE');
  });

  it('4. GET /api/v1/flow/integration/health returns promotorClass UNAVAILABLE when Class entitlement is absent', async () => {
    const mockDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ promotorFlow: true, promotorClass: false }]),
          }),
        }),
      }),
    };

    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('db', mockDb as any);
      c.set('authContext', {
        organization: { organizationId: '00000000-0000-0000-0000-000000000001' },
        actor: { userId: 'usr-1', membershipId: 'mem-1', role: 'OWNER' },
        user: { id: 'usr-1' },
      } as any);
      await next();
    });

    registerClassRoutes(app);
    registerFlowRoutes(app);

    const res = await app.request('/api/v1/flow/integration/health', {
      method: 'GET',
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.promotorFlow, 'AVAILABLE');
    assert.strictEqual(body.promotorClass, 'UNAVAILABLE');
  });
});
