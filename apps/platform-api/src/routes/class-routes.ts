import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, isNull } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import {
  CreateManualEnrollmentRequestSchema,
} from '@promotor/contracts';
import { createEnrollmentService } from '../services/class/enrollment-service';
import { createPromotorClassAdapter } from '../services/class/promotor-class-adapter';
import { createLearningEngineService } from '../services/class/learning-engine-service';
import { contacts } from '../db/schema/contacts';
import { reflectionResponses } from '../db/schema/reflection-responses';
import { learningEvents } from '../db/schema/learning-events';
import { enrollments } from '../db/schema/enrollments';
import { programs } from '../db/schema/programs';
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

  // 6. List Learning Signals (B5 Operator Intelligence)
  app.get('/api/v1/class/signals', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const status = c.req.query('status') as 'ACTIVE' | 'RESOLVED' | 'DISMISSED' | undefined;
    const learningService = createLearningEngineService(db);

    const signals = await learningService.listSignals(ctx.organizationId, status || undefined);
    return c.json({ signals }, 200);
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

  // 11. List Contacts for PromotorClass
  app.get('/api/v1/class/contacts', async (c) => {
    const { ctx, db } = getRequestContext(c);
    const rows = await db
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
}

