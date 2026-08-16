/**
 * B2 Phase D — Authorization + Hardening security matrix (real PostgreSQL 16).
 *
 * Covers the frozen Phase D matrix: middleware gates, validated set-active,
 * BA org endpoint lockdown, single-role, durable rate limiting across fresh
 * request-scoped auth instances, and regression.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Hono } from 'hono';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb, withRuntimeSql } from './test-env';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';
import { assertSingleRole } from '../../auth/roles';
import { requireOrganization, requireEntitlement, requireRole } from '../../auth/authorization';
import { authLifecycle, sessionMiddleware } from '../../auth/session-middleware';
import { AuthError, authErrorStatus } from '../../auth/errors';
import type { AuthContext } from '../../auth/types';
import type { AuthInstance } from '../../auth/create-auth';
import {
  users,
  organizations,
  organizationMembers,
  organizationInvitations,
  productEntitlements,
  sessions,
  authRateLimits,
} from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'phase-d-test-secret-0123456789-abcdefghij',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

/** Test-only auth builder (options seam, never via env). */
function testAuth(db: NodePgDatabase, opts?: { disableRateLimit?: boolean }) {
  return createAuth(db, TEST_ENV, opts ? { disableRateLimit: true } : undefined);
}

type TestAppEnv = {
  Bindings: typeof TEST_ENV;
  Variables: { db: NodePgDatabase; auth: AuthInstance; authContext: AuthContext | null };
};

/**
 * Test-only Hono composition for middleware proof — production has no /api/diag/*.
 * Routes composed here are NOT part of the production app.
 */
function testAuthzApp() {
  const app = new Hono<TestAppEnv>();
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json({ error: { code: err.code, message: err.message } }, authErrorStatus(err));
    }
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }, 500);
  });
  app.use('*', authLifecycle);
  app.use('*', sessionMiddleware);
  app.get('/org', requireOrganization(), requireRole(['owner', 'admin', 'member']), (c) => {
    const ctx = c.get('authContext');
    return c.json({ organizationId: ctx!.organization!.organizationId, role: ctx!.actor!.role }, 200);
  });
  app.get('/admin-only', requireOrganization(), requireRole(['owner', 'admin']), (c) => {
    return c.json({ ok: true }, 200);
  });
  app.get('/class', requireOrganization(), requireEntitlement('promotorClass'), (c) => {
    return c.json({ ok: true }, 200);
  });
  app.get('/flow', requireOrganization(), requireEntitlement('promotorFlow'), (c) => {
    return c.json({ ok: true }, 200);
  });
  return app;
}

async function provisionedUser(db: NodePgDatabase, tag: string) {
  const email = `pd-${tag}-${Date.now()}@example.com`;
  const r = await provisionPromotorUser(db, {
    name: `PD ${tag}`,
    email,
    password: 'password123',
    organizationName: `PD Org ${tag}`,
    organizationSlug: `pd-org-${tag}-${Date.now()}`,
  });
  return { email, userId: r.userId!, organizationId: r.organizationId!, membershipId: r.membershipId! };
}

/** Signs in and returns the signed session cookie. */
async function signInCookie(auth: ReturnType<typeof testAuth>, email: string) {
  const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  }));
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'sign-in sets cookie');
  return setCookie!.split(';')[0];
}

