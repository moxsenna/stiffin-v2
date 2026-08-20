import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { DomainError } from '../core/errors';
import {
  CreateFlowContactRequestSchema,
  UpdateFlowContactProfileRequestSchema,
  TransitionFlowContactStageRequestSchema,
  ListFlowContactsQuerySchema,
  ListNextActionsQuerySchema,
  CreateNextActionRequestSchema,
  CompleteNextActionRequestSchema,
  SkipNextActionRequestSchema,
  RescheduleNextActionRequestSchema,
  CompleteAftercareActionRequestSchema,
  CreateFlowServiceRequestSchema,
  UpdateFlowServiceRequestSchema,
  ListMessageTemplatesQuerySchema,
  CreateMessageTemplateRequestSchema,
  UpdateMessageTemplateRequestSchema,
  ListAftercareQuerySchema,
  ListBookingsQuerySchema,
  CreateBookingRequestSchema,
  RescheduleBookingRequestSchema,
  CancelBookingRequestSchema,
  WhatsAppOpenedRequestSchema,
  ConfirmWhatsAppSentRequestSchema,
  ReplaceAvailabilityRulesRequestSchema,
} from '@promotor/contracts';
import { nextActions } from '../db/schema';
import { createContactFlowService } from '../services/contact-flow-service';
import { createContactLifecycleService } from '../services/contact-lifecycle-service';
import { createNextActionService } from '../services/next-action-service';
import { createBookingService } from '../services/booking-service';
import { createServiceRepository } from '../repositories/service-repository';
import { createTemplateService } from '../services/template-service';
import { createAftercareService } from '../services/aftercare-service';
import { createMessagingService } from '../services/messaging-service';
import { createAvailabilityService } from '../services/flow/availability-service';
import { createContactPrivacyService } from '../services/contact-privacy-service';
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

function parseBody<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => i.message).join(', ');
    throw new DomainError('VALIDATION_ERROR', `Invalid request payload: ${errorDetails}`);
  }
  return parsed.data;
}

