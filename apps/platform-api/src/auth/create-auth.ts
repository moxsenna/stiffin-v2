import { betterAuth } from 'better-auth';
import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { organization } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authSchema, MODEL_NAMES, FIELD_MAPS } from './schema';
import { users, organizations, organizationMembers } from '../db/schema';
import { EMAIL_PASSWORD_POLICY } from './policy';
import { isCanonicalUuid } from './roles';
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
      // Frozen shared policy — same values the trusted provisioning path enforces.
      minPasswordLength: EMAIL_PASSWORD_POLICY.minPasswordLength,
      maxPasswordLength: EMAIL_PASSWORD_POLICY.maxPasswordLength,
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
      : { enabled: true, storage: 'database', modelName: MODEL_NAMES.rateLimit },
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
        // ---- Frozen soft-delete policy: soft-deleted user must not sign in ----
        if (ctx.path === '/sign-in/email') {
          const email = (ctx.body as { email?: string } | undefined)?.email;
          if (email) {
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
          }
        }

        // ---- Phase D: BA organization HTTP surface lockdown (fail-closed) ----
        // Frozen V0.1 rule: the ONLY BA organization endpoint exposed to the
        // browser is /organization/set-active. Everything else under
        // /organization/* is denied 403 (reads, writes, invitations, slugs).
        // Raw BA list/full-org/member/invitation/check-slug surfaces must not
        // become public V0.1 APIs. Config flags remain defense in depth.
        if (ctx.path.startsWith('/organization/') && ctx.path !== '/organization/set-active') {
          return ctx.json(
            { message: 'This organization operation is not available', code: 'FORBIDDEN' },
            { status: 403 }
          );
        }

        // ---- Phase D: validated /organization/set-active ----
        // Canonical V0.1 input: organizationId: UUID | null. organizationSlug is
        // NOT an accepted V0.1 authorization input. Server-side validation
        // proves: authenticated active user, org exists + deleted_at IS NULL,
        // fresh membership row for (user_id, organization_id). Do NOT trust
        // Better Auth's default check alone.
        if (ctx.path === '/organization/set-active') {
          const body = ctx.body as { organizationId?: string; organizationSlug?: string } | undefined;
          // organizationSlug is unsupported in V0.1 — reject explicitly.
          if (body?.organizationSlug !== undefined && body?.organizationSlug !== null && body?.organizationSlug !== '') {
            return ctx.json(
              { message: 'organizationSlug is not supported; use organizationId', code: 'ORG_CONTEXT_INVALID' },
              { status: 403 }
            );
          }
          const rawOrgId = body?.organizationId ?? null;
          // null clears the active org (allowed); anything else must be a UUID.
          if (rawOrgId !== null && !isCanonicalUuid(rawOrgId)) {
            return ctx.json(
              { message: 'Selected organization is not valid', code: 'ORG_CONTEXT_INVALID' },
              { status: 403 }
            );
          }
          // Resolve the authenticated user from the session (set-active requires
          // a session; the middleware provides it).
          const session = await getSessionFromCtx(ctx);
          if (!session) {
            return ctx.json({ message: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
          }
          // User must be active.
          const userRows = await db
            .select({ deletedAt: users.deletedAt })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);
          if (userRows.length === 0 || userRows[0].deletedAt !== null) {
            return ctx.json({ message: 'User is not active', code: 'UNAUTHORIZED' }, { status: 401 });
          }
          if (rawOrgId === null) {
            // Unset active org: allowed — resolves to null context (no mutation
            // of memberships; hint cleared).
            return;
          }
          const organizationId = rawOrgId; // validated UUID
          const orgRows = await db
            .select({ id: organizations.id, deletedAt: organizations.deletedAt })
            .from(organizations)
            .where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)))
            .limit(1);
          if (orgRows.length === 0) {
            return ctx.json({ message: 'Selected organization is not valid', code: 'ORG_CONTEXT_INVALID' }, { status: 403 });
          }
          const memberRows = await db
            .select({ id: organizationMembers.id })
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.userId, session.user.id),
                eq(organizationMembers.organizationId, organizationId)
              )
            )
            .limit(1);
          if (memberRows.length === 0) {
            return ctx.json({ message: 'User is not a member of this organization', code: 'FORBIDDEN' }, { status: 403 });
          }
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
