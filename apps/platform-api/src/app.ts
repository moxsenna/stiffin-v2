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
import { createProgramService } from './services/program-service';
import { createPublicContentService } from './services/public-content-service';

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

  // Global Error Handler: maps AuthError & DomainError -> clean JSON envelope
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      const status = authErrorStatus(err);
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }
    if (isDomainError(err)) {
      const status = domainErrorStatus(err);
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }
    console.error('[APP_ERROR]', { code: 'APP_ERROR', timestamp: new Date().toISOString() });
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

  // ---- B2 Phase C auth surface ----
  app.use('/api/*', authLifecycle);
  app.use(
    '/api/auth/*',
    cors({
      origin: (origin, c) => {
        const env = c.env;
        const allowed = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
        ];
        return origin && allowed.includes(origin) ? origin : '';
      },
      credentials: true,
    })
  );
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

  return app;
}
