import { createMiddleware } from 'hono/factory';
import { Client } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { sessions, users } from '../db/schema';
import { createAuth, AuthConfigError, CreateAuthEnv } from './create-auth';
import type { AuthInstance } from './create-auth';
import { resolveAuthContext, createEntitlementsForOrg } from './context-resolver';
import { AuthError, authErrorStatus } from './errors';
import type { AuthContext } from './types';

export type AuthVariables = {
  db: NodePgDatabase;
  auth: AuthInstance;
  authContext: AuthContext | null;
};

export type AuthBindings = CreateAuthEnv & { HYPERDRIVE?: { connectionString: string } };

let schemaMigrationEnsured = false;

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
      if (!schemaMigrationEnsured) {
        try {
          await client.query(`
            ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "bank_transfer_enabled" boolean DEFAULT false NOT NULL;
            ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "whatsapp_enabled" boolean DEFAULT false NOT NULL;

            CREATE TABLE IF NOT EXISTS "organization_bank_accounts" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "organization_id" uuid NOT NULL,
              "bank_name" text NOT NULL,
              "account_number" text NOT NULL,
              "account_holder_name" text NOT NULL,
              "is_active" boolean DEFAULT true NOT NULL,
              "sort_order" integer DEFAULT 0 NOT NULL,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "organization_payment_settings" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "organization_id" uuid NOT NULL,
              "sales_whatsapp_number" text,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            );

            CREATE TABLE IF NOT EXISTS "program_purchase_requests" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "organization_id" uuid NOT NULL,
              "program_id" uuid NOT NULL,
              "contact_id" uuid NOT NULL,
              "purchase_reference" text NOT NULL,
              "purchase_method" text NOT NULL,
              "status" text DEFAULT 'PENDING' NOT NULL,
              "price_amount" integer DEFAULT 0 NOT NULL,
              "currency" text DEFAULT 'IDR' NOT NULL,
              "buyer_name" text NOT NULL,
              "buyer_phone" text NOT NULL,
              "buyer_note" text,
              "bank_account_id" uuid,
              "approved_at" timestamp with time zone,
              "approved_by_user_id" uuid,
              "rejected_at" timestamp with time zone,
              "rejected_by_user_id" uuid,
              "rejection_reason" text,
              "enrollment_id" uuid,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            );
          `);
          schemaMigrationEnsured = true;
        } catch (mErr: any) {
          console.error('[schemaMigrationEnsured error]:', mErr?.message || mErr);
        }
      }
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

/**
 * Session resolution middleware: resolves the Better Auth session for the
 * request and builds the AuthContext. Sets authContext to null when
 * unauthenticated; maps AuthError to 401/403 per frozen semantics.
 */
export const sessionMiddleware = createMiddleware<{ Bindings: AuthBindings; Variables: AuthVariables }>(
  async (c, next) => {
    const auth = c.get('auth');
    let session = await auth.api.getSession({ headers: c.req.raw.headers });

    // Fallback: check Authorization: Bearer <token> directly in database
    if (!session?.user || !session.session) {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token) {
          const db = c.get('db');
          const [sessionRow] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.token, token))
            .limit(1);
          if (sessionRow && new Date(sessionRow.expiresAt) > new Date()) {
            const [userRow] = await db
              .select()
              .from(users)
              .where(eq(users.id, sessionRow.userId))
              .limit(1);
            if (userRow && userRow.deletedAt === null) {
              session = {
                user: userRow as any,
                session: sessionRow as any,
              };
            }
          }
        }
      }
    }

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