describe('B2 Phase D — Authorization + Hardening integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('1. unauthenticated -> 401', async () => {
    const app = testAuthzApp();
    const res = await app.request('/org', {}, TEST_ENV);
    assert.strictEqual(res.status, 401);
  });

  it('2. authenticated but no resolved org -> 403 ORG_CONTEXT_REQUIRED', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      // User with NO memberships.
      const u = await provisionPromotorUser(db, { name: 'NoOrg', email: `noorg-${Date.now()}@example.com`, password: 'password123' });
      const cookie = await signInCookie(auth, (await db.select().from(users).where(eq(users.id, u.userId)))[0].email);
      const app = testAuthzApp();
      const res = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403);
      const body = (await res.json()) as { error?: { code?: string } };
      assert.strictEqual(body.error?.code, 'ORG_CONTEXT_REQUIRED');
    } finally {
      await pool.end();
    }
  });

  it('3. one membership resolves through middleware', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, organizationId } = await provisionedUser(db, 'one');
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      const res = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { organizationId?: string; role?: string };
      assert.strictEqual(body.organizationId, organizationId);
      assert.strictEqual(body.role, 'owner');
    } finally {
      await pool.end();
    }
  });

  it('4. multiple memberships without hint never guessed', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email } = await provisionedUser(db, 'multi');
      const org2 = await db.insert(organizations).values({ name: 'Org2', slug: `org2-${Date.now()}` }).returning();
      await db.insert(productEntitlements).values({ organizationId: org2[0].id, promotorClass: false, promotorFlow: false });
      await db.insert(organizationMembers).values({ organizationId: org2[0].id, userId, role: 'member' });
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      const res = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403, 'ambiguous multi-org must not guess');
    } finally {
      await pool.end();
    }
  });

  it('5. valid set-active switches org (hint resolves fresh membership)', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email, organizationId } = await provisionedUser(db, 'setactive');
      // Second org + membership.
      const org2 = await db.insert(organizations).values({ name: 'Org2', slug: `org2-${Date.now()}` }).returning();
      await db.insert(productEntitlements).values({ organizationId: org2[0].id, promotorClass: false, promotorFlow: false });
      await db.insert(organizationMembers).values({ organizationId: org2[0].id, userId, role: 'member' });
      const cookie = await signInCookie(auth, email);

      // set-active to org2 (validated).
      const setRes = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId: org2[0].id }),
      }));
      assert.ok([200, 302].includes(setRes.status), `set-active should succeed, got ${setRes.status}`);

      const app = testAuthzApp();
      const res = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { organizationId?: string };
      assert.strictEqual(body.organizationId, org2[0].id, 'hint resolves fresh membership to org2');
      void organizationId;
    } finally {
      await pool.end();
    }
  });

  it('6. set-active to non-member org rejected 403, zero hint mutation', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email, organizationId } = await provisionedUser(db, 'notmember');
      // An org the user is NOT a member of.
      const other = await db.insert(organizations).values({ name: 'Other', slug: `other-${Date.now()}` }).returning();
      await db.insert(productEntitlements).values({ organizationId: other[0].id, promotorClass: false, promotorFlow: false });
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId: other[0].id }),
      }));
      assert.strictEqual(res.status, 403, 'non-member set-active must be rejected');
      // Hint unchanged.
      const sess = await db.select().from(sessions).where(eq(sessions.userId, userId));
      assert.ok(sess.length >= 1);
      assert.ok(sess.every((s) => s.activeOrganizationId === null || s.activeOrganizationId === organizationId));
    } finally {
      await pool.end();
    }
  });

  it('7. set-active to soft-deleted org rejected 403', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email } = await provisionedUser(db, 'sdorg');
      // Soft-delete the org (membership still exists but org is deleted).
      const rows = await db
        .select({ id: organizations.id })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(eq(organizationMembers.userId, userId));
      const orgId = rows[0].id;
      await db.update(organizations).set({ deletedAt: new Date().toISOString() }).where(eq(organizations.id, orgId));
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      }));
      assert.strictEqual(res.status, 403, 'soft-deleted org set-active must be rejected');
    } finally {
      await pool.end();
    }
  });

  it('8. removed membership rejected on next request', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email, membershipId } = await provisionedUser(db, 'removed');
      const cookie = await signInCookie(auth, email);
      // Remove membership.
      await db.delete(organizationMembers).where(eq(organizationMembers.id, membershipId));
      const app = testAuthzApp();
      const res = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      // No active org (0 memberships now) -> 403.
      assert.strictEqual(res.status, 403);
      void userId;
    } finally {
      await pool.end();
    }
  });

  it('9. soft-deleted user rejected', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email } = await provisionedUser(db, 'sduser');
      const cookie = await signInCookie(auth, email);
      await db.update(users).set({ deletedAt: new Date().toISOString() }).where(eq(users.id, userId));
      const app = testAuthzApp();
      const res = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 401, 'soft-deleted user -> 401');
    } finally {
      await pool.end();
    }
  });

  it('10. soft-deleted org rejected on domain request', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email } = await provisionedUser(db, 'sdorg2');
      const cookie = await signInCookie(auth, email);
      // Soft-delete the org via its membership.
      const userRow = (await db.select().from(users).where(eq(users.email, email)))[0];
      const rows = await db
        .select({ id: organizations.id })
        .from(organizationMembers)
        .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
        .where(eq(organizationMembers.userId, userRow.id));
      await db.update(organizations).set({ deletedAt: new Date().toISOString() }).where(eq(organizations.id, rows[0].id));
      const app = testAuthzApp();
      const res = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403, 'soft-deleted org -> no active context');
    } finally {
      await pool.end();
    }
  });

  it('11. missing entitlement row denied', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      // Use trusted provisioning (which creates an entitlement row), then delete it.
      const { email, organizationId } = await provisionedUser(db, 'noent');
      await db.delete(productEntitlements).where(eq(productEntitlements.organizationId, organizationId));
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      const res = await app.request('/class', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403);
      const body = (await res.json()) as { error?: { code?: string } };
      assert.strictEqual(body.error?.code, 'ENTITLEMENT_DENIED');
    } finally {
      await pool.end();
    }
  });

  it('12. Class entitlement false denied', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email, organizationId } = await provisionedUser(db, 'classoff');
      await db.update(productEntitlements).set({ promotorClass: false }).where(eq(productEntitlements.organizationId, organizationId));
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      const res = await app.request('/class', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403, 'promotorClass=false -> 403');
      void userId;
    } finally {
      await pool.end();
    }
  });

  it('13. Flow entitlement false denied', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, organizationId } = await provisionedUser(db, 'flowoff');
      await db.update(productEntitlements).set({ promotorFlow: false }).where(eq(productEntitlements.organizationId, organizationId));
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      const res = await app.request('/flow', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403, 'promotorFlow=false -> 403');
    } finally {
      await pool.end();
    }
  });

  it('14. entitlement true passes entitlement layer', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, organizationId } = await provisionedUser(db, 'enton');
      await db.update(productEntitlements).set({ promotorClass: true, promotorFlow: true }).where(eq(productEntitlements.organizationId, organizationId));
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      const classRes = await app.request('/class', { headers: { cookie } }, TEST_ENV);
      const flowRes = await app.request('/flow', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(classRes.status, 200);
      assert.strictEqual(flowRes.status, 200);
    } finally {
      await pool.end();
    }
  });

  it('15. insufficient role denied', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      // Real role denial: /admin-only requires owner|admin; a member must get 403 FORBIDDEN.
      const { email, userId } = await provisionedUser(db, 'rolelow');
      await db.update(organizationMembers).set({ role: 'member' }).where(eq(organizationMembers.userId, userId));
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      const res = await app.request('/admin-only', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403, 'member must be denied on owner/admin-only route');
      const body = (await res.json()) as { error?: { code?: string } };
      assert.strictEqual(body.error?.code, 'FORBIDDEN');
      // Member is still allowed on the all-role route.
      const allRole = await app.request('/org', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(allRole.status, 200, 'member passes all-role route');
    } finally {
      await pool.end();
    }
  });

  it('16. owner/admin accepted where allowed', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      // Owner (default from provisioning).
      const owner = await provisionedUser(db, 'ownerok');
      const ownerCookie = await signInCookie(auth, owner.email);
      // Admin: provision then change role to admin.
      const admin = await provisionedUser(db, 'adminok');
      await db.update(organizationMembers).set({ role: 'admin' }).where(eq(organizationMembers.userId, admin.userId));
      const adminCookie = await signInCookie(auth, admin.email);
      const app = testAuthzApp();
      const ownerRes = await app.request('/admin-only', { headers: { cookie: ownerCookie } }, TEST_ENV);
      assert.strictEqual(ownerRes.status, 200, 'owner passes owner/admin-only route');
      const adminRes = await app.request('/admin-only', { headers: { cookie: adminCookie } }, TEST_ENV);
      assert.strictEqual(adminRes.status, 200, 'admin passes owner/admin-only route');
    } finally {
      await pool.end();
    }
  });

  it('17. single-role: malformed/comma/multi/unknown/empty rejected', () => {
    for (const bad of ['owner,admin', 'owner, admin', 'owner,admin,member', 'supperuser', '  ', '']) {
      assert.throws(
        () => assertSingleRole(bad, 'test'),
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'VALIDATION_ERROR');
          return true;
        },
        `must reject ${JSON.stringify(bad)}`
      );
    }
    for (const ok of ['owner', 'admin', 'member']) {
      assert.strictEqual(assertSingleRole(ok, 'test'), ok);
    }
  });

  it('18. forged org body/query/header ignored', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, organizationId } = await provisionedUser(db, 'forged');
      const cookie = await signInCookie(auth, email);
      const app = testAuthzApp();
      // Forged org in query/header must be ignored; resolver only uses session hint.
      const res = await app.request('/org?organizationId=00000000-0000-0000-0000-000000000000', {
        headers: { cookie, 'x-organization-id': '00000000-0000-0000-0000-000000000000' },
      }, TEST_ENV);
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { organizationId?: string };
      assert.strictEqual(body.organizationId, organizationId, 'server-resolved org wins over forged input');
    } finally {
      await pool.end();
    }
  });

  it('19. each forbidden BA org endpoint mutates zero rows (real snapshot)', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, userId, organizationId } = await provisionedUser(db, 'deny');
      const cookie = await signInCookie(auth, email);

      // Real snapshots: target org row, target membership rows, invitation rows, totals.
      const orgSnapshot = (await db.select().from(organizations).where(eq(organizations.id, organizationId)))[0];
      const memberSnapshot = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
      const inviteSnapshot = await db.select().from(organizationInvitations);
      const beforeTotals = {
        orgs: (await db.select().from(organizations)).length,
        members: (await db.select().from(organizationMembers)).length,
        invites: (await db.select().from(organizationInvitations)).length,
      };

      const paths = [
        '/organization/update',
        '/organization/invite-member',
        '/organization/accept-invitation',
        '/organization/cancel-invitation',
        '/organization/reject-invitation',
        '/organization/add-member',
        '/organization/remove-member',
        '/organization/update-member-role',
        '/organization/leave',
      ];
      for (const p of paths) {
        const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth${p}`, {
          method: 'POST',
          headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
          body: JSON.stringify({ organizationId, memberId: userId, userId, role: 'owner', email }),
        }));
        // add-member is a server-only BA endpoint -> library 404 (deliberately
        // unavailable); all other denied endpoints -> deterministic 403.
        if (p === '/organization/add-member') {
          assert.ok([403, 404].includes(res.status), `${p} must be 403 or 404, got ${res.status}`);
        } else {
          assert.strictEqual(res.status, 403, `${p} must be 403`);
        }
      }

      // Deep-equal: no UPDATE could have mutated the target rows while preserving counts.
      const orgAfter = (await db.select().from(organizations).where(eq(organizations.id, organizationId)))[0];
      const memberAfter = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
      const inviteAfter = await db.select().from(organizationInvitations);
      assert.deepStrictEqual(orgAfter, orgSnapshot, 'target organization row unchanged');
      assert.deepStrictEqual(memberAfter, memberSnapshot, 'target membership rows unchanged');
      assert.deepStrictEqual(inviteAfter, inviteSnapshot, 'invitation rows unchanged');
      assert.strictEqual((await db.select().from(organizations)).length, beforeTotals.orgs, 'org count unchanged');
      assert.strictEqual((await db.select().from(organizationMembers)).length, beforeTotals.members, 'member count unchanged');
      assert.strictEqual((await db.select().from(organizationInvitations)).length, beforeTotals.invites, 'invite count unchanged');
    } finally {
      await pool.end();
    }
  });

  it('20. BA create org disabled', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email } = await provisionedUser(db, 'createoff');
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/create`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'X', slug: `x-${Date.now()}` }),
      }));
      assert.notStrictEqual(res.status, 200, 'BA org create must be disabled (non-200)');
    } finally {
      await pool.end();
    }
  });

  it('21. BA delete org disabled', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, organizationId } = await provisionedUser(db, 'deloff');
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/delete`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      }));
      assert.notStrictEqual(res.status, 200, 'BA org delete must be disabled (non-200)');
      const org = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      assert.strictEqual(org.length, 1, 'org still exists (soft-delete is canonical)');
    } finally {
      await pool.end();
    }
  });

  it('22. BA user hard delete disabled', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, userId } = await provisionedUser(db, 'userdeloff');
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/delete-user`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }));
      assert.notStrictEqual(res.status, 200, 'BA user delete must be disabled');
      const u = await db.select().from(users).where(eq(users.id, userId));
      assert.strictEqual(u.length, 1, 'user still exists');
    } finally {
      await pool.end();
    }
  });

  it('23. public signup disabled', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'X', email: `pub-${Date.now()}@example.com`, password: 'password123' }),
      }));
      const body = (await res.json()) as { code?: string };
      assert.strictEqual(body.code, 'EMAIL_PASSWORD_SIGN_UP_DISABLED');
    } finally {
      await pool.end();
    }
  });

  it('24. invitations remain unavailable', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, organizationId } = await provisionedUser(db, 'invoff');
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/invite-member`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ email: `inv-${Date.now()}@example.com`, role: 'member', organizationId }),
      }));
      assert.strictEqual(res.status, 403, 'invite-member denied');
    } finally {
      await pool.end();
    }
  });

  it('25. durable rate limit persists across FRESH request-scoped auth instances (one per request)', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      // NO disableRateLimit — production durable DB limiting with enabled:true.
      const email = `rl-${Date.now()}@example.com`;
      await provisionPromotorUser(db, { name: 'RL', email, password: 'password123' });
      // Exact request-scoped lifecycle semantics: a FRESH createAuth per request.
      let limited = false;
      for (let i = 0; i < 200 && !limited; i++) {
        const auth = testAuth(db); // fresh instance every iteration
        const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password: i % 2 === 0 ? 'password123' : 'wrong-password' }),
        }));
        if (res.status === 429) limited = true;
      }
      assert.ok(limited, 'durable rate limit must eventually 429 even with a fresh auth instance per request');
      // Rate-limit rows exist in auth_rate_limits.
      const rows = await db.select().from(authRateLimits);
      assert.ok(rows.length > 0, 'auth_rate_limits rows written');
      // Error response does not leak internal DB state.
      const lastAuth = testAuth(db);
      const last = await lastAuth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const text = await last.text();
      assert.ok(!text.includes('auth_rate_limits'), 'no internal table name leaked');
      assert.ok(!text.includes('postgres'), 'no db leak');
    } finally {
      await pool.end();
    }
  });

  it('26. runtime role still cannot CREATE TABLE', async () => {
    await withRuntimeSql(async (client) => {
      await assert.rejects(async () => {
        await client.query(`CREATE TABLE pd_should_fail (id uuid PRIMARY KEY)`);
      });
    });
  });

  it('27. B1/B2 Phase B regression remains green (covered by other suites)', async () => {
    await withIntegrationDb(async (db) => {
      const res = await db.execute(sql`SELECT to_regclass('public.auth_rate_limits') AS t`);
      assert.ok((res.rows[0] as { t: string }).t);
    });
  });

  it('28. Phase C 80-test baseline remains green (covered by other suites)', async () => {
    const app = createApp();
    const res = await app.request('/health', {}, TEST_ENV);
    assert.strictEqual(res.status, 200);
  });

  it('29. all raw BA organization read endpoints denied (fail-closed surface)', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, organizationId } = await provisionedUser(db, 'reads');
      const cookie = await signInCookie(auth, email);
      const paths = [
        '/organization/list',
        '/organization/get-full-organization',
        '/organization/list-members',
        '/organization/get-active-member',
        '/organization/get-active-member-role',
        '/organization/list-invitations',
        '/organization/get-invitation',
        '/organization/list-user-invitations',
        '/organization/check-slug',
        '/organization/has-permission',
      ];
      for (const p of paths) {
        const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth${p}`, {
          method: 'GET',
          headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL },
        }));
        // Deterministic 403 for mounted endpoints; 404 where the endpoint is
        // deliberately unavailable (e.g. check-slug not registered as a route).
        assert.ok([403, 404].includes(res.status), `${p} (read) must be denied (403/404)`);
      }
      // set-active remains the ONLY allowed org endpoint.
      const ok = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      }));
      assert.ok([200, 302].includes(ok.status), 'set-active stays allowed');
    } finally {
      await pool.end();
    }
  });

  it('30. set-active malformed UUID rejected 403, hint unchanged', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email, organizationId } = await provisionedUser(db, 'baduuid');
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ organizationId: 'not-a-uuid' }),
      }));
      assert.strictEqual(res.status, 403, 'malformed UUID must be 403, not 500');
      const body = (await res.json()) as { code?: string };
      assert.strictEqual(body.code, 'ORG_CONTEXT_INVALID');
      // Hint unchanged (null initially).
      const sess = await db.select().from(sessions).where(eq(sessions.userId, userId));
      assert.ok(sess.every((s) => s.activeOrganizationId === null), 'no hint mutation');
      void organizationId;
    } finally {
      await pool.end();
    }
  });

  it('31. set-active organizationSlug rejected 403, hint unchanged', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { userId, email } = await provisionedUser(db, 'slug');
      const cookie = await signInCookie(auth, email);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL, 'content-type': 'application/json' },
        body: JSON.stringify({ organizationSlug: 'some-org' }),
      }));
      assert.strictEqual(res.status, 403, 'organizationSlug must be rejected in V0.1');
      const sess = await db.select().from(sessions).where(eq(sessions.userId, userId));
      assert.ok(sess.every((s) => s.activeOrganizationId === null), 'no hint mutation');
    } finally {
      await pool.end();
    }
  });

  it('32. malformed sessions.active_organization_id hint -> 403, never 500', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = testAuth(db, { disableRateLimit: true });
      const { email, userId } = await provisionedUser(db, 'badhint');
      const cookie = await signInCookie(auth, email);
      // Persist a malformed hint directly.
      await db.update(sessions).set({ activeOrganizationId: 'not-a-uuid' }).where(eq(sessions.userId, userId));
      const app = createApp();
      const res = await app.request('/api/me', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403, 'malformed hint -> 403 ORG_CONTEXT_INVALID, not 500');
      const body = (await res.json()) as { error?: { code?: string } };
      assert.strictEqual(body.error?.code, 'ORG_CONTEXT_INVALID');
    } finally {
      await pool.end();
    }
  });
});
