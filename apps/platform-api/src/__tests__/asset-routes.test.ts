import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Hono } from 'hono';
import { registerAssetRoutes, localAssetStore } from '../routes/asset-routes';
import { DomainError } from '../core/errors';
import type { AppEnv } from '../app';

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.onError((err, c) => {
    if (err instanceof DomainError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : 400;
      return c.json({ error: { code: err.code, message: err.message } }, status as any);
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
  });
  return app;
}

describe('R2 Asset Storage & Upload Routes', () => {
  it('GET /api/assets/not-found returns 404', async () => {
    const app = createTestApp();
    registerAssetRoutes(app);

    const res = await app.request('/api/assets/nonexistent/file.png');
    assert.strictEqual(res.status, 404);
    const body = (await res.json()) as any;
    assert.strictEqual(body.error.code, 'NOT_FOUND');
  });

  it('GET /api/assets/:key serves item from local fallback store', async () => {
    const app = createTestApp();
    registerAssetRoutes(app);

    const testKey = 'storefront/test-org/avatar.webp';
    const testData = new Uint8Array([1, 2, 3, 4]);
    localAssetStore.set(testKey, { buffer: testData, contentType: 'image/webp' });

    const res = await app.request(`/api/assets/${testKey}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/webp');
    const bytes = new Uint8Array(await res.arrayBuffer());
    assert.deepStrictEqual(bytes, testData);
  });

  it('POST /api/assets/upload rejects without organization session', async () => {
    const app = createTestApp();
    // Mock middleware setting authContext = null
    app.use('/api/*', async (c, next) => {
      c.set('authContext', null);
      await next();
    });
    registerAssetRoutes(app);

    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'image/png' }), 'test.png');

    const res = await app.request('/api/assets/upload', {
      method: 'POST',
      body: formData,
    });
    // Should fail with 401 UNAUTHORIZED
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/assets/upload accepts valid image and stores with R2 bucket mock', async () => {
    const app = createTestApp();
    // Mock authenticated organization context
    app.use('/api/*', async (c, next) => {
      c.set('authContext', {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        organization: { organizationId: 'org-123', slug: 'test-org', name: 'Test Org' },
        actor: { userId: 'user-1', membershipId: 'mem-1', role: 'owner' },
        entitlements: { promotorClass: true, promotorFlow: true },
      } as any);
      await next();
    });

    const mockStored = new Map<string, { body: Uint8Array; contentType: string }>();
    const mockR2Bucket = {
      put: async (key: string, body: Uint8Array, options?: any) => {
        mockStored.set(key, { body, contentType: options?.httpMetadata?.contentType });
        return { key };
      },
      get: async (key: string) => {
        const item = mockStored.get(key);
        if (!item) return null;
        return {
          body: item.body,
          httpMetadata: { contentType: item.contentType },
          httpEtag: 'test-etag',
        };
      },
    };

    registerAssetRoutes(app);

    const formData = new FormData();
    const testBytes = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
    formData.append('file', new Blob([testBytes], { type: 'image/png' }), 'avatar.png');

    const res = await app.fetch(
      new Request('https://test-api.example.com/api/assets/upload', {
        method: 'POST',
        body: formData,
      }),
      {
        ASSETS_BUCKET: mockR2Bucket as any,
        BETTER_AUTH_URL: 'https://test-api.example.com',
      } as any
    );

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.ok(body.url.startsWith('https://test-api.example.com/api/assets/storefront/org-123/'));
    assert.ok(body.key.startsWith('storefront/org-123/'));
    assert.strictEqual(body.contentType, 'image/png');

    // Verify it was stored in mock R2 bucket
    assert.strictEqual(mockStored.has(body.key), true);

    // Verify retrieval via GET
    const getRes = await app.fetch(
      new Request(`https://test-api.example.com/api/assets/${body.key}`),
      {
        ASSETS_BUCKET: mockR2Bucket as any,
      } as any
    );
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.headers.get('content-type'), 'image/png');
  });
});
