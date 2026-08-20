import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Env } from './env';
import { executeDbHealthProbe } from './db/client';
import { authLifecycle, sessionMiddleware } from './auth/session-middleware';
import { AuthError, authErrorStatus } from './auth/errors';
import { requireOrganization, requireEntitlement, requireRole } from './auth/authorization';
import type { AuthContext } from './auth/types';
import type { AuthInstance } from './auth/create-auth';
import { DomainError, isDomainError } from './core/errors';
import { createProgramRepository } from './repositories/program-repository';
import { createWorkspaceProfileRepository } from './repositories/workspace-profile-repository';
import { createPublicContentRepository } from './repositories/public-content-repository';
import { createEnrollmentRepository } from './repositories/enrollment-repository';
import { createProgramService } from './services/program-service';
import { createPublicContentService } from './services/public-content-service';
import { createAvailabilityService } from './services/flow/availability-service';
import { createPublicBookingService } from './services/flow/public-booking-service';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { createEnrollmentService } from './services/class/enrollment-service';
import { createLearningEngineService } from './services/class/learning-engine-service';
import { createLearnerSessionService } from './services/class/learner-session-service';
import { learnerAuthMiddleware } from './middleware/learner-auth-middleware';
import {
  PublicSlotsQuerySchema,
  CreatePublicBookingRequestSchema,
  PublicRegisterLearnerRequestSchema,
  RedeemLearnerTokenRequestSchema,
  SubmitReflectionRequestSchema,
  RecordLearningEventRequestSchema,
  RecordCtaClickRequestSchema,
} from '@promotor/contracts';
import { registerFlowRoutes } from './routes/flow-routes';
import { registerClassRoutes } from './routes/class-routes';
import { requestLoggerMiddleware, logOperation } from './core/observability';

export interface AppDependencies {
  dbHealthProbe?: (env: Env) => Promise<{ serverTime: string }>;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { db: NodePgDatabase; auth: AuthInstance; authContext: AuthContext | null };
};

function domainErrorStatus(err: DomainError): 400 | 401 | 403 | 404 | 409 | 500 {
  switch (err.code) {
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
    case 'INVALID_YOUTUBE_URL':
    case 'PROGRAM_NOT_PUBLISHED':
      return 400;
    case 'CONFLICT':
    case 'SLOT_UNAVAILABLE':
      return 409;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
    case 'CONTENT_DELETE_FORBIDDEN':
      return 403;
    default:
      return 500;
  }
}

