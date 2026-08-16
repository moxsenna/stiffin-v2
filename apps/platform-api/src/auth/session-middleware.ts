import { createMiddleware } from 'hono/factory';
import { Client } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createAuth, AuthConfigError, CreateAuthEnv } from './create-auth';
import type { AuthInstance } from './create-auth';
import { resolveAuthContext, createEntitlementsForOrg } from './context-resolver';
import { AuthError } from './errors';
import type { AuthContext } from './types';

export type AuthVariables = {
  db: NodePgDatabase;
  auth: AuthInstance;
  authContext: AuthContext | null;
};

export type AuthBindings = CreateAuthEnv & { HYPERDRIVE?: { connectionString: string } };

/**
 * Request-scoped lifecycle middleware: creates the pg Client from the
 * Hyperdrive binding, connects, builds the Drizzle db and a fresh Better Auth
 * instance for this request, then closes the client in finally.
 *
 * No module-global connected client / Pool / DB-bound auth instance.
 */
export const authLifecycle = createMiddleware<{ Bindings: AuthBindings; Variables: AuthVariables }>(
  async (c, next) => {
    const connectionString = c.env.HYPERDRIVE?.connectionString;
    if (!connectionString) {
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Database binding is not configured' } }, 503);
    }
    const client = new Client({ connectionString });
    await client.connect();
    try {
      const db = drizzle(client);
      // Fail-closed: missing required auth config yields a sanitized 503 with
      // no raw secret/config leakage. The test-only rate-limit seam is never
      // read from env — production always uses durable database rate limiting.
      const auth = createAuth(db, c.env);
      c.set('db', db);
      c.set('auth', auth);
      await next();
    } catch (err) {
      if (err instanceof AuthConfigError) {
        return c.json({ error: { code: 'AUTH_CONFIG_ERROR', message: 'Authentication is not configured' } }, 503);
      }
      console.error('[AUTH_LIFECYCLE]', { code: 'AUTH_LIFECYCLE_FAILED', timestamp: new Date().toISOString() });
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Authentication service unavailable' } }, 500);
    } finally {
      await client.end();
    }
  }
);

/** Maps an AuthError to the correct HTTP status (frozen semantics). */
function authErrorStatus(err: AuthError): 401 | 403 | 500 {
  const code = String(err.code);
  if (code === 'ORG_CONTEXT_INVALID' || code === 'ORG_CONTEXT_REQUIRED') return 403;
  if (code === 'UNAUTHORIZED') return 401;
  return 500;
}

/**
 * Session resolution middleware: resolves the Better Auth session for the
 * request and builds the AuthContext. Sets authContext to null when
 * unauthenticated; maps AuthError to 401/403 per frozen semantics.
 */
export const sessionMiddleware = createMiddleware<{ Bindings: AuthBindings; Variables: AuthVariables }>(
  async (c, next) => {
    const auth = c.get('auth');
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user || !session.session) {
      c.set('authContext', null);
      await next();
      return;
    }

    const db = c.get('db');
    try {
      const authContext = await resolveAuthContext(
        db,
        {
          userId: session.user.id,
          sessionToken: session.session.token,
          expiresAt: new Date(session.session.expiresAt),
          activeOrganizationId: session.session.activeOrganizationId ?? null,
        },
        createEntitlementsForOrg(db)
      );
      c.set('authContext', authContext);
    } catch (err) {
      if (err instanceof AuthError) {
        return c.json({ error: { code: err.code, message: err.message } }, authErrorStatus(err));
      }
      throw err;
    }
    await next();
  }
);

export type { AuthContext };
