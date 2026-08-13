import { Hono } from 'hono';
import { Env } from './env';
import { executeDbHealthProbe } from './db/client';

export interface AppDependencies {
  dbHealthProbe?: (env: Env) => Promise<{ serverTime: string }>;
}

export function createApp(deps?: AppDependencies) {
  const app = new Hono<{ Bindings: Env }>();
  const probeDb = deps?.dbHealthProbe ?? executeDbHealthProbe;

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
      // Log sanitized server-side error trace
      console.error('[DB Health Probe Failed]:', err?.message || 'Unknown database error');

      return c.json({
        status: 'error',
        db: 'disconnected',
        service: 'stiffin-promotor-api',
        timestamp: new Date().toISOString(),
      }, 503);
    }
  });

  return app;
}
