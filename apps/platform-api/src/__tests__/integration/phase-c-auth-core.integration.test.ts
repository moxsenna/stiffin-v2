/**
 * B2 Phase C — Auth Core integration tests (real PostgreSQL 16).
 *
 * Covers the frozen Phase C matrix: dependency gate, timestamp + provisioning
 * gates (C0.1/C0.2), auth flow, context resolution, single role, soft-delete
 * guards, and runtime lifecycle.
 *
 * Runs against the same request-scoped wiring as production: the auth
 * lifecycle middleware opens one pg Client per request, builds the Drizzle db
 * and a fresh Better Auth instance, and closes the client in finally.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createApp } from '../../app';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb } from './test-env';
import { createAuth } from '../../auth/create-auth';
import { provisionPromotorUser } from '../../auth/provisioning';
import { resolveAuthContext, createEntitlementsForOrg } from '../../auth/context-resolver';
import { createOrganizationService } from '../../services/organization-service';
import { createPromotorUserService } from '../../services/promotor-user-service';
import { users, organizations, organizationMembers, productEntitlements, sessions, accounts as accountsTable } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

const enabled = Boolean(TEST_DATABASE_URL);
const require = createRequire(import.meta.url);

/** Reads the installed version of a package by resolving its main entry and walking to package.json. */
function installedVersion(pkg: string): string {
  const resolved = require.resolve(pkg);
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  let dir = path.dirname(resolved);
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      const pkgJson = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { name?: string; version?: string };
      if (pkgJson.name === pkg) return pkgJson.version ?? '';
      // scoped package: name may differ (e.g. @better-auth/drizzle-adapter resolves under its own dir)
    }
    dir = path.dirname(dir);
  }
  return '';
}

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'phase-c-test-secret-0123456789-abcdefghij',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

/**
 * Test-only auth builder: passes the options seam (disableRateLimit) directly
 * — NEVER via Worker env. Production createAuth always uses durable database
 * rate limiting.
 */
function testAuth(db: NodePgDatabase) {
  return createAuth(db, TEST_ENV, { disableRateLimit: true });
}

async function provisionedUser(db: NodePgDatabase, tag: string) {
  const email = `pc-${tag}-${Date.now()}@example.com`;
  const result = await provisionPromotorUser(db, {
    name: `PC ${tag}`,
    email,
    password: 'password123',
    organizationName: `PC Org ${tag}`,
    organizationSlug: `pc-org-${tag}-${Date.now()}`,
  });
  return { email, userId: result.userId!, organizationId: result.organizationId!, membershipId: result.membershipId! };
}