export function registerFlowRoutes(app: Hono<AppEnv>) {
  const flow = new Hono<AppEnv>();

  // =========================================================================
  // 1. TODAY READ MODEL (§8.4, §12)
  // =========================================================================
  flow.get('/today', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const service = createNextActionService(db);
    const nowOverride = c.req.query('nowOverride');
    const todayData = await service.getToday(ctx, nowOverride);
    return c.json(todayData, 200);
  });

  // =========================================================================
  // 2. CONTACTS (§5.1, §5.2, §12)
  // =========================================================================
  flow.get('/contacts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const query = parseBody(ListFlowContactsQuerySchema, {
      search: c.req.query('search') || undefined,
      classification: c.req.query('classification') || undefined,
      limit: c.req.query('limit') || undefined,
      offset: c.req.query('offset') || undefined,
    });
    const service = createContactFlowService(db);
    const contactsList = await service.listContacts(ctx, query);
    return c.json({ contacts: contactsList }, 200);
  });

  flow.post('/contacts', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CreateFlowContactRequestSchema, raw);
    const service = createContactFlowService(db);
    const result = await service.createFlowContact(ctx, body, actor);
    return c.json(result, 201);
  });

  flow.get('/contacts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('id');
    const service = createContactFlowService(db);
    const context = await service.getContactContext(ctx, contactId);
    return c.json({ context }, 200);
  });

  flow.patch('/contacts/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const contactId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(UpdateFlowContactProfileRequestSchema, raw);
    const service = createContactFlowService(db);
    const updated = await service.updateProfile(ctx, contactId, body, actor);
    return c.json({ flowState: updated }, 200);
  });

  flow.post('/contacts/:id/stage', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const contactId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(TransitionFlowContactStageRequestSchema, raw);
    const service = createContactLifecycleService(db);
    const updated = await service.transitionStage(
      ctx,
      contactId,
      body.stage,
      { lostReason: body.lostReason },
      actor
    );
    return c.json({ flowState: updated }, 200);
  });

  flow.get('/contacts/:id/activities', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('id');
    const limitQuery = c.req.query('limit');
    const limit = limitQuery ? Number(limitQuery) : 100;
    const service = createContactFlowService(db);
    const activities = await service.getContactTimeline(ctx, contactId, limit);
    return c.json({ activities }, 200);
  });

  flow.get('/contacts/:id/primary-next-action', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('id');
    const service = createNextActionService(db);
    const primaryNextAction = await service.getPrimaryNextAction(ctx, contactId);
    return c.json({ primaryNextAction }, 200);
  });

  flow.get('/contacts/:id/assessment-status', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const contactId = c.req.param('id');
    const service = createContactFlowService(db);
    const assessment = await service.getAssessmentStatus(ctx, contactId);
    return c.json({ assessment }, 200);
  });

  flow.post('/contacts/:id/privacy-anonymize', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const contactId = c.req.param('id');
    const service = createContactPrivacyService(db);
    const result = await service.anonymizeContact(ctx.organizationId, contactId, actor.userId);
    return c.json(result, 200);
  });

  // =========================================================================
  // 3. NEXT ACTIONS (§5.3, §5.4, §12)
  // =========================================================================
  flow.get('/next-actions', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const query = parseBody(ListNextActionsQuerySchema, {
      contactId: c.req.query('contactId') || undefined,
      status: c.req.query('status') || undefined,
    });

    const conditions = [eq(nextActions.organizationId, ctx.organizationId)];
    if (query.contactId) {
      conditions.push(eq(nextActions.contactId, query.contactId));
    }
    if (query.status) {
      conditions.push(eq(nextActions.status, query.status));
    }

    const rows = await db
      .select()
      .from(nextActions)
      .where(and(...conditions))
      .orderBy(desc(nextActions.createdAt));

    return c.json({ nextActions: rows }, 200);
  });

  flow.post('/next-actions', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CreateNextActionRequestSchema, raw);
    const service = createNextActionService(db);

    let created;
    if (body.actionType === 'FOLLOW_UP') {
      created = await service.createFollowUp(
        ctx,
        {
          contactId: body.contactId,
          dueAt: body.dueAt ?? undefined,
          title: body.title,
          description: body.description ?? null,
          priority: body.priority,
        },
        actor
      );
    } else {
      created = await service.createManualAction(
        ctx,
        {
          contactId: body.contactId,
          title: body.title,
          dueAt: body.dueAt ?? undefined,
          description: body.description ?? null,
          priority: body.priority,
        },
        actor
      );
    }

    return c.json({ nextAction: created }, 201);
  });

  flow.post('/next-actions/:id/complete', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const actionId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CompleteNextActionRequestSchema, raw);
    const service = createNextActionService(db);
    const completed = await service.completeAction(
      ctx,
      actionId,
      { confirmedWhatsAppSent: body.confirmedWhatsAppSent },
      actor
    );
    return c.json({ nextAction: completed }, 200);
  });

  flow.post('/next-actions/:id/skip', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const actionId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(SkipNextActionRequestSchema, raw);
    const service = createNextActionService(db);
    const result = await service.skipAction(
      ctx,
      actionId,
      {
        type: body.nextStep.type,
        dueAt: body.nextStep.dueAt ?? undefined,
        title: body.nextStep.title ?? undefined,
        description: body.nextStep.description ?? undefined,
      },
      actor
    );
    return c.json(result, 200);
  });

  flow.post('/next-actions/:id/cancel', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const actionId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const reason = typeof raw === 'object' && raw !== null ? raw.reason : undefined;
    const service = createNextActionService(db);
    const cancelled = await service.cancelAction(ctx, actionId, reason, actor);
    return c.json({ nextAction: cancelled }, 200);
  });

  flow.post('/next-actions/:id/reschedule', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const actionId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(RescheduleNextActionRequestSchema, raw);
    const service = createNextActionService(db);
    const rescheduled = await service.rescheduleAction(ctx, actionId, body.dueAt, actor);
    return c.json({ nextAction: rescheduled }, 200);
  });

  flow.post('/next-actions/:id/aftercare-complete', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const actionId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CompleteAftercareActionRequestSchema, raw);
    const service = createAftercareService(db);
    const result = await service.completeAftercare(ctx, actionId, body, actor);
    return c.json(result, 200);
  });

  // =========================================================================
  // 4. SERVICES (§5.7, §12)
  // =========================================================================
  flow.get('/services', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const repo = createServiceRepository(db);
    const servicesList = await repo.listActive(ctx);
    return c.json({ services: servicesList }, 200);
  });

  flow.post('/services', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CreateFlowServiceRequestSchema, raw);
    const repo = createServiceRepository(db);
    const created = await repo.create(ctx, {
      name: body.name,
      description: body.description ?? null,
      category: body.category,
      priceAmount: body.priceAmount,
      depositAmount: body.depositAmount ?? null,
      durationMinutes: body.durationMinutes,
      isActive: body.isActive ?? true,
    });
    return c.json({ service: created }, 201);
  });

  flow.patch('/services/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const serviceId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(UpdateFlowServiceRequestSchema, raw);
    const repo = createServiceRepository(db);
    const updated = await repo.update(ctx, serviceId, {
      name: body.name,
      description: body.description,
      category: body.category,
      priceAmount: body.priceAmount,
      depositAmount: body.depositAmount,
      durationMinutes: body.durationMinutes,
      isActive: body.isActive,
    });
    if (!updated) {
      throw new DomainError('NOT_FOUND', 'Service not found');
    }
    return c.json({ service: updated }, 200);
  });

  // =========================================================================
  // 5. MESSAGE TEMPLATES (§5.9, §12)
  // =========================================================================
  flow.get('/message-templates', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const query = parseBody(ListMessageTemplatesQuerySchema, {
      category: c.req.query('category') || undefined,
    });
    const service = createTemplateService(db);
    const templates = await service.listTemplates(ctx, query);
    return c.json({ templates }, 200);
  });

  flow.post('/message-templates', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CreateMessageTemplateRequestSchema, raw);
    const service = createTemplateService(db);
    const created = await service.createTemplate(ctx, {
      title: body.title,
      category: body.category,
      templateText: (body as any).templateText ?? body.bodyText,
      isActive: body.isActive,
    });
    return c.json({ template: created }, 201);
  });

  flow.patch('/message-templates/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const templateId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(UpdateMessageTemplateRequestSchema, raw);
    const service = createTemplateService(db);
    const updated = await service.updateTemplate(ctx, templateId, {
      title: body.title,
      category: body.category,
      templateText: (body as any).templateText ?? body.bodyText,
      isActive: body.isActive,
    });
    return c.json({ template: updated }, 200);
  });

  // =========================================================================
  // 6. AFTERCARE (§5.5, §12)
  // =========================================================================
  flow.get('/aftercare', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const query = parseBody(ListAftercareQuerySchema, {
      status: c.req.query('status') || undefined,
    });
    const service = createAftercareService(db);
    const records = await service.listAftercare(ctx, query);
    return c.json({ records }, 200);
  });

  // =========================================================================
  // 7. BOOKINGS (§5.3, §12)
  // =========================================================================
  flow.get('/bookings', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const query = parseBody(ListBookingsQuerySchema, {
      from: c.req.query('from') || undefined,
      to: c.req.query('to') || undefined,
      contactId: c.req.query('contactId') || undefined,
      status: c.req.query('status') || undefined,
    });
    const service = createBookingService(db);
    const bookingsList = await service.getAgenda(ctx, query);
    return c.json({ bookings: bookingsList }, 200);
  });

  flow.post('/bookings', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CreateBookingRequestSchema, raw);
    const service = createBookingService(db);
    const created = await service.createBooking(
      ctx,
      {
        contactId: body.contactId,
        serviceId: body.serviceId,
        startAt: body.startAt,
        endAt: body.endAt ?? null,
        locationType: body.locationType ?? 'ONLINE',
        locationText: body.locationText ?? null,
        notes: body.notes ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
      },
      actor
    );
    return c.json({ booking: created }, 201);
  });

  flow.get('/bookings/:id', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const bookingId = c.req.param('id');
    const service = createBookingService(db);
    const booking = await service.getBookingDetail(ctx, bookingId);
    return c.json({ booking }, 200);
  });

  flow.post('/bookings/:id/confirm', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const bookingId = c.req.param('id');
    const service = createBookingService(db);
    const confirmed = await service.confirmBooking(ctx, bookingId, actor);
    return c.json({ booking: confirmed }, 200);
  });

  flow.post('/bookings/:id/mark-paid', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const bookingId = c.req.param('id');
    const service = createBookingService(db);
    const updated = await service.markPaid(ctx, bookingId, 'PAID', actor);
    return c.json({ booking: updated }, 200);
  });

  flow.post('/bookings/:id/reschedule', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const bookingId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(RescheduleBookingRequestSchema, raw);
    const service = createBookingService(db);
    const rescheduled = await service.rescheduleBooking(
      ctx,
      bookingId,
      body.startAt,
      body.endAt ?? null,
      actor
    );
    return c.json({ booking: rescheduled }, 200);
  });

  flow.post('/bookings/:id/complete', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const bookingId = c.req.param('id');
    const service = createBookingService(db);
    const completed = await service.completeBooking(ctx, bookingId, actor);
    return c.json({ booking: completed }, 200);
  });

  flow.post('/bookings/:id/cancel', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const bookingId = c.req.param('id');
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(CancelBookingRequestSchema, raw);
    const service = createBookingService(db);
    const cancelled = await service.cancelBooking(
      ctx,
      bookingId,
      { reason: body.cancellationReason ?? undefined },
      actor
    );
    return c.json({ booking: cancelled }, 200);
  });

  flow.post('/bookings/:id/no-show', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const bookingId = c.req.param('id');
    const service = createBookingService(db);
    const updated = await service.markNoShow(ctx, bookingId, actor);
    return c.json({ booking: updated }, 200);
  });

  // =========================================================================
  // 8. MESSAGING (§5.8, §12)
  // =========================================================================
  flow.post('/messaging/whatsapp-opened', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(WhatsAppOpenedRequestSchema, raw);
    const service = createMessagingService(db);
    const result = await service.buildWaDeepLink(
      ctx,
      {
        contactId: body.contactId,
        message: body.rawText ?? (body as any).message,
      },
      actor
    );
    return c.json(result, 200);
  });

  flow.post('/messaging/confirm-sent', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, actor, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(ConfirmWhatsAppSentRequestSchema, raw);
    const service = createNextActionService(db);
    const completed = await service.completeAction(
      ctx,
      body.nextActionId,
      { confirmedWhatsAppSent: true },
      actor
    );
    return c.json({ nextAction: completed }, 200);
  });

  // =========================================================================
  // 9. AVAILABILITY (§12)
  // =========================================================================
  flow.get('/availability', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const service = createAvailabilityService(db);
    const rules = await service.getWeeklyRules(ctx);
    return c.json({ rules }, 200);
  });

  flow.put('/availability', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { ctx, db } = getRequestContext(c);
    const raw = await c.req.json().catch(() => ({}));
    const body = parseBody(ReplaceAvailabilityRulesRequestSchema, raw);
    const service = createAvailabilityService(db);
    const rules = await service.replaceWeeklyRules(ctx, body.rules);
    return c.json({ rules }, 200);
  });

  // Mount under /api/v1/flow
  app.route('/api/v1/flow', flow);
}
