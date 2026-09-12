import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import {
  CreateManualEnrollmentRequestSchema,
  LearnersListQuerySchema,
  CreateCouponRequestSchema,
  UpdateCouponRequestSchema,
  BridgeMetricEventSchema,
} from '@promotor/contracts';
import { createBridgeTeaserService } from '../services/class/bridge-teaser-service';
import { recordBridgeMetric, upsertDismissal } from '../services/integration/bridge-metrics-service';
import { createEnrollmentService } from '../services/class/enrollment-service';
import { createPromotorClassAdapter } from '../services/class/promotor-class-adapter';
import { createLearningEngineService } from '../services/class/learning-engine-service';
import { createCouponService } from '../services/commerce/coupon-service';
import { createEntitlementRepository } from '../repositories/entitlement-repository';
import { contacts } from '../db/schema/contacts';
import { reflectionResponses } from '../db/schema/reflection-responses';
import { learningEvents } from '../db/schema/learning-events';
import { enrollments } from '../db/schema/enrollments';
import { programs } from '../db/schema/programs';
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

export function registerClassRoutes(app: Hono<AppEnv>) {
  // ==========================================
  // PromotorClass Operator Endpoints
  // Gated by Better Auth + promotorClass entitlement
  // ==========================================

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
          type: r.type,
          recommendedActionType: r.recommendedActionType || null,
          metadata: r.metadata || {},
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
    const raw = c.req.query();
    const queryParsed = LearnersListQuerySchema.safeParse({
      programId: raw.programId || undefined,
      learningStatus: raw.learningStatus || undefined,
      limit: raw.limit,
      offset: raw.offset,
    });
    if (!queryParsed.success) {
      throw new DomainError('VALIDATION_ERROR', queryParsed.error.issues[0]?.message || 'Query parameter learningStatus tidak valid');
    }
    const { programId, learningStatus, limit, offset } = queryParsed.data;

    const learningService = createLearningEngineService(db);
    const result = await learningService.listLearners(ctx.organizationId, {
      programId,
      learningStatus,
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
  // Coupon Management Endpoints (Operator)
  // ==========================================
  app.get('/api/v1/class/coupons', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const service = createCouponService(db);
    const coupons = await service.list(ctx.organizationId);
    return c.json({ coupons }, 200);
  });

  app.post('/api/v1/class/coupons', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = CreateCouponRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const service = createCouponService(db);
    const existing = await service.findByCode(ctx.organizationId, parsed.data.code);
    if (existing) {
      throw new DomainError('CONFLICT', `Kupon dengan kode "${parsed.data.code.toUpperCase()}" sudah ada`);
    }
    const coupon = await service.create(ctx.organizationId, parsed.data);
    return c.json({ coupon }, 201);
  });

  app.patch('/api/v1/class/coupons/:couponId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const couponId = c.req.param('couponId');
    const raw = await c.req.json().catch(() => ({}));
    const parsed = UpdateCouponRequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const service = createCouponService(db);
    const updated = await service.update(ctx.organizationId, couponId, parsed.data);
    if (!updated) {
      throw new DomainError('NOT_FOUND', 'Kupon tidak ditemukan');
    }
    return c.json({ coupon: updated }, 200);
  });

  // 14. Dashboard summary for Beranda cards (single call, no N+1)
  app.get('/api/v1/class/dashboard-summary', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const orgId = ctx.organizationId;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const paidRes = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN paid_at >= ${monthStart.toISOString()} THEN amount ELSE 0 END), 0) AS "monthOmzet",
        COALESCE(SUM(CASE WHEN paid_at >= ${prevMonthStart.toISOString()} AND paid_at < ${monthStart.toISOString()} THEN amount ELSE 0 END), 0) AS "prevOmzet"
      FROM commerce_orders
      WHERE organization_id = ${orgId}
        AND order_type = 'PROGRAM_PURCHASE'
        AND status IN ('PAID', 'APPROVED')
    `);
    const paidRow: any = paidRes.rows?.[0] ?? {};
    const monthOmzet = Number(paidRow.monthOmzet ?? 0);
    const prevOmzet = Number(paidRow.prevOmzet ?? 0);
    const growthPercent = prevOmzet === 0 ? (monthOmzet > 0 ? 100 : 0) : ((monthOmzet - prevOmzet) / prevOmzet) * 100;

    const pesertaRes = await db.execute(sql`
      SELECT COUNT(DISTINCT contact_id) AS v FROM enrollments WHERE organization_id = ${orgId}
    `);
    const pesertaCount = Number((pesertaRes.rows?.[0] as any)?.v ?? 0);

    const progRes = await db.execute(sql`
      SELECT COUNT(*) FILTER (WHERE is_completed) AS done, COUNT(*) AS total
      FROM lesson_progress WHERE organization_id = ${orgId}
    `);
    const progRow: any = progRes.rows?.[0] ?? {};
    const progTotal = Number(progRow.total ?? 0);
    const completionPercent = progTotal === 0 ? 0 : (Number(progRow.done ?? 0) / progTotal) * 100;

    const activePrograms = await db
      .select({ id: programs.id, title: programs.title, priceAmount: programs.priceAmount })
      .from(programs)
      .where(and(eq(programs.organizationId, orgId), eq(programs.status, 'published')))
      .limit(10);

    const withCounts = [];
    for (const p of activePrograms) {
      const cntRes = await db.execute(sql`
        SELECT COUNT(*) AS v FROM enrollments WHERE organization_id = ${orgId} AND program_id = ${p.id}
      `);
      withCounts.push({ ...p, pesertaCount: Number((cntRes.rows?.[0] as any)?.v ?? 0) });
    }

    const enrollRes = await db.execute(sql`
      SELECT e.id, e.created_at AS "occurredAt", 'enrollment' AS kind,
             c.name AS "actorName", p.title AS "objectTitle"
      FROM enrollments e
      LEFT JOIN contacts c ON c.id = e.contact_id
      LEFT JOIN programs p ON p.id = e.program_id
      WHERE e.organization_id = ${orgId} ORDER BY e.created_at DESC LIMIT 3
    `);
    const payRes = await db.execute(sql`
      SELECT o.id, o.paid_at AS "occurredAt", 'payment' AS kind, o.amount,
             c.name AS "actorName", p.title AS "objectTitle"
      FROM commerce_orders o
      LEFT JOIN contacts c ON c.id = o.contact_id
      LEFT JOIN programs p ON p.id = o.program_id
      WHERE o.organization_id = ${orgId} AND o.status IN ('PAID','APPROVED')
        AND o.order_type = 'PROGRAM_PURCHASE' AND o.paid_at IS NOT NULL
      ORDER BY o.paid_at DESC LIMIT 3
    `);
    const reflRes = await db.execute(sql`
      SELECT r.id, r.submitted_at AS "occurredAt", 'reflection' AS kind,
             c.name AS "actorName", l.title AS "objectTitle"
      FROM reflection_responses r
      LEFT JOIN enrollments e ON e.id = r.enrollment_id
      LEFT JOIN contacts c ON c.id = e.contact_id
      LEFT JOIN lessons l ON l.id = r.lesson_id
      WHERE r.organization_id = ${orgId} ORDER BY r.submitted_at DESC LIMIT 3
    `);
    const recent = [...(enrollRes.rows ?? []), ...(payRes.rows ?? []), ...(reflRes.rows ?? [])] as any[];

    return c.json({
      monthlyOmzet: monthOmzet,
      pesertaCount,
      completionPercent: Math.round(completionPercent * 10) / 10,
      growthPercent: Math.round(growthPercent * 10) / 10,
      programAktif: withCounts,
      aktivitasTerbaru: recent
        .filter((a) => a.occurredAt)
        .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
        .slice(0, 6)
        .map((a) => {
          const actorName = a.actorName ? String(a.actorName) : null;
          const objectTitle = a.objectTitle ? String(a.objectTitle) : null;
          let summary: string;
          let detail: string | null;
          if (a.kind === 'payment') {
            const amount = 'Rp ' + Number(a.amount ?? 0).toLocaleString('id-ID');
            summary = actorName
              ? `${actorName} melunasi pembayaran ${amount}`
              : `Pembayaran ${amount} diterima`;
            detail = objectTitle ? `Pembayaran program ${objectTitle}` : 'Pembayaran program';
          } else if (a.kind === 'enrollment') {
            summary = actorName
              ? `${actorName} mendaftar di program${objectTitle ? ` ${objectTitle}` : ''}`
              : `Pendaftaran baru${objectTitle ? ` di ${objectTitle}` : ''}`;
            detail = objectTitle ? `Mendaftar di ${objectTitle}` : 'Pendaftaran program baru';
          } else {
            summary = actorName
              ? `${actorName} mengirim refleksi${objectTitle ? ` di ${objectTitle}` : ''}`
              : 'Refleksi baru dikirim';
            detail = objectTitle ? `Refleksi di ${objectTitle}` : 'Mengirim refleksi';
          }
          return {
            id: String(a.id),
            kind: a.kind,
            summary,
            actorName,
            detail,
            occurredAt: new Date(a.occurredAt).toISOString(),
          };
        }),
    }, 200);
  });

  // ==========================================
  // Bridge teaser: nilai Flow untuk org yang belum punya (attachment path)
  // ==========================================
  app.get('/api/v1/class/bridge/teaser', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const svc = createBridgeTeaserService(db);
    return c.json(await svc.getTeaser(ctx.organizationId), 200);
  });

  app.post('/api/v1/class/bridge/teaser/dismiss', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    await upsertDismissal(db, ctx.organizationId, 'beranda_flow_teaser');
    await recordBridgeMetric(db, {
      organizationId: ctx.organizationId,
      event: 'teaser_cta_clicked',
      meta: { kind: 'dismiss' },
    }).catch(() => null);
    return c.json({ success: true }, 200);
  });

  app.post('/api/v1/class/bridge/metrics', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const parsed = BridgeMetricEventSchema.safeParse(raw?.event);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', 'Event metrik tidak valid');
    }
    await recordBridgeMetric(db, {
      organizationId: ctx.organizationId,
      event: parsed.data,
      meta: raw?.meta ?? {},
    }).catch(() => null);
    return c.json({ success: true }, 200);
  });
}


