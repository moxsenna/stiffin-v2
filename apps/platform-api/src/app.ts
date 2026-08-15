import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Env } from './env';
import { executeDbHealthProbe } from './db/client';
import { authLifecycle, sessionMiddleware } from './auth/session-middleware';
import { requireOrganization, requireEntitlement, requireRole } from './auth/authorization';
import { AuthError, authErrorStatus } from './auth/errors';
import type { AuthContext } from './auth/types';
import type { AuthInstance } from './auth/create-auth';

export interface AppDependencies {
  dbHealthProbe?: (env: Env) => Promise<{ serverTime: string }>;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { db: NodePgDatabase; auth: AuthInstance; authContext: AuthContext | null };
};

export function createApp(deps?: AppDependencies) {
  const app = new Hono<AppEnv>();
  const probeDb = deps?.dbHealthProbe ?? executeDbHealthProbe;

  // Phase D: map AuthError -> HTTP status (401/403/500) for middleware-thrown errors.
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      const status = authErrorStatus(err);
      return c.json({ error: { code: err.code, message: err.message } }, status);
    }
    console.error('[APP_ERROR]', { code: 'APP_ERROR', timestamp: new Date().toISOString() });
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
  });

  // GET /health — Light probe (Zero DB calls)
  app.get('/health', (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json({
      status: 'ok',
      service: 'stiffin-promotor-api',
      timestamp: new Date().toISOString(),
    }, 200);
  });

  // GET /health/db — Full probe (SELECT NOW() via Hyperdrive -> Neon)
  app.get('/health/db', async (c) => {
    c.header('Cache-Control', 'no-store');
    try {
      const { serverTime } = await probeDb(c.env);
      return c.json({
        status: 'ok',
        db: 'connected',
        service: 'stiffin-promotor-api',
        timestamp: new Date().toISOString(),
        serverTime,
      }, 200);
    } catch (err: any) {
      // Log sanitized server-side error trace (zero raw pg errors/hostnames leaked)
      console.error('[DB Health Probe Failed]', {
        code: 'DB_HEALTH_PROBE_FAILED',
        timestamp: new Date().toISOString(),
      });

      return c.json({
        status: 'error',
        db: 'disconnected',
        service: 'stiffin-promotor-api',
        timestamp: new Date().toISOString(),
      }, 503);
    }
  });

  // ---- B2 Phase C auth surface ----
  // The auth lifecycle opens ONE request-scoped pg Client per request and
  // mounts Better Auth on /api/auth/*. Domain routes below reuse the same
  // request-scoped db/auth via middleware.

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

  // GET /api/me — authenticated context endpoint proving the chain.
  app.use('/api/me', sessionMiddleware);
  app.get('/api/me', (c) => {
    c.header('Cache-Control', 'no-store');
    const ctx = c.get('authContext');
    if (!ctx) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }
    const org = ctx.organizationDetail && ctx.organization
      ? { id: ctx.organization.organizationId, name: ctx.organizationDetail.name, slug: ctx.organizationDetail.slug }
      : null;
    const membership = ctx.actor ? { id: ctx.actor.membershipId, role: ctx.actor.role } : null;
    const entitlements = ctx.entitlements
      ? { promotorClass: ctx.entitlements.promotorClass, promotorFlow: ctx.entitlements.promotorFlow }
      : null;
    return c.json({
      user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email },
      organization: org,
      membership,
      entitlements,
    }, 200);
  });

  // ---- Phase D: app-owned authorization/diagnostic seam ----
  // Safe app-owned routes proving the authorization chain + entitlement/role
  // gates. Not product APIs; used by tests and future workspace discovery.
  app.use('/api/diag/*', sessionMiddleware);

  app.get('/api/diag/organization', requireOrganization(), requireRole(['owner', 'admin', 'member']), (c) => {
    const ctx = c.get('authContext');
    return c.json({
      organizationId: ctx!.organization!.organizationId,
      role: ctx!.actor!.role,
      membershipId: ctx!.actor!.membershipId,
    }, 200);
  });

  app.get('/api/diag/class', requireOrganization(), requireEntitlement('promotorClass'), (c) => {
    return c.json({ ok: true, product: 'promotorClass' }, 200);
  });

  app.get('/api/diag/flow', requireOrganization(), requireEntitlement('promotorFlow'), (c) => {
    return c.json({ ok: true, product: 'promotorFlow' }, 200);
  });

  return app;
}