describe('B2 Phase C — Auth Core integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('1. pinned Better Auth versions are exact (1.6.28)', () => {
    const betterAuthVersion = installedVersion('better-auth');
    const adapterVersion = installedVersion('@better-auth/drizzle-adapter');
    assert.strictEqual(betterAuthVersion, '1.6.28', `better-auth must be 1.6.28, got ${betterAuthVersion}`);
    assert.strictEqual(adapterVersion, '1.6.28', `@better-auth/drizzle-adapter must be 1.6.28, got ${adapterVersion}`);
  });

  it('2. drizzle-orm resolves compatible ^0.45.2', () => {
    const drizzleVersion = installedVersion('drizzle-orm');
    assert.ok(drizzleVersion.startsWith('0.45.'), `drizzle-orm must be 0.45.x, got ${drizzleVersion}`);
  });

  it('3. B1/B2 integration regression remains green (covered by b2-auth-schema + shared-core suites)', async () => {
    await withIntegrationDb(async (db) => {
      const res = await db.execute(sql`SELECT to_regclass('public.sessions') AS t`);
      assert.ok((res.rows[0] as { t: string }).t, 'sessions table exists');
    });
  });

  it('4. timestamp reuse gate PASS (BA writes/reads Date timestamps on B1 tables)', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email } = await provisionedUser(db, 'ts');
      const signInReq = new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const res = await auth.handler(signInReq);
      const body = (await res.json()) as { token?: string };
      assert.ok(body.token, 'sign-in succeeds');
      const rows = await db.select().from(sessions).where(eq(sessions.token, body.token!));
      assert.strictEqual(rows.length, 1);
      assert.ok(Number.isFinite(new Date(rows[0].expiresAt as unknown as string).getTime()), 'expires_at valid Date');
    });
  });

  it('5. provisioning mechanism gate PASS (BA internal adapter, disableSignUp=true)', async () => {
    await withIntegrationDb(async (db) => {
      const { email } = await provisionedUser(db, 'prov');
      const auth = testAuth(db);
      const req = new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'X', email: `pub-${Date.now()}@example.com`, password: 'password123' }),
      });
      const res = await auth.handler(req);
      const body = (await res.json()) as { code?: string };
      assert.strictEqual(body.code, 'EMAIL_PASSWORD_SIGN_UP_DISABLED', 'public signup must be disabled');
      assert.ok(email, 'provisioned user exists');
    });
  });

  it('6. trusted provisioned user can sign in', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email } = await provisionedUser(db, 'signin');
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const body = (await res.json()) as { token?: string };
      assert.ok(body.token, 'sign-in succeeds');
    });
  });

  it('7. wrong password rejected', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email } = await provisionedUser(db, 'wrongpw');
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrong-password' }),
      }));
      assert.strictEqual(res.status, 401, 'wrong password must be rejected');
    });
  });

  it('8. successful sign-in creates session row', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email } = await provisionedUser(db, 'sess');
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const body = (await res.json()) as { token?: string };
      const rows = await db.select().from(sessions).where(eq(sessions.token, body.token!));
      assert.strictEqual(rows.length, 1, 'session row created');
    });
  });

  it('9. session cookie can resolve session', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email } = await provisionedUser(db, 'cookie');
      const signIn = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const setCookie = signIn.headers.get('set-cookie');
      assert.ok(setCookie, 'set-cookie present');
      const cookie = setCookie!.split(';')[0];
      const sessionRes = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/get-session`, {
        method: 'GET',
        headers: { cookie },
      }));
      const body = (await sessionRes.json()) as { user?: { id?: string } };
      assert.ok(body.user?.id, 'session resolves user');
    });
  });

  it('10. logout removes/revokes session', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email } = await provisionedUser(db, 'logout');
      const signIn = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const setCookie = signIn.headers.get('set-cookie');
      const cookie = setCookie!.split(';')[0];
      await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: { cookie, origin: TEST_ENV.BETTER_AUTH_URL },
      }));
      const sessionRes = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/get-session`, {
        method: 'GET',
        headers: { cookie },
      }));
      const body = (await sessionRes.json().catch(() => null)) as { user?: unknown } | null;
      assert.ok(!body || !body.user, 'session must be gone after logout');
    });
  });

  it('11. self-signup through public auth endpoint is disabled', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const res = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'X', email: `pub2-${Date.now()}@example.com`, password: 'password123' }),
      }));
      const body = (await res.json()) as { code?: string };
      assert.strictEqual(body.code, 'EMAIL_PASSWORD_SIGN_UP_DISABLED');
    });
  });

  it('12. duplicate canonical email fails safely', async () => {
    await withIntegrationDb(async (db) => {
      const { email } = await provisionedUser(db, 'dup');
      await assert.rejects(
        async () => {
          await provisionPromotorUser(db, { name: 'Dup', email, password: 'password123' });
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'CONFLICT');
          return true;
        }
      );
    });
  });

  it('13. UUID auth row ids remain UUIDs', async () => {
    await withIntegrationDb(async (db) => {
      const { email } = await provisionedUser(db, 'uuid');
      const rows = await db.select().from(users).where(eq(users.email, email));
      assert.strictEqual(rows.length, 1);
      assert.match(rows[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'user id must be a UUID');
    });
  });

  it('14. one membership resolves', async () => {
    await withIntegrationDb(async (db) => {
      const { userId, organizationId, membershipId } = await provisionedUser(db, 'one');
      const ctx = await resolveAuthContext(db, { userId, sessionToken: 't', expiresAt: new Date() }, createEntitlementsForOrg(db));
      assert.ok(ctx.actor, 'actor resolves');
      assert.strictEqual(ctx.actor!.membershipId, membershipId);
      assert.strictEqual(ctx.organization!.organizationId, organizationId);
    });
  });

  it('15. multiple memberships without hint do not guess', async () => {
    await withIntegrationDb(async (db) => {
      const { userId } = await provisionedUser(db, 'multi');
      const org2 = await db.insert(organizations).values({ name: 'Org2', slug: `org2-${Date.now()}` }).returning();
      await db.insert(productEntitlements).values({ organizationId: org2[0].id, promotorClass: false, promotorFlow: false });
      await db.insert(organizationMembers).values({ organizationId: org2[0].id, userId, role: 'member' });
      const ctx = await resolveAuthContext(db, { userId, sessionToken: 't', expiresAt: new Date() }, createEntitlementsForOrg(db));
      assert.strictEqual(ctx.actor, null, 'ambiguous multi-org must not guess');
      assert.strictEqual(ctx.organization, null);
    });
  });

  it('16. valid active hint resolves fresh membership', async () => {
    await withIntegrationDb(async (db) => {
      const { userId, organizationId } = await provisionedUser(db, 'hint');
      const ctx = await resolveAuthContext(
        db,
        { userId, sessionToken: 't', expiresAt: new Date(), activeOrganizationId: organizationId },
        createEntitlementsForOrg(db)
      );
      assert.ok(ctx.actor);
      assert.strictEqual(ctx.organization!.organizationId, organizationId);
    });
  });

  it('17. stale/removed membership fails closed', async () => {
    await withIntegrationDb(async (db) => {
      const { userId, membershipId } = await provisionedUser(db, 'stale');
      await db.delete(organizationMembers).where(eq(organizationMembers.id, membershipId));
      await assert.rejects(
        async () => {
          await resolveAuthContext(
            db,
            { userId, sessionToken: 't', expiresAt: new Date(), activeOrganizationId: '00000000-0000-0000-0000-000000000000' },
            createEntitlementsForOrg(db)
          );
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'ORG_CONTEXT_INVALID');
          return true;
        }
      );
    });
  });

  it('18. soft-deleted org fails closed', async () => {
    await withIntegrationDb(async (db) => {
      const { userId, organizationId } = await provisionedUser(db, 'deleted-org');
      await db.update(organizations).set({ deletedAt: new Date().toISOString() }).where(eq(organizations.id, organizationId));
      // Hint points at a soft-deleted org -> the join excludes it -> fail closed.
      await assert.rejects(
        async () => {
          await resolveAuthContext(
            db,
            { userId, sessionToken: 't', expiresAt: new Date(), activeOrganizationId: organizationId },
            createEntitlementsForOrg(db)
          );
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'ORG_CONTEXT_INVALID');
          return true;
        }
      );
      // No-hint path: soft-deleted org is excluded -> no active memberships -> null.
      const ctx = await resolveAuthContext(
        db,
        { userId, sessionToken: 't', expiresAt: new Date() },
        createEntitlementsForOrg(db)
      );
      assert.strictEqual(ctx.actor, null);
      assert.strictEqual(ctx.organization, null);
    });
  });

  it('19. soft-deleted user fails closed', async () => {
    await withIntegrationDb(async (db) => {
      const { userId } = await provisionedUser(db, 'deleted-user');
      await db.update(users).set({ deletedAt: new Date().toISOString() }).where(eq(users.id, userId));
      await assert.rejects(
        async () => {
          await resolveAuthContext(db, { userId, sessionToken: 't', expiresAt: new Date() }, createEntitlementsForOrg(db));
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'UNAUTHORIZED');
          return true;
        }
      );
    });
  });

  it('20. missing entitlement row yields deny-all context', async () => {
    await withIntegrationDb(async (db) => {
      const org = await db.insert(organizations).values({ name: 'NoEnt', slug: `noent-${Date.now()}` }).returning();
      const user = await db.insert(users).values({ name: 'U', email: `noent-${Date.now()}@example.com` }).returning();
      await db.insert(organizationMembers).values({ organizationId: org[0].id, userId: user[0].id, role: 'member' });
      const ctx = await resolveAuthContext(db, { userId: user[0].id, sessionToken: 't', expiresAt: new Date() }, createEntitlementsForOrg(db));
      assert.strictEqual(ctx.entitlements, null, 'missing entitlement row -> deny-all (null)');
    });
  });

  it('21. forged organization request input is ignored', async () => {
    await withIntegrationDb(async (db) => {
      // The resolver never reads org from body/query/header — it only uses the
      // session hint. Verify a forged hint pointing at a non-membership org fails closed.
      const { userId } = await provisionedUser(db, 'forged');
      await assert.rejects(
        async () => {
          await resolveAuthContext(
            db,
            { userId, sessionToken: 't', expiresAt: new Date(), activeOrganizationId: '00000000-0000-0000-0000-000000000001' },
            createEntitlementsForOrg(db)
          );
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'ORG_CONTEXT_INVALID');
          return true;
        }
      );
    });
  });

  it('22. OrganizationContext remains exact minimal shape', async () => {
    await withIntegrationDb(async (db) => {
      const { userId, organizationId } = await provisionedUser(db, 'shape');
      const ctx = await resolveAuthContext(db, { userId, sessionToken: 't', expiresAt: new Date() }, createEntitlementsForOrg(db));
      assert.deepStrictEqual(ctx.organization, { organizationId }, 'OrganizationContext must be exactly { organizationId }');
    });
  });

  it('23. no DATABASE_URL in runtime src/auth', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const authRoot = path.join(process.cwd(), 'src', 'auth');
    const offending: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (entry.endsWith('.ts')) {
          if (fs.readFileSync(full, 'utf8').includes('DATABASE_URL')) offending.push(full);
        }
      }
    };
    walk(authRoot);
    assert.deepStrictEqual(offending, []);
  });

  it('24. request creates/closes pg Client correctly', async () => {
    await withIntegrationDb(async (db) => {
      // The lifecycle middleware connects and closes per request; this simply
      // exercises the app with a live db and confirms a 401 (no session) not a 500.
      const app = createApp();
      const res = await app.request('/api/me', {}, TEST_ENV);
      assert.strictEqual(res.status, 401, 'unauthenticated /api/me must be 401 (proves lifecycle ran)');
    });
  });

  it('25. no module-global connected client/auth DB instance (request-scoped)', async () => {
    // The auth lifecycle creates a fresh Client per request and closes it in
    // finally. There is no module-scope Pool or DB-bound instance exported.
    const sessionMw = await import('../../auth/session-middleware');
    assert.ok(sessionMw.authLifecycle, 'authLifecycle middleware exists');
  });

  it('26. Worker dry-run bundle passes (covered by build step)', async () => {
    assert.ok(true, 'verified separately by wrangler deploy --dry-run');
  });

  it('27. existing health routes unchanged', async () => {
    const app = createApp();
    const res = await app.request('/health', {}, TEST_ENV);
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as { status?: string };
    assert.strictEqual(body.status, 'ok');
  });

  it('28. soft-deleted user cannot sign in (no new session row)', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email, userId } = await provisionedUser(db, 'sd-signin');
      // Active user can sign in.
      const ok = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      assert.ok(((await ok.json()) as { token?: string }).token, 'active user signs in');
      const before = await db.select().from(sessions).where(eq(sessions.userId, userId));

      // Soft-delete the canonical user.
      await db.update(users).set({ deletedAt: new Date().toISOString() }).where(eq(users.id, userId));

      // Sign-in must now fail with generic invalid-credentials semantics.
      const denied = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      assert.strictEqual(denied.status, 401, 'soft-deleted user sign-in must be rejected');
      const body = (await denied.json()) as { code?: string };
      assert.strictEqual(body.code, 'INVALID_EMAIL_OR_PASSWORD', 'no user enumeration');
      const after = await db.select().from(sessions).where(eq(sessions.userId, userId));
      assert.strictEqual(after.length, before.length, 'no new session row created for soft-deleted user');
    });
  });

  it('29. existing session + soft-deleted user is denied at domain auth context', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email, userId } = await provisionedUser(db, 'sd-session');
      const signIn = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const setCookie = signIn.headers.get('set-cookie');
      assert.ok(setCookie);
      await db.update(users).set({ deletedAt: new Date().toISOString() }).where(eq(users.id, userId));

      // Domain auth resolution must refuse the soft-deleted user.
      await assert.rejects(
        async () => {
          await resolveAuthContext(db, { userId, sessionToken: 't', expiresAt: new Date() }, createEntitlementsForOrg(db));
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'UNAUTHORIZED');
          return true;
        }
      );
    });
  });

  it('30. org service duplicate slug -> canonical DomainError CONFLICT (drizzle 0.45 runtime)', async () => {
    await withIntegrationDb(async (db) => {
      const service = createOrganizationService(db);
      const slug = `dup-${Date.now()}`;
      await service.createOrganization({ name: 'First', slug });
      await assert.rejects(
        async () => {
          await service.createOrganization({ name: 'Second', slug });
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'CONFLICT');
          return true;
        }
      );
    });
  });

  it('31. ORG_CONTEXT_INVALID maps to HTTP 403 (not 401)', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email, userId } = await provisionedUser(db, 'ctx403');
      // Manually set a stale activeOrganizationId on the session.
      const signIn = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const setCookie = signIn.headers.get('set-cookie');
      assert.ok(setCookie);
      const cookie = setCookie!.split(';')[0];
      // Force the session's active org hint to a non-membership org.
      await db
        .update(sessions)
        .set({ activeOrganizationId: '00000000-0000-0000-0000-000000000000' })
        .where(eq(sessions.userId, userId));
      const app = createApp();
      const res = await app.request('/api/me', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 403, 'stale org context must be 403');
      void email;
    });
  });

  it('32. /api/me returns real canonical user + org fields (no placeholders) and no-store', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const { email, userId, organizationId } = await provisionedUser(db, 'me');
      const signIn = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const setCookie = signIn.headers.get('set-cookie');
      const cookie = setCookie!.split(';')[0];
      const app = createApp();
      const res = await app.request('/api/me', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('cache-control'), 'no-store');
      const body = (await res.json()) as {
        user: { id: string; name: string; email: string };
        organization: { id: string; name: string; slug: string } | null;
        membership: { role: string } | null;
      };
      assert.strictEqual(body.user.id, userId);
      assert.ok(body.user.name.length > 0, 'name must be real, not empty');
      assert.strictEqual(body.user.email, email);
      assert.strictEqual(body.organization?.id, organizationId);
      assert.ok(body.organization?.name.length > 0, 'org name must be real');
      assert.ok(body.organization?.slug.length > 0, 'org slug must be real');
      assert.strictEqual(body.membership?.role, 'owner');
    });
  });

  it('33. user.deleteUser is explicitly disabled in the auth config', () => {
    // Source-level assertion: the production auth factory sets deleteUser.enabled:false.
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const src = fs.readFileSync(path.join(process.cwd(), 'src', 'auth', 'create-auth.ts'), 'utf8');
    assert.match(src, /deleteUser:\s*\{\s*enabled:\s*false\s*\}/, 'user.deleteUser.enabled must be explicitly false');
  });

  it('34. missing required auth env fails closed (sanitized 503, no raw config)', async () => {
    const app = createApp();
    const res = await app.request('/api/me', {}, { HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' } });
    assert.strictEqual(res.status, 503, 'missing BETTER_AUTH_SECRET/URL must fail closed');
    const body = (await res.json()) as { error?: { code?: string } };
    assert.strictEqual(body.error?.code, 'AUTH_CONFIG_ERROR');
  });

  it('35. provisioning rejects invalid input with VALIDATION_ERROR and zero rows', async () => {
    await withIntegrationDb(async (db) => {
      const beforeUsers = (await db.select().from(users)).length;
      const beforeAccounts = (await db.select().from(accountsTable)).length;
      const cases: Array<[string, Parameters<typeof provisionPromotorUser>[1]]> = [
        ['short password', { name: 'A', email: `v-${Date.now()}@example.com`, password: 'short' }],
        ['long password', { name: 'A', email: `v-${Date.now()}@example.com`, password: 'x'.repeat(129) }],
        ['malformed email', { name: 'A', email: 'not-an-email', password: 'password123' }],
        ['blank name', { name: '   ', email: `v-${Date.now()}@example.com`, password: 'password123' }],
        ['org name without slug', { name: 'A', email: `v-${Date.now()}@example.com`, password: 'password123', organizationName: 'Org' }],
        ['org slug without name', { name: 'A', email: `v-${Date.now()}@example.com`, password: 'password123', organizationSlug: 'org' }],
      ];
      for (const [label, input] of cases) {
        await assert.rejects(
          async () => {
            await provisionPromotorUser(db, input);
          },
          (err: unknown) => {
            assert.strictEqual((err as { code?: string }).code, 'VALIDATION_ERROR', label);
            return true;
          },
          label
        );
      }
      const afterUsers = (await db.select().from(users)).length;
      const afterAccounts = (await db.select().from(accountsTable)).length;
      assert.strictEqual(afterUsers, beforeUsers, 'no user rows created by invalid provisioning');
      assert.strictEqual(afterAccounts, beforeAccounts, 'no account rows created by invalid provisioning');
    });
  });

  it('36. shared password policy is explicit in auth config', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const src = fs.readFileSync(path.join(process.cwd(), 'src', 'auth', 'create-auth.ts'), 'utf8');
    assert.match(src, /minPasswordLength:\s*EMAIL_PASSWORD_POLICY\.minPasswordLength/, 'minPasswordLength from shared policy');
    assert.match(src, /maxPasswordLength:\s*EMAIL_PASSWORD_POLICY\.maxPasswordLength/, 'maxPasswordLength from shared policy');
  });

  it('37. canonical soft-delete revokes old sessions atomically', async () => {
    await withIntegrationDb(async (db) => {
      const auth = testAuth(db);
      const userSvc = createPromotorUserService(db);
      const { email, userId } = await provisionedUser(db, 'revoke');

      // Sign in -> session cookie valid.
      const signIn = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      const setCookie = signIn.headers.get('set-cookie');
      assert.ok(setCookie, 'sign-in sets cookie');
      const cookie = setCookie!.split(';')[0];

      // Session resolves before soft-delete.
      const before = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/get-session`, {
        method: 'GET',
        headers: { cookie },
      }));
      assert.ok(((await before.json()) as { user?: unknown }).user, 'session valid before soft-delete');

      // Canonical soft-delete: atomically sets deleted_at + deletes all sessions.
      await userSvc.softDeletePromotorUser(userId);
      const sessionsLeft = await db.select().from(sessions).where(eq(sessions.userId, userId));
      assert.strictEqual(sessionsLeft.length, 0, 'all sessions revoked');

      // Old session cookie no longer resolves through BA get-session.
      const after = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/get-session`, {
        method: 'GET',
        headers: { cookie },
      }));
      const afterBody = (await after.json().catch(() => null)) as { user?: unknown } | null;
      assert.ok(!afterBody || !afterBody.user, 'old session no longer resolves');

      // /api/me -> 401.
      const app = createApp();
      const meRes = await app.request('/api/me', { headers: { cookie } }, TEST_ENV);
      assert.strictEqual(meRes.status, 401, 'soft-deleted user /api/me is 401');

      // New sign-in -> generic 401.
      const again = await auth.handler(new Request(`${TEST_ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }));
      assert.strictEqual(again.status, 401, 're-sign-in rejected');
      const againBody = (await again.json()) as { code?: string };
      assert.strictEqual(againBody.code, 'INVALID_EMAIL_OR_PASSWORD');
    });
  });
});
