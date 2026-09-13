import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';

// In-memory store fallback for local development & unit tests when R2 is not bound
export const localAssetStore = new Map<string, { buffer: Uint8Array; contentType: string }>();

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function registerAssetRoutes(app: Hono<AppEnv>) {
  /**
   * POST /api/assets/upload
   * Upload an image asset to Cloudflare R2 bucket.
   * Requires promotor organization session.
   */
  app.post('/api/assets/upload', async (c) => {
    c.header('Cache-Control', 'no-store');

    const authCtx = c.get('authContext');
    const isDev = c.env?.APP_ENV === 'development';
    const orgId = authCtx?.organization?.organizationId || (isDev ? 'dev-demo-org' : null);
    if (!orgId) {
      throw new DomainError('UNAUTHORIZED', 'Autentikasi organisasi dibutuhkan');
    }

    const contentType = c.req.header('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new DomainError('VALIDATION_ERROR', 'Content-Type must be multipart/form-data');
    }

    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      throw new DomainError('VALIDATION_ERROR', 'File is required and must be a valid file upload');
    }

    const fileMime = (file.type || '').toLowerCase();
    const ext = ALLOWED_MIME_TYPES[fileMime];
    if (!ext) {
      throw new DomainError(
        'VALIDATION_ERROR',
        `Tipe file tidak didukung (${fileMime}). Format yang didukung: JPG, PNG, WEBP, GIF, SVG.`
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new DomainError('VALIDATION_ERROR', 'Ukuran file maksimal 5 MB');
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const randomHex = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const key = `storefront/${orgId}/${Date.now()}-${randomHex}.${ext}`;

    // Upload to Cloudflare R2 bucket
    if (c.env?.ASSETS_BUCKET) {
      await c.env.ASSETS_BUCKET.put(key, uint8Array, {
        httpMetadata: {
          contentType: fileMime,
        },
      });
    } else {
      // Local dev / test fallback
      localAssetStore.set(key, { buffer: uint8Array, contentType: fileMime });
    }

    const origin =
      c.env?.BETTER_AUTH_URL ||
      (() => {
        try {
          return new URL(c.req.url).origin;
        } catch {
          return 'https://stiffin-promotor-api.moxsenna.workers.dev';
        }
      })();

    const cleanOrigin = origin.replace(/\/$/, '');
    const publicUrl = `${cleanOrigin}/api/assets/${key}`;

    return c.json(
      {
        success: true,
        url: publicUrl,
        key,
        size: file.size,
        contentType: fileMime,
      },
      201
    );
  });

  /**
   * GET /api/assets/:key{.+}
   * Public asset retrieval from Cloudflare R2 bucket.
   */
  app.get('/api/assets/:key{.+}', async (c) => {
    const rawKey = c.req.param('key');
    const key = rawKey.replace(/^\/+/, '');

    // 1. Try R2 Bucket
    if (c.env?.ASSETS_BUCKET) {
      const obj = await c.env.ASSETS_BUCKET.get(key);
      if (obj) {
        const mimeType = obj.httpMetadata?.contentType || 'application/octet-stream';
        c.header('Content-Type', mimeType);
        c.header('Cache-Control', 'public, max-age=31536000, immutable');
        if (obj.httpEtag) {
          c.header('ETag', obj.httpEtag);
        }
        return c.body(obj.body as any);
      }
    }

    // 2. Try local fallback store
    const local = localAssetStore.get(key);
    if (local) {
      c.header('Content-Type', local.contentType);
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
      return c.body(local.buffer as any);
    }

    return c.json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } }, 404);
  });
}
