import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import {
  CreateManualEnrollmentRequestSchema,
} from '@promotor/contracts';
import { createEnrollmentService } from '../services/class/enrollment-service';
import { createPromotorClassAdapter } from '../services/class/promotor-class-adapter';
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
}