export function createApp(deps?: AppDependencies) {
  const app = new Hono<AppEnv>();
  const probeDb = deps?.dbHealthProbe ?? executeDbHealthProbe;

  // Global Structured Request Logging Middleware
  app.use('*', requestLoggerMiddleware());

  // Global Error Handler: maps AuthError & DomainError -> clean JSON envelope
  app.onError((err, c) => {
    const requestId =
      c.get('requestId' as any) ||
      c.req.header('cf-ray') ||
      c.req.header('x-request-id') ||
      undefined;

    const authCtx = (c.get as any)('authContext');
    const orgId = authCtx?.organization?.organizationId || null;
    const userId = authCtx?.user?.id || null;

    if (err instanceof AuthError) {
      const status = authErrorStatus(err);
      logOperation({
        level: 'warn',
        request_id: requestId,
        operation: `HTTP_${c.req.method}_${c.req.path}`,
        result: 'FAILURE',
        status_code: status,
        organization_id: orgId,
        user_id: userId,
        error: { code: err.code, message: err.message },
      });
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }

    if (isDomainError(err)) {
      const status = domainErrorStatus(err);
      logOperation({
        level: status >= 500 ? 'error' : 'warn',
        request_id: requestId,
        operation: `HTTP_${c.req.method}_${c.req.path}`,
        result: 'FAILURE',
        status_code: status,
        organization_id: orgId,
        user_id: userId,
        error: { code: err.code, message: err.message },
      });
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }

    logOperation({
      level: 'error',
      request_id: requestId,
      operation: `HTTP_${c.req.method}_${c.req.path}`,
      result: 'FAILURE',
      status_code: 500,
      organization_id: orgId,
      user_id: userId,
      error: {
        code: 'INTERNAL_ERROR',
        message: err?.message || 'Internal server error',
      },
    });

    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
  });

  // GET /health — Light probe (Zero DB calls)
  app.get('/health', (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(
      {
        status: 'ok',
        service: 'stiffin-promotor-api',
        timestamp: new Date().toISOString(),
      },
      200
    );
  });

  // GET /health/db — Full probe (SELECT NOW() via Hyperdrive -> Neon)
  app.get('/health/db', async (c) => {
    c.header('Cache-Control', 'no-store');
    try {
      const { serverTime } = await probeDb(c.env);
      return c.json(
        {
          status: 'ok',
          db: 'connected',
          service: 'stiffin-promotor-api',
          timestamp: new Date().toISOString(),
          serverTime,
        },
        200
      );
    } catch (err: any) {
      console.error('[DB Health Probe Failed]', {
        code: 'DB_HEALTH_PROBE_FAILED',
        timestamp: new Date().toISOString(),
      });

      return c.json(
        {
          status: 'error',
          db: 'disconnected',
          service: 'stiffin-promotor-api',
          timestamp: new Date().toISOString(),
        },
        503
      );
    }
  });

  // ---- B2 Phase C auth & CORS surface ----
  app.use(
    '/api/*',
    cors({
      origin: (origin, c) => {
        if (!origin) return null;
        const env = c.env;
        const allowed = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'https://promotor-class-staging.moxsenna.workers.dev',
          'https://promotor-flow-staging.moxsenna.workers.dev',
          'https://stiffin-promotor-class.moxsenna.workers.dev',
          'https://stiffin-promotor-flow.moxsenna.workers.dev',
          ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
        ];
        return allowed.includes(origin) ? origin : null;
      },
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Set-Cookie'],
    })
  );
  app.use('/api/*', authLifecycle);
  app.all('/api/auth/*', (c) => c.get('auth').handler(c.req.raw));

  // GET /api/me — authenticated context endpoint
  app.use('/api/me', sessionMiddleware);
  app.get('/api/me', (c) => {
    c.header('Cache-Control', 'no-store');
    const ctx = c.get('authContext');
    if (!ctx) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }
    const org =
      ctx.organizationDetail && ctx.organization
        ? { id: ctx.organization.organizationId, name: ctx.organizationDetail.name, slug: ctx.organizationDetail.slug }
        : null;
    const membership = ctx.actor ? { id: ctx.actor.membershipId, role: ctx.actor.role } : null;
    const entitlements = ctx.entitlements
      ? { promotorClass: ctx.entitlements.promotorClass, promotorFlow: ctx.entitlements.promotorFlow }
      : null;
    return c.json(
      {
        user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email },
        organization: org,
        membership,
        entitlements,
      },
      200
    );
  });

  // ==========================================
  // B3 Public Content API (Read-only, Zero Auth)
  // ==========================================
  app.get('/api/v1/public/workspaces/:workspaceSlug', async (c) => {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300');
    const db = c.get('db');
    const publicRepo = createPublicContentRepository(db);
    const publicService = createPublicContentService(publicRepo);
    const workspaceSlug = c.req.param('workspaceSlug');
    const profile = await publicService.getPublicWorkspaceProfile(workspaceSlug);
    return c.json({ profile }, 200);
  });

  // Public Catalog (canonical: /programs, alias: /catalog for UI route parity)
  const handlePublicCatalog = async (c: any) => {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300');
    const db = c.get('db');
    const publicRepo = createPublicContentRepository(db);
    const publicService = createPublicContentService(publicRepo);
    const workspaceSlug = c.req.param('workspaceSlug');
    const catalog = await publicService.getPublicProgramCatalog(workspaceSlug);
    return c.json({ catalog }, 200);
  };

  app.get('/api/v1/public/workspaces/:workspaceSlug/programs', handlePublicCatalog);
  app.get('/api/v1/public/workspaces/:workspaceSlug/catalog', handlePublicCatalog);

  app.get('/api/v1/public/workspaces/:workspaceSlug/programs/:programSlug', async (c) => {
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300');
    const db = c.get('db');
    const publicRepo = createPublicContentRepository(db);
    const publicService = createPublicContentService(publicRepo);
    const workspaceSlug = c.req.param('workspaceSlug');
    const programSlug = c.req.param('programSlug');
    const detail = await publicService.getPublicProgramDetail(workspaceSlug, programSlug);
    return c.json({ detail }, 200);
  });

  // ==========================================
  // B6.1 Public Booking & Slots API (Zero Auth)
  // ==========================================
  const handlePublicSlots = async (c: any) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const slug = c.req.param('slug') || c.req.param('workspaceSlug');
    const parsedQuery = PublicSlotsQuerySchema.safeParse({
      serviceId: c.req.query('serviceId'),
      from: c.req.query('from'),
      to: c.req.query('to'),
    });
    if (!parsedQuery.success) {
      const details = parsedQuery.error.issues.map((i) => i.message).join(', ');
      throw new DomainError('VALIDATION_ERROR', `Invalid query parameters: ${details}`);
    }
    const service = createAvailabilityService(db);
    const result = await service.getPublicAvailableSlots({
      slug,
      serviceId: parsedQuery.data.serviceId,
      rangeFrom: new Date(parsedQuery.data.from),
      rangeTo: new Date(parsedQuery.data.to),
    });
    return c.json(result, 200);
  };

  app.get('/api/v1/public/:slug/slots', handlePublicSlots);
  app.get('/api/v1/public/workspaces/:workspaceSlug/slots', handlePublicSlots);

  const handlePublicBookings = async (c: any) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const slug = c.req.param('slug') || c.req.param('workspaceSlug');
    const raw = await c.req.json().catch(() => ({}));
    const parsedBody = CreatePublicBookingRequestSchema.safeParse(raw);
    if (!parsedBody.success) {
      const details = parsedBody.error.issues.map((i) => i.message).join(', ');
      throw new DomainError('VALIDATION_ERROR', `Invalid booking payload: ${details}`);
    }
    const service = createPublicBookingService(db);
    const result = await service.createPublicBooking({
      slug,
      serviceId: parsedBody.data.serviceId,
      startAt: parsedBody.data.startAt,
      name: parsedBody.data.name,
      phoneRaw: parsedBody.data.phoneRaw,
      email: parsedBody.data.email,
      notes: parsedBody.data.notes,
      locationType: parsedBody.data.locationType,
      locationText: parsedBody.data.locationText,
    });
    return c.json(result, 201);
  };

  app.post('/api/v1/public/:slug/bookings', handlePublicBookings);
  app.post('/api/v1/public/workspaces/:workspaceSlug/bookings', handlePublicBookings);

  // ==========================================
  // B4 Public Registration & Learner Access API (Zero Auth)
  // ==========================================
  const handlePublicRegistration = async (c: any) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const slug = c.req.param('slug') || c.req.param('workspaceSlug');
    const programSlug = c.req.param('programSlug');
    const raw = await c.req.json().catch(() => ({}));
    const parsed = PublicRegisterLearnerRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message).join(', ');
      throw new DomainError('VALIDATION_ERROR', `Payload pendaftaran tidak valid: ${details}`);
    }
    const service = createEnrollmentService(db);
    const result = await service.registerPublicLearner({
      slug,
      programSlug,
      name: parsed.data.name,
      phoneRaw: parsed.data.phoneRaw,
      email: parsed.data.email,
    });
    return c.json(result, 201);
  };

  app.post('/api/v1/public/:slug/programs/:programSlug/register', handlePublicRegistration);
  app.post('/api/v1/public/workspaces/:workspaceSlug/programs/:programSlug/register', handlePublicRegistration);

  // ==========================================
  // Learner Auth & Session Redemption (§4, §5)
  // ==========================================
  const handleRedeemToken = async (c: any) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const raw = await c.req.json().catch(() => ({}));
    const rawToken = raw?.token || raw?.accessToken;
    if (!rawToken || typeof rawToken !== 'string') {
      throw new DomainError('VALIDATION_ERROR', 'Token akses learner wajib diisi');
    }

    const sessionService = createLearnerSessionService(db);
    const result = await sessionService.redeemToken(rawToken);

    setCookie(c, 'promotor_learner_session', result.sessionToken, {
      httpOnly: true,
      secure: c.env?.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 3600, // 30 days
    });

    return c.json({
      contactId: result.contactId,
      organizationId: result.organizationId,
      expiresAt: result.session.expiresAt.toISOString(),
    }, 200);
  };

  app.post('/api/v1/public/learner/redeem-token', handleRedeemToken);
  app.post('/api/v1/learner/auth/redeem', handleRedeemToken);

  app.post('/api/v1/learner/auth/logout', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const cookieToken = getCookie(c, 'promotor_learner_session');
    if (cookieToken) {
      const sessionService = createLearnerSessionService(db);
      const val = await sessionService.validateSession(cookieToken);
      if (val.session) {
        await sessionService.revokeSession(val.session.id);
      }
    }
    deleteCookie(c, 'promotor_learner_session', { path: '/' });
    return c.json({ success: true }, 200);
  });

  // ==========================================
  // Learner Protected Learning API (§6, §7)
  // Protected by learnerAuthMiddleware
  // ==========================================
  app.use('/api/v1/learner/me', learnerAuthMiddleware);
  app.use('/api/v1/learner/me/*', learnerAuthMiddleware);
  app.use('/api/v1/learner/enrollments/*', learnerAuthMiddleware);

  app.get('/api/v1/learner/me/enrollments', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const learnerCtx = c.get('learnerContext' as any) as any;
    const service = createEnrollmentService(db);
    const programs = await service.getLearnerPrograms(learnerCtx.contactId, learnerCtx.organizationId);
    return c.json({ programs }, 200);
  });

  app.get('/api/v1/learner/enrollments/:enrollmentId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const enrollmentId = c.req.param('enrollmentId');
    const learnerCtx = c.get('learnerContext' as any) as any;

    const learningService = createLearningEngineService(db);
    const details = await learningService.getEnrollmentFullDetails(
      learnerCtx.organizationId,
      enrollmentId,
      learnerCtx.contactId
    );
    return c.json(details, 200);
  });

  app.post('/api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/start', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const enrollmentId = c.req.param('enrollmentId');
    const lessonId = c.req.param('lessonId');
    const learnerCtx = c.get('learnerContext' as any) as any;

    const learningService = createLearningEngineService(db);
    const result = await learningService.startLesson({
      organizationId: learnerCtx.organizationId,
      enrollmentId,
      lessonId,
      authenticatedContactId: learnerCtx.contactId,
    });

    return c.json({
      enrollmentId: result.enrollment.id,
      lessonId,
      status: result.enrollment.status,
    }, 200);
  });

  app.post('/api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/complete', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const enrollmentId = c.req.param('enrollmentId');
    const lessonId = c.req.param('lessonId');
    const learnerCtx = c.get('learnerContext' as any) as any;

    const learningService = createLearningEngineService(db);
    const result = await learningService.completeLesson({
      organizationId: learnerCtx.organizationId,
      enrollmentId,
      lessonId,
      authenticatedContactId: learnerCtx.contactId,
    });

    return c.json({
      enrollmentId: result.enrollment.id,
      lessonId,
      isCompleted: result.progress.isCompleted,
      progressPercent: result.enrollment.progressPercent,
      learningStatus: result.enrollment.learningStatus,
      intentScore: result.enrollment.intentScore,
      intentLabel: result.enrollment.intentLabel,
      completedAt: result.progress.completedAt ? new Date(result.progress.completedAt).toISOString() : null,
    }, 200);
  });

  app.post('/api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/reflection', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const enrollmentId = c.req.param('enrollmentId');
    const lessonId = c.req.param('lessonId');
    const learnerCtx = c.get('learnerContext' as any) as any;
    const raw = await c.req.json().catch(() => ({}));
    const parsed = SubmitReflectionRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message).join(', ');
      throw new DomainError('VALIDATION_ERROR', `Payload refleksi tidak valid: ${details}`);
    }

    const learningService = createLearningEngineService(db);
    const result = await learningService.submitReflection({
      organizationId: learnerCtx.organizationId,
      enrollmentId,
      lessonId,
      responseText: parsed.data.responseText,
      selectedOptions: parsed.data.selectedOptions as string[] | undefined,
      authenticatedContactId: learnerCtx.contactId,
    });

    return c.json({
      enrollmentId: result.enrollment.id,
      lessonId,
      responseText: result.reflection.responseText,
      selectedOptions: result.reflection.selectedOptions,
      submittedAt: result.reflection.submittedAt ? new Date(result.reflection.submittedAt).toISOString() : new Date().toISOString(),
      progressPercent: result.enrollment.progressPercent,
      learningStatus: result.enrollment.learningStatus,
      intentScore: result.enrollment.intentScore,
      intentLabel: result.enrollment.intentLabel,
    }, 200);
  });

  app.post('/api/v1/learner/enrollments/:enrollmentId/lessons/:lessonId/cta-click', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const enrollmentId = c.req.param('enrollmentId');
    const lessonId = c.req.param('lessonId');
    const learnerCtx = c.get('learnerContext' as any) as any;
    const raw = await c.req.json().catch(() => ({}));

    const learningService = createLearningEngineService(db);
    const result = await learningService.recordCtaClick({
      organizationId: learnerCtx.organizationId,
      enrollmentId,
      lessonId,
      ctaLabel: raw?.ctaLabel,
      authenticatedContactId: learnerCtx.contactId,
    });

    return c.json({
      enrollmentId: result.enrollment.id,
      lessonId,
      progressPercent: result.enrollment.progressPercent,
      intentScore: result.enrollment.intentScore,
      intentLabel: result.enrollment.intentLabel,
    }, 200);
  });

  app.post('/api/v1/learner/enrollments/:enrollmentId/events', async (c) => {
    c.header('Cache-Control', 'no-store');
    const db = c.get('db');
    const enrollmentId = c.req.param('enrollmentId');
    const learnerCtx = c.get('learnerContext' as any) as any;
    const raw = await c.req.json().catch(() => ({}));
    const parsed = RecordLearningEventRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message).join(', ');
      throw new DomainError('VALIDATION_ERROR', `Payload event belajar tidak valid: ${details}`);
    }

    const learningService = createLearningEngineService(db);
    const result = await learningService.recordLearningEvent({
      organizationId: learnerCtx.organizationId,
      enrollmentId,
      eventType: parsed.data.eventType,
      payload: parsed.data.payload,
      authenticatedContactId: learnerCtx.contactId,
    });

    return c.json({
      enrollmentId: result.enrollment.id,
      progressPercent: result.enrollment.progressPercent,
      intentScore: result.enrollment.intentScore,
      intentLabel: result.enrollment.intentLabel,
    }, 200);
  });

  // ==========================================
  // B3 Admin Content API (Auth + Entitlement Gated)
  // ==========================================
  app.use('/api/v1/programs', sessionMiddleware, requireOrganization(), requireEntitlement('promotorClass'), requireRole(['owner', 'admin']));
  app.use('/api/v1/programs/*', sessionMiddleware, requireOrganization(), requireEntitlement('promotorClass'), requireRole(['owner', 'admin']));
  app.use('/api/v1/storefront/*', sessionMiddleware, requireOrganization(), requireEntitlement('promotorClass'), requireRole(['owner', 'admin']));

  function getServices(c: any) {
    const db = c.get('db');
    const programRepo = createProgramRepository(db);
    const profileRepo = createWorkspaceProfileRepository(db);
    const service = createProgramService(programRepo, profileRepo);
    const authCtx = c.get('authContext')!;
    const ctx = { organizationId: authCtx.organization!.organizationId };
    return { service, ctx };
  }

  // Programs List & Create
  app.get('/api/v1/programs', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const includeArchived = c.req.query('includeArchived') === 'true';
    const programsList = await service.listPrograms(ctx, { includeArchived });
    return c.json({ programs: programsList }, 200);
  });

  app.post('/api/v1/programs', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const body = await c.req.json();
    const created = await service.createProgram(ctx, body);
    return c.json({ program: created }, 201);
  });

  // Program Detail & Patch
  app.get('/api/v1/programs/:programId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const program = await service.getProgram(ctx, programId);
    return c.json({ program }, 200);
  });

  app.patch('/api/v1/programs/:programId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const body = await c.req.json();
    const updated = await service.updateProgram(ctx, programId, body);
    return c.json({ program: updated }, 200);
  });

  app.delete('/api/v1/programs/:programId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    await service.deleteProgram(ctx, programId);
    return c.json({ success: true }, 200);
  });

  // Program Lifecycle Transitions
  app.post('/api/v1/programs/:programId/publish', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const updated = await service.publishProgram(ctx, programId);
    return c.json({ program: updated }, 200);
  });

  app.post('/api/v1/programs/:programId/unpublish', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const updated = await service.unpublishProgram(ctx, programId);
    return c.json({ program: updated }, 200);
  });

  app.post('/api/v1/programs/:programId/archive', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const updated = await service.archiveProgram(ctx, programId);
    return c.json({ program: updated }, 200);
  });

  app.post('/api/v1/programs/:programId/restore', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const updated = await service.restoreProgram(ctx, programId);
    return c.json({ program: updated }, 200);
  });

  // Modules Operations
  app.post('/api/v1/programs/:programId/modules', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const body = await c.req.json();
    const updated = await service.addModule(ctx, programId, body.title);
    return c.json({ program: updated }, 201);
  });

  app.patch('/api/v1/programs/:programId/modules/:moduleId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const moduleId = c.req.param('moduleId');
    const body = await c.req.json();
    const updated = await service.updateModule(ctx, programId, moduleId, body.title);
    return c.json({ program: updated }, 200);
  });

  app.delete('/api/v1/programs/:programId/modules/:moduleId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const moduleId = c.req.param('moduleId');
    const updated = await service.deleteModule(ctx, programId, moduleId);
    return c.json({ program: updated }, 200);
  });

  app.post('/api/v1/programs/:programId/modules/reorder', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const body = await c.req.json();
    const updated = await service.reorderModules(ctx, programId, body.orderedModuleIds);
    return c.json({ program: updated }, 200);
  });

  // Lessons Operations
  app.post('/api/v1/programs/:programId/modules/:moduleId/lessons', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const moduleId = c.req.param('moduleId');
    const body = await c.req.json();
    const updated = await service.addLesson(ctx, programId, moduleId, body.title, body.videoUrl);
    return c.json({ program: updated }, 201);
  });

  app.patch('/api/v1/programs/:programId/modules/:moduleId/lessons/:lessonId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const moduleId = c.req.param('moduleId');
    const lessonId = c.req.param('lessonId');
    const body = await c.req.json();
    const updated = await service.saveLesson(ctx, programId, moduleId, lessonId, body);
    return c.json({ program: updated }, 200);
  });

  app.delete('/api/v1/programs/:programId/modules/:moduleId/lessons/:lessonId', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const moduleId = c.req.param('moduleId');
    const lessonId = c.req.param('lessonId');
    const updated = await service.deleteLesson(ctx, programId, moduleId, lessonId);
    return c.json({ program: updated }, 200);
  });

  app.post('/api/v1/programs/:programId/modules/:moduleId/lessons/reorder', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const moduleId = c.req.param('moduleId');
    const body = await c.req.json();
    const updated = await service.reorderLessons(ctx, programId, moduleId, body.orderedLessonIds);
    return c.json({ program: updated }, 200);
  });

  // Presentation Get & Update
  app.get('/api/v1/programs/:programId/presentation', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const presentation = await service.getProgramPresentation(ctx, programId);
    return c.json({ presentation }, 200);
  });

  app.put('/api/v1/programs/:programId/presentation', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const programId = c.req.param('programId');
    const body = await c.req.json();
    const presentation = await service.updateProgramPresentation(ctx, programId, body);
    return c.json({ presentation }, 200);
  });

  // Workspace Profile Get & Update
  app.get('/api/v1/storefront/profile', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const profile = await service.getWorkspaceProfile(ctx);
    return c.json({ profile }, 200);
  });

  app.put('/api/v1/storefront/profile', async (c) => {
    c.header('Cache-Control', 'no-store');
    const { service, ctx } = getServices(c);
    const body = await c.req.json();
    const profile = await service.updateWorkspaceProfile(ctx, body);
    return c.json({ profile }, 200);
  });

  // ==========================================
  // B6 PromotorFlow Admin API (Auth + Entitlement Gated)
  // ==========================================
  app.use(
    '/api/v1/flow',
    sessionMiddleware,
    requireOrganization(),
    requireEntitlement('promotorFlow'),
    requireRole(['owner', 'admin'])
  );
  app.use(
    '/api/v1/flow/*',
    sessionMiddleware,
    requireOrganization(),
    requireEntitlement('promotorFlow'),
    requireRole(['owner', 'admin'])
  );

  registerFlowRoutes(app);

  // ==========================================
  // B4 PromotorClass Admin API (Auth + Entitlement Gated)
  // ==========================================
  app.use(
    '/api/v1/class',
    sessionMiddleware,
    requireOrganization(),
    requireEntitlement('promotorClass'),
    requireRole(['owner', 'admin'])
  );
  app.use(
    '/api/v1/class/*',
    sessionMiddleware,
    requireOrganization(),
    requireEntitlement('promotorClass'),
    requireRole(['owner', 'admin'])
  );

  registerClassRoutes(app);

  return app;
}

