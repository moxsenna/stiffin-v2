import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { organization } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authSchema, MODEL_NAMES, FIELD_MAPS } from './schema';
import { users } from '../db/schema';
import type { Env } from '../env';

export interface CreateAuthEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
}

/** Test-only escape hatch — passed directly by tests, NEVER read from env. */
export interface CreateAuthOptions {
  disableRateLimit?: boolean;
}

const REQUIRED_ENV: Array<keyof CreateAuthEnv> = ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'];

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

/**
 * Pure factory: builds a Better Auth instance for the current request-scoped
 * Drizzle db. The returned instance is request-scoped; no module-global
 * connected client or DB-bound auth instance is created.
 *
 * Fail-closed: missing required auth env (BETTER_AUTH_SECRET / BETTER_AUTH_URL)
 * throws AuthConfigError before any auth surface is built.
 */
export function createAuth(db: NodePgDatabase, env: CreateAuthEnv, options?: CreateAuthOptions) {
  const missing = REQUIRED_ENV.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new AuthConfigError(`Missing required auth configuration: ${missing.join(', ')}`);
  }

  const trustedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ];

  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // public self-signup OFF — registration is B4
    },
    user: {
      modelName: MODEL_NAMES.user,
      fields: { emailVerified: 'email_verified' },
      // Explicit product policy: BA hard-delete is OFF; Shared Core soft-delete is canonical.
      deleteUser: { enabled: false },
    },
    session: {
      modelName: MODEL_NAMES.session,
      fields: FIELD_MAPS.session,
    },
    account: {
      modelName: MODEL_NAMES.account,
      fields: FIELD_MAPS.account,
    },
    verification: {
      modelName: MODEL_NAMES.verification,
      fields: FIELD_MAPS.verification,
    },
    rateLimit: options?.disableRateLimit
      ? { enabled: false } // test-only — never activated through Worker env
      : { storage: 'database', modelName: MODEL_NAMES.rateLimit },
    advanced: {
      database: { generateId: 'uuid' },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            // Frozen soft-delete policy: a soft-deleted canonical user must not
            // create a new authenticated session. Query the canonical users row
            // via the request-scoped db (never through BA user additionalFields).
            const rows = await db
              .select({ deletedAt: users.deletedAt })
              .from(users)
              .where(eq(users.id, session.userId))
              .limit(1);
            if (rows.length === 0 || rows[0].deletedAt !== null) {
              return false; // abort session creation
            }
            return { data: session };
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Frozen soft-delete policy: a soft-deleted canonical user must not
        // sign in. Respond with generic invalid-credentials semantics (no user
        // enumeration) by blocking before the endpoint runs.
        if (ctx.path !== '/sign-in/email') return;
        const email = (ctx.body as { email?: string } | undefined)?.email;
        if (!email) return;
        const rows = await db
          .select({ deletedAt: users.deletedAt })
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);
        if (rows.length > 0 && rows[0].deletedAt !== null) {
          return ctx.json(
            { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
            { status: 401 }
          );
        }
      }),
    },
    plugins: [
      organization({
        teams: { enabled: false },
        allowUserToCreateOrganization: false,
        disableOrganizationDeletion: true,
        schema: {
          organization: { modelName: MODEL_NAMES.organization },
          member: { modelName: MODEL_NAMES.member },
          invitation: { modelName: MODEL_NAMES.invitation },
        },
      }),
    ],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
export type { Env };
