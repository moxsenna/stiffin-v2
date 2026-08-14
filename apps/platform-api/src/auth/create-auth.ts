import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authSchema, MODEL_NAMES, FIELD_MAPS } from './schema';
import type { Env } from '../env';

export interface CreateAuthEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  /** Test-only: disable the durable rate limiter for repeated integration sign-ins. */
  BETTER_AUTH_RATE_LIMIT_DISABLED?: string;
}

/**
 * Pure factory: builds a Better Auth instance for the current request-scoped
 * Drizzle db. The returned instance is request-scoped; no module-global
 * connected client or DB-bound auth instance is created.
 */
export function createAuth(db: NodePgDatabase, env: CreateAuthEnv) {
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
    rateLimit: env.BETTER_AUTH_RATE_LIMIT_DISABLED
      ? { enabled: false } // test-only — production always uses durable database storage
      : { storage: 'database', modelName: MODEL_NAMES.rateLimit },
    advanced: {
      database: { generateId: 'uuid' },
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
