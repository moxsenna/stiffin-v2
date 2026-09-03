import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import {
  CreateManualEnrollmentRequestSchema,
  UpdateStorefrontThemeRequestSchema,
  UpdatePaymentSettingsRequestSchema,
  CreateBankAccountRequestSchema,
  UpdateBankAccountRequestSchema,
} from '@promotor/contracts';
import { createEnrollmentService } from '../services/class/enrollment-service';
import { createCommerceService } from '../services/class/commerce-service';
import { createPromotorClassAdapter } from '../services/class/promotor-class-adapter';
import { createLearningEngineService } from '../services/class/learning-engine-service';
import { createStorefrontThemeService } from '../services/class/storefront-theme-service';
import { createEntitlementRepository } from '../repositories/entitlement-repository';
import { contacts } from '../db/schema/contacts';
import { reflectionResponses } from '../db/schema/reflection-responses';
import { learningEvents } from '../db/schema/learning-events';
import { enrollments } from '../db/schema/enrollments';
import { programs } from '../db/schema/programs';
import { programPresentations } from '../db/schema/program-presentations';
import { learningSignals } from '../db/schema/learning-signals';
import { integrationOutbox } from '../db/schema/integration-outbox';
import type { OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';

function getRequestContext(c: any): {
  ctx: OrganizationContext;
  actor: AuthenticatedActor;
  db: any;
} {
  const db = c.get('db');
  const authCtx = c.get('authContext');
  if (!authCtx || !authCtx.organization || !authCtx.actor) {
    throw new DomainError('UNAUTHORIZED', 'Authentication and organization context are required');
  }
  const ctx: OrganizationContext = { organizationId: authCtx.organization.organizationId };
  const actor: AuthenticatedActor = {
    userId: authCtx.actor.userId ?? authCtx.user.id,
    membershipId: authCtx.actor.membershipId,
    role: authCtx.actor.role,
  };
  return { ctx, actor, db };
}

const MAX_COVER_BYTES_DEFAULT = 2097152;
const ALLOWED_COVER_MIME_DEFAULT = ['image/jpeg', 'image/png', 'image/webp'] as const;

function getCoverLimits(env: any) {
  const max = parseInt(env?.MAX_COVER_BYTES ?? String(MAX_COVER_BYTES_DEFAULT), 10);
  const raw = String(env?.ALLOWED_COVER_MIME ?? ALLOWED_COVER_MIME_DEFAULT.join(','));
  const allowed = raw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  return { maxBytes: Number.isFinite(max) ? max : MAX_COVER_BYTES_DEFAULT, allowed };
}

function sanitizeCoverKeyPart(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  return base || 'cover';
}

function extForMime(mime: string) {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  return 'bin';
}

function publicUrlForKey(env: any, key: string) {
  const base = String(env?.R2_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
  if (base && !base.includes('pub-promotor-class-assets.r2.dev')) return `${base}/${key}`;
  const apiUrl = String(env?.BETTER_AUTH_URL ?? 'https://stiffin-promotor-api.moxsenna.workers.dev').replace(/\/+$/, '');
  return `${apiUrl}/api/v1/assets/r2/${key}`;
}

async function createR2PresignedPutUrl(env: any, key: string, contentType: string) {
  const bucket: any = env?.CLASS_ASSETS;
  if (!bucket) throw new DomainError('INTERNAL_ERROR', 'R2 bucket CLASS_ASSETS is not configured');
  if (typeof bucket.createPresignedUrl === 'function') {
    return await bucket.createPresignedUrl({
      method: 'PUT',
      key,
      expires: 600,
      headers: { 'Content-Type': contentType },
    } as any);
  }
  // Fallback: use Worker-proxied upload URL if native presign not available
  // Frontend will PUT to this Worker URL which then streams to R2
  // We signal this by returning a Worker URL
  const baseUrl = String(env?.BETTER_AUTH_URL ?? '').replace(/\/+$/, '');
  return `${baseUrl}/api/v1/uploads/r2/${encodeURIComponent(key)}`;
}

export function registerClassRoutes(app: Hono<AppEnv>) {
  // ==========================================
  // PromotorClass Operator Endpoints
  // Gated by Better Auth + promotorClass entitlement
  // ==========================================

  // 0a. Presign cover upload for existing program (direct R2 PUT)
  app.post('/api/v1/programs/:programId/cover/presign', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const env: any = c.env as any;
    const programId = c.req.param('programId');
    const raw = await c.req.json().catch(() => ({}));
    const fileName = String(raw?.fileName ?? '').trim();
    const contentType = String(raw?.contentType ?? '').trim().toLowerCase();
    const contentLength = Number(raw?.contentLength);

    const { maxBytes, allowed } = getCoverLimits(env);
    if (!contentType || !allowed.includes(contentType)) {
      throw new DomainError('VALIDATION_ERROR', `Tipe file tidak didukung. Gunakan: ${allowed.join(', ')}`);
    }
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > maxBytes) {
      throw new DomainError('VALIDATION_ERROR', `Ukuran file melebihi batas 2MB (maks ${maxBytes} bytes)`);
    }
    if (!fileName) throw new DomainError('VALIDATION_ERROR', 'Nama file wajib diisi');

    const rows = await db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, programId), eq(programs.organizationId, ctx.organizationId)))
      .limit(1);
    if (rows.length === 0) throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');

    const ext = extForMime(contentType);
    const safeBase = sanitizeCoverKeyPart(fileName.replace(/\.[^.]+$/, ''));
    const key = `programs/${ctx.organizationId}/${programId}/cover/${crypto.randomUUID()}-${safeBase}.${ext}`;

    const uploadUrl = await createR2PresignedPutUrl(env, key, contentType);
    const publicUrl = publicUrlForKey(env, key);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return c.json({ key, uploadUrl, publicUrl, contentType, contentLength, expiresAt, maxBytes }, 200);
  });

  // 0b. Presign cover upload for new program (no programId yet) - tmp key
  app.post('/api/v1/uploads/cover/presign', async (c) => {
    const { ctx } = getRequestContext(c);
    const env: any = c.env as any;
    const raw = await c.req.json().catch(() => ({}));
    const fileName = String(raw?.fileName ?? '').trim();
    const contentType = String(raw?.contentType ?? '').trim().toLowerCase();
    const contentLength = Number(raw?.contentLength);

    const { maxBytes, allowed } = getCoverLimits(env);
    if (!contentType || !allowed.includes(contentType)) {
      throw new DomainError('VALIDATION_ERROR', `Tipe file tidak didukung. Gunakan: ${allowed.join(', ')}`);
    }
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > maxBytes) {
      throw new DomainError('VALIDATION_ERROR', `Ukuran file melebihi batas 2MB (maks ${maxBytes} bytes)`);
    }
    if (!fileName) throw new DomainError('VALIDATION_ERROR', 'Nama file wajib diisi');

    const ext = extForMime(contentType);
    const safeBase = sanitizeCoverKeyPart(fileName.replace(/\.[^.]+$/, ''));
    const key = `programs/${ctx.organizationId}/pending/cover/${crypto.randomUUID()}-${safeBase}.${ext}`;

    const uploadUrl = await createR2PresignedPutUrl(env, key, contentType);
    const publicUrl = publicUrlForKey(env, key);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return c.json({ key, uploadUrl, publicUrl, contentType, contentLength, expiresAt, maxBytes }, 200);
  });

  // 0b2. Presign workspace assets (avatar, logo) upload
  app.post('/api/v1/uploads/workspace/:kind/presign', async (c) => {
    const { ctx } = getRequestContext(c);
    const env: any = c.env as any;
    const kind = c.req.param('kind');
    if (kind !== 'avatar' && kind !== 'logo') {
      throw new DomainError('VALIDATION_ERROR', 'Jenis aset tidak valid (hanya avatar atau logo)');
    }
    const raw = await c.req.json().catch(() => ({}));
    const fileName = String(raw?.fileName ?? '').trim();
    const contentType = String(raw?.contentType ?? '').trim().toLowerCase();
    const contentLength = Number(raw?.contentLength);

    const { maxBytes, allowed } = getCoverLimits(env);
    if (!contentType || !allowed.includes(contentType)) {
      throw new DomainError('VALIDATION_ERROR', `Tipe file tidak didukung. Gunakan: ${allowed.join(', ')}`);
    }
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > maxBytes) {
      throw new DomainError('VALIDATION_ERROR', `Ukuran file melebihi batas 2MB (maks ${maxBytes} bytes)`);
    }
    if (!fileName) throw new DomainError('VALIDATION_ERROR', 'Nama file wajib diisi');

    const ext = extForMime(contentType);
    const safeBase = sanitizeCoverKeyPart(fileName.replace(/\.[^.]+$/, ''));
    const key = `workspace/${ctx.organizationId}/${kind}/${crypto.randomUUID()}-${safeBase}.${ext}`;

    const uploadUrl = await createR2PresignedPutUrl(env, key, contentType);
    const publicUrl = publicUrlForKey(env, key);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return c.json({ key, uploadUrl, publicUrl, contentType, contentLength, expiresAt, maxBytes }, 200);
  });

  // 0c. Confirm cover after direct upload (verify R2 object exists, persist to DB, delete old)
  app.post('/api/v1/programs/:programId/cover/confirm', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const env: any = c.env as any;
    const programId = c.req.param('programId');
    const raw = await c.req.json().catch(() => ({}));
    const key = String(raw?.key ?? '').trim();
    const contentType = String(raw?.contentType ?? '').trim().toLowerCase();
    const contentLength = Number(raw?.contentLength);

    if (!key) throw new DomainError('VALIDATION_ERROR', 'Key R2 wajib diisi');
    const prefix = `programs/${ctx.organizationId}/${programId}/cover/`;
    const pendingPrefix = `programs/${ctx.organizationId}/pending/cover/`;
    if (!key.startsWith(prefix) && !key.startsWith(pendingPrefix)) {
      throw new DomainError('VALIDATION_ERROR', 'Key tidak valid untuk program ini');
    }

    const bucket: any = env?.CLASS_ASSETS;
    if (!bucket) throw new DomainError('INTERNAL_ERROR', 'R2 bucket tidak terkonfigurasi');

    const obj = await bucket.head(key);
    if (!obj) throw new DomainError('NOT_FOUND', 'File belum ter-upload ke R2');

    const { maxBytes, allowed } = getCoverLimits(env);
    const actualSize = Number((obj as any).size ?? (obj as any).contentLength ?? contentLength);
    const actualMime = String((obj as any).httpMetadata?.contentType ?? contentType ?? '').toLowerCase();
    if (!allowed.includes(actualMime)) {
      await bucket.delete(key).catch(() => {});
      throw new DomainError('VALIDATION_ERROR', `Tipe file tidak didukung: ${actualMime}`);
    }
    if (!Number.isFinite(actualSize) || actualSize > maxBytes) {
      await bucket.delete(key).catch(() => {});
      throw new DomainError('VALIDATION_ERROR', `Ukuran file melebihi 2MB`);
    }

    const rows = await db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, programId), eq(programs.organizationId, ctx.organizationId)))
      .limit(1);
    if (rows.length === 0) throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');

    const publicUrl = publicUrlForKey(env, key);
    const nowIso = new Date().toISOString();

    // If pending key, copy to final key
    let finalKey = key;
    let finalUrl = publicUrl;
    if (key.startsWith(pendingPrefix)) {
      const ext = extForMime(actualMime);
      const final = `programs/${ctx.organizationId}/${programId}/cover/${crypto.randomUUID()}.${ext}`;
      const srcObj = await bucket.get(key);
      if (!srcObj) throw new DomainError('NOT_FOUND', 'File pending tidak ditemukan');
      await bucket.put(final, srcObj.body, { httpMetadata: { contentType: actualMime } });
      await bucket.delete(key).catch(() => {});
      finalKey = final;
      finalUrl = publicUrlForKey(env, final);
    }

    const presRows = await db
      .select()
      .from(programPresentations)
      .where(eq(programPresentations.programId, programId))
      .limit(1);

    if (presRows.length > 0) {
      await db
        .update(programPresentations)
        .set({
          imageUrl: finalUrl,
          updatedAt: nowIso as any,
        })
        .where(eq(programPresentations.programId, programId));
    } else {
      await db.insert(programPresentations).values({
        programId,
        imageUrl: finalUrl,
        createdAt: nowIso as any,
        updatedAt: nowIso as any,
      });
    }

    return c.json({ key: finalKey, publicUrl: finalUrl, contentType: actualMime, contentLength: actualSize }, 200);
  });

  // 0d. Delete cover
  app.delete('/api/v1/programs/:programId/cover', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const programId = c.req.param('programId');
    const rows = await db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, programId), eq(programs.organizationId, ctx.organizationId)))
      .limit(1);
    if (rows.length === 0) throw new DomainError('NOT_FOUND', 'Program tidak ditemukan');

    await db
      .update(programPresentations)
      .set({
        imageUrl: null,
        updatedAt: new Date().toISOString() as any,
      })
      .where(eq(programPresentations.programId, programId));
    return c.json({ success: true }, 200);
  });

  // Public R2 Asset Delivery (Zero Auth, high-speed cached CDN stream)
  app.get('/api/v1/assets/r2/:key{.*}', async (c) => {
    const env: any = c.env as any;
    const key = c.req.param('key');
    const bucket: any = env?.CLASS_ASSETS;
    if (!bucket) {
      return c.text('R2 Storage tidak terkonfigurasi', 500);
    }
    const obj = await bucket.get(key);
    if (!obj) {
      return c.text('Asset tidak ditemukan', 404);
    }
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(obj.body, { headers });
  });

  // Fallback proxy for presign fallback (when native presign not available)
  app.put('/api/v1/uploads/r2/:key{.*}', async (c) => {
    const { ctx } = getRequestContext(c);
    const env: any = c.env as any;
    const key = c.req.param('key');
    if (!key || (!key.startsWith(`programs/${ctx.organizationId}/`) && !key.startsWith(`workspace/${ctx.organizationId}/`))) {
      throw new DomainError('VALIDATION_ERROR', 'Key tidak valid');
    }
    const bucket: any = env?.CLASS_ASSETS;
    if (!bucket) throw new DomainError('INTERNAL_ERROR', 'R2 tidak terkonfigurasi');
    const contentType = c.req.header('content-type') ?? 'application/octet-stream';
    const body = c.req.raw.body;
    if (!body) throw new DomainError('VALIDATION_ERROR', 'Body kosong');
    await bucket.put(key, body, { httpMetadata: { contentType } });
    return c.json({ success: true, key }, 200);
  });

  // ==========================================
  // Storefront Brand Customization Endpoints
  // Tenant-scoped (organizationId from context)
  // ==========================================
  app.get('/api/v1/class/storefront/theme', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const service = createStorefrontThemeService(db);
    const theme = await service.getThemeByOrg(ctx.organizationId);
    return c.json({ theme }, 200);
  });

  app.put('/api/v1/class/storefront/theme', async (c) => {
    const { ctx, db } = getRequestContext(c);
    try {
      const body = await c.req.json().catch(() => ({}));
      const validated = UpdateStorefrontThemeRequestSchema.parse(body);
      const service = createStorefrontThemeService(db);
      const theme = await service.updateTheme(ctx.organizationId, validated);
      return c.json({ success: true, theme }, 200);
    } catch (err: any) {
      console.error('[PUT /storefront/theme error]:', err?.message, err?.detail, err?.code);
      return c.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'Update failed',
          detail: err?.detail || err?.cause?.message || null,
          pgCode: err?.code || null,
        }
      }, 500);
    }
  });

  app.post('/api/v1/class/storefront/theme/reset', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const service = createStorefrontThemeService(db);
    const theme = await service.resetTheme(ctx.organizationId);
    return c.json({ success: true, theme }, 200);
  });

  // 1. List Enrollments
  app.get('/api/v1/class/enrollments', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const service = createEnrollmentService(db);
    const programId = c.req.query('programId');
    const contactId = c.req.query('contactId');

    const enrollments = await service.listEnrollmentsByOrg(ctx.organizationId, {
      programId: programId || undefined,
      contactId: contactId || undefined,
    });

    return c.json({ enrollments }, 200);
  });

  // 2. Manual Enrollment
  app.post('/api/v1/class/enrollments', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = CreateManualEnrollmentRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message).join(', ');
      throw new DomainError('VALIDATION_ERROR', `Payload pendaftaran tidak valid: ${details}`);
    }

    const service = createEnrollmentService(db);
    const enrollment = await service.enrollContact({
      organizationId: ctx.organizationId,
      programId: parsed.data.programId,
      contactId: parsed.data.contactId,
    });

    return c.json({ enrollment }, 201);
  });

  // 3. Get Enrollment by ID
  app.get('/api/v1/class/enrollments/:id', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const id = c.req.param('id');
    const service = createEnrollmentService(db);

    const enrollment = await service.getEnrollmentById(ctx.organizationId, id);
    if (!enrollment) {
      throw new DomainError('NOT_FOUND', 'Pendaftaran program tidak ditemukan');
    }

    return c.json({ enrollment }, 200);
  });

  // 4. Learning Context for Contact (Flow ↔ Class integration)
  app.get('/api/v1/class/contacts/:contactId/learning-context', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('contactId');
    const adapter = createPromotorClassAdapter(db);

    const learningContext = await adapter.getLearningContext(ctx.organizationId, contactId);
    return c.json(learningContext, 200);
  });

  // 5. List Eligible Programs for Manual/Aftersales Enrollment
  app.get('/api/v1/class/programs/eligible', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const accessType = c.req.query('accessType');
    const adapter = createPromotorClassAdapter(db);

    const programs = await adapter.listEligiblePrograms(ctx.organizationId, accessType || undefined);
    return c.json({ programs }, 200);
  });

  // 6. Integration Health for PromotorFlow (derived from entitlements & outbox failure state)
  app.get('/api/v1/class/integration/health', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const ent = await createEntitlementRepository(db).getForOrg({ organizationId: ctx.organizationId });
    if (!ent || !ent.promotorFlow) {
      return c.json({ promotorFlow: 'UNAVAILABLE' }, 200);
    }
    const recentFailed = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(integrationOutbox)
      .where(
        and(
          eq(integrationOutbox.organizationId, ctx.organizationId),
          eq(integrationOutbox.status, 'FAILED')
        )
      );
    const failCount = recentFailed[0]?.count ?? 0;
    const isDegraded = failCount >= 5;
    return c.json({ promotorFlow: isDegraded ? 'UNAVAILABLE' : 'AVAILABLE' }, 200);
  });

  // 7. List Learning Signals (B5 Operator Intelligence)
  app.get('/api/v1/class/signals', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const status = c.req.query('status') as 'ACTIVE' | 'RESOLVED' | 'DISMISSED' | undefined;

    const rows = await db
      .select({
        id: learningSignals.id,
        organizationId: learningSignals.organizationId,
        contactId: learningSignals.contactId,
        contactName: contacts.name,
        contactPhone: contacts.phoneE164,
        programId: learningSignals.programId,
        programTitle: programs.title,
        enrollmentId: learningSignals.enrollmentId,
        sourceEventId: learningSignals.sourceEventId,
        type: learningSignals.type,
        priority: learningSignals.priority,
        reason: learningSignals.reason,
        recommendedActionType: learningSignals.recommendedActionType,
        recommendedActionReason: learningSignals.recommendedActionReason,
        status: learningSignals.status,
        metadata: learningSignals.metadata,
        createdAt: learningSignals.createdAt,
        resolvedAt: learningSignals.resolvedAt,
        intentScore: enrollments.intentScore,
        intentLabel: enrollments.intentLabel,
      })
      .from(learningSignals)
      .leftJoin(contacts, eq(learningSignals.contactId, contacts.id))
      .leftJoin(programs, eq(learningSignals.programId, programs.id))
      .leftJoin(enrollments, eq(learningSignals.enrollmentId, enrollments.id))
      .where(
        and(
          eq(learningSignals.organizationId, ctx.organizationId),
          status ? eq(learningSignals.status, status) : undefined
        )
      )
      .orderBy(desc(learningSignals.createdAt));

    return c.json({
      signals: rows.map((r: any) => {
        const intentLabel = r.intentLabel ? String(r.intentLabel).toUpperCase() : null;
        const signalLevel =
          intentLabel === 'HOT'
            ? 'Minat tinggi'
            : intentLabel === 'WARM'
            ? 'Minat sedang'
            : intentLabel === 'COLD'
            ? 'Minat rendah'
            : 'Belum dievaluasi';

        return {
          id: r.id,
          organizationId: r.organizationId,
          contactId: r.contactId,
          contactName: r.contactName || '',
          contactPhone: r.contactPhone || '',
          programId: r.programId || '',
          programTitle: r.programTitle || '',
          enrollmentId: r.enrollmentId || '',
          sourceEventId: r.sourceEventId || null,
          signalLevel,
          intentScore: typeof r.intentScore === 'number' ? r.intentScore : null,
          intentLabel: intentLabel ? (intentLabel.toLowerCase() as 'cold' | 'warm' | 'hot') : null,
          reason: r.reason,
          primaryReason: r.recommendedActionReason || r.reason || '',
          rawReflectionQuote: r.metadata?.rawReflectionQuote || null,
          status: r.status,
          evaluatedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        };
      }),
    }, 200);
  });

  // 7. Update Learning Signal Status
  app.patch('/api/v1/class/signals/:id/status', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const id = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const status = raw?.status as 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
    if (!status || !['ACTIVE', 'RESOLVED', 'DISMISSED'].includes(status)) {
      throw new DomainError('VALIDATION_ERROR', 'Status harus ACTIVE, RESOLVED, atau DISMISSED');
    }

    const learningService = createLearningEngineService(db);
    const updated = await learningService.updateSignalStatus(ctx.organizationId, id, status);
    if (!updated) {
      throw new DomainError('NOT_FOUND', 'Sinyal belajar tidak ditemukan');
    }

    return c.json({ signal: updated }, 200);
  });

  // 8. List Learners for Operator View (§27)
  app.get('/api/v1/class/learners', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const programId = c.req.query('programId');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : undefined;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : undefined;

    const learningService = createLearningEngineService(db);
    const result = await learningService.listLearners(ctx.organizationId, {
      programId: programId || undefined,
      limit,
      offset,
    });

    return c.json(result, 200);
  });

  // 9. Get Learner Detail for Operator View (§27)
  app.get('/api/v1/class/learners/:contactId', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('contactId');

    const learningService = createLearningEngineService(db);
    const detail = await learningService.getLearnerDetail(ctx.organizationId, contactId);

    return c.json(detail, 200);
  });

  // 10. Get Program Aggregated Analytics (§28)
  app.get('/api/v1/class/programs/:programId/analytics', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const programId = c.req.param('programId');

    const learningService = createLearningEngineService(db);
    const analytics = await learningService.getProgramAnalytics(ctx.organizationId, programId);

    return c.json(analytics, 200);
  });

  // 11. List Contacts for PromotorClass (Returns contacts with enrollments in Class by default)
  app.get('/api/v1/class/contacts', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const includeAll = c.req.query('all') === 'true';

    let rows;
    if (includeAll) {
      rows = await db
        .select({
          id: contacts.id,
          organizationId: contacts.organizationId,
          name: contacts.name,
          phoneE164: contacts.phoneE164,
          createdAt: contacts.createdAt,
        })
        .from(contacts)
        .where(and(eq(contacts.organizationId, ctx.organizationId), isNull(contacts.deletedAt)))
        .orderBy(desc(contacts.createdAt));
    } else {
      rows = await db
        .selectDistinct({
          id: contacts.id,
          organizationId: contacts.organizationId,
          name: contacts.name,
          phoneE164: contacts.phoneE164,
          createdAt: contacts.createdAt,
        })
        .from(contacts)
        .innerJoin(enrollments, eq(contacts.id, enrollments.contactId))
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(enrollments.organizationId, ctx.organizationId),
            isNull(contacts.deletedAt)
          )
        )
        .orderBy(desc(contacts.createdAt));
    }

    return c.json({
      contacts: rows.map((r: any) => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      })),
    }, 200);
  });

  // 12. List Reflections for PromotorClass
  app.get('/api/v1/class/reflections', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const rows = await db
      .select({
        id: reflectionResponses.id,
        organizationId: reflectionResponses.organizationId,
        enrollmentId: reflectionResponses.enrollmentId,
        lessonId: reflectionResponses.lessonId,
        contactId: enrollments.contactId,
        contactName: contacts.name,
        contactPhone: contacts.phoneE164,
        programId: enrollments.programId,
        programTitle: programs.title,
        responseText: reflectionResponses.responseText,
        selectedOptions: reflectionResponses.selectedOptions,
        submittedAt: reflectionResponses.submittedAt,
      })
      .from(reflectionResponses)
      .innerJoin(enrollments, eq(reflectionResponses.enrollmentId, enrollments.id))
      .innerJoin(contacts, eq(enrollments.contactId, contacts.id))
      .innerJoin(programs, eq(enrollments.programId, programs.id))
      .where(eq(reflectionResponses.organizationId, ctx.organizationId))
      .orderBy(desc(reflectionResponses.submittedAt));

    return c.json({
      reflections: rows.map((r: any) => ({
        id: r.id,
        organizationId: r.organizationId,
        enrollmentId: r.enrollmentId,
        lessonId: r.lessonId,
        contactId: r.contactId,
        contactName: r.contactName,
        contactPhone: r.contactPhone,
        programId: r.programId,
        programTitle: r.programTitle,
        answerText: r.responseText || '',
        responseText: r.responseText,
        selectedOptions: r.selectedOptions,
        submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString(),
      })),
    }, 200);
  });

  // 13. List Learning Activity for PromotorClass
  app.get('/api/v1/class/activity', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const rows = await db
      .select({
        id: learningEvents.id,
        organizationId: learningEvents.organizationId,
        contactId: learningEvents.contactId,
        contactName: contacts.name,
        contactPhone: contacts.phoneE164,
        eventType: learningEvents.eventType,
        payload: learningEvents.payload,
        occurredAt: learningEvents.occurredAt,
      })
      .from(learningEvents)
      .innerJoin(contacts, eq(learningEvents.contactId, contacts.id))
      .where(eq(learningEvents.organizationId, ctx.organizationId))
      .orderBy(desc(learningEvents.occurredAt))
      .limit(100);

    return c.json({
      activity: rows.map((r: any) => ({
        ...r,
        occurredAt: r.occurredAt ? new Date(r.occurredAt).toISOString() : new Date().toISOString(),
      })),
    }, 200);
  });

  // ==========================================
  // Manual Paid Program Commerce Endpoints
  // ==========================================

  // 14. List Orders (Purchase Requests)
  app.get('/api/v1/class/orders', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const status = c.req.query('status') as any;
    const method = c.req.query('method') as any;

    const commerceService = createCommerceService(db);
    const orders = await commerceService.listOrders(ctx.organizationId, {
      status: status || undefined,
      method: method || undefined,
    });

    return c.json({ orders, total: orders.length }, 200);
  });

  // 15. Get Single Order Detail
  app.get('/api/v1/class/orders/:id', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const id = c.req.param('id');

    const commerceService = createCommerceService(db);
    const order = await commerceService.getOrderById(ctx.organizationId, id);
    if (!order) {
      throw new DomainError('NOT_FOUND', 'Pesanan tidak ditemukan');
    }

    return c.json({ order }, 200);
  });

  // 16. Approve Order (Grant Access)
  app.post('/api/v1/class/orders/:id/approve', async (c) => {
    const { ctx, actor, db } = getRequestContext(c);
    const id = c.req.param('id');

    const commerceService = createCommerceService(db);
    const result = await commerceService.approvePurchaseRequest(ctx.organizationId, id, actor.userId);

    return c.json(result, 200);
  });

  // 17. Reject Order
  app.post('/api/v1/class/orders/:id/reject', async (c) => {
    const { ctx, actor, db } = getRequestContext(c);
    const id = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));

    const commerceService = createCommerceService(db);
    const order = await commerceService.rejectPurchaseRequest(
      ctx.organizationId,
      id,
      actor.userId,
      raw.reason
    );

    return c.json({ order }, 200);
  });

  // 18. Get Payment Settings
  app.get('/api/v1/class/settings/payments', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const commerceService = createCommerceService(db);
    const settings = await commerceService.getPaymentSettings(ctx.organizationId);
    return c.json({ settings }, 200);
  });

  // 19. Update Payment Settings (Sales WhatsApp)
  app.put('/api/v1/class/settings/payments', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = UpdatePaymentSettingsRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Format nomor WhatsApp penjualan tidak valid');
    }

    const commerceService = createCommerceService(db);
    const settings = await commerceService.updateSalesWhatsAppNumber(
      ctx.organizationId,
      parsed.data.salesWhatsAppNumber ?? null
    );

    return c.json({ settings }, 200);
  });

  // 20. Bank Accounts CRUD
  app.post('/api/v1/class/settings/payments/bank-accounts', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = CreateBankAccountRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Data rekening bank tidak valid');
    }

    const commerceService = createCommerceService(db);
    const bankAccount = await commerceService.createBankAccount(ctx.organizationId, parsed.data);

    return c.json({ bankAccount }, 201);
  });

  app.put('/api/v1/class/settings/payments/bank-accounts/:id', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const id = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const parsed = UpdateBankAccountRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Data rekening bank tidak valid');
    }

    const commerceService = createCommerceService(db);
    const bankAccount = await commerceService.updateBankAccount(ctx.organizationId, id, parsed.data);
    if (!bankAccount) {
      throw new DomainError('NOT_FOUND', 'Rekening bank tidak ditemukan');
    }

    return c.json({ bankAccount }, 200);
  });

  app.delete('/api/v1/class/settings/payments/bank-accounts/:id', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const id = c.req.param('id');

    const commerceService = createCommerceService(db);
    const deleted = await commerceService.deleteBankAccount(ctx.organizationId, id);
    if (!deleted) {
      throw new DomainError('NOT_FOUND', 'Rekening bank tidak ditemukan');
    }

    return c.json({ success: true }, 200);
  });
}


