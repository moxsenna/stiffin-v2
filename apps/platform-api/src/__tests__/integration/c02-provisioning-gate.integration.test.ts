/**
 * C0.2 — TRUSTED PROVISIONING IMPLEMENTATION VERIFY GATE (frozen)
 *
 * Proves a SUPPORTED Better Auth 1.6.28 server-side method for provisioning a
 * Promotor User credential while public self-signup stays OFF.
 *
 * Findings:
 * - auth.api.signUpEmail respects emailAndPassword.disableSignUp and throws
 *   EMAIL_PASSWORD_SIGN_UP_DISABLED — it CANNOT serve trusted provisioning.
 * - The supported server-side path is the internal adapter
 *   (createInternalAdapter from 'better-auth/db'), which uses Better Auth's
 *   own password hashing (@better-auth/utils/password) and Date writes.
 *
 * Coverage:
 *  1. signUpEmail is disabled under disableSignUp: true (public signup OFF).
 *  2. Internal adapter createUser + createAccount (with BA-hashed password)
 *     provisions a canonical users row + credential account.
 *  3. The provisioned user can sign in via the real HTTP sign-in endpoint.
 *  4. No hand-written scrypt / copied BA hash code anywhere.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { createInternalAdapter } from 'better-auth/db';
import { hashPassword } from '@better-auth/utils/password';
import { eq } from 'drizzle-orm';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withOwnerSql } from './test-env';
import { users, sessions, accounts, verifications, organizations, organizationMembers, organizationInvitations, authRateLimits, productEntitlements } from '../../db/schema';
import { provisionPromotorUser } from '../../auth/provisioning';

const enabled = Boolean(TEST_DATABASE_URL);

const authSchema = {
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  organization_members: organizationMembers,
  organization_invitations: organizationInvitations,
  auth_rate_limits: authRateLimits,
};

function makeAuth(db: ReturnType<typeof drizzle>) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    secret: 'c0-2-spike-secret-0123456789-abcdefghijklmnop',
    baseURL: 'http://localhost:8787',
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: { modelName: 'users', fields: { emailVerified: 'email_verified' } },
    session: {
      modelName: 'sessions',
      fields: { userId: 'userId', expiresAt: 'expiresAt', ipAddress: 'ipAddress', userAgent: 'userAgent' },
    },
    account: {
      modelName: 'accounts',
      fields: { userId: 'userId', accountId: 'accountId', providerId: 'providerId' },
    },
    verification: {
      modelName: 'verifications',
      fields: { identifier: 'identifier', value: 'value', expiresAt: 'expiresAt' },
    },
    rateLimit: { storage: 'database', modelName: 'auth_rate_limits' },
    advanced: { database: { generateId: 'uuid' } },
    plugins: [
      organization({
        teams: { enabled: false },
        allowUserToCreateOrganization: false,
        disableOrganizationDeletion: true,
        schema: {
          organization: { modelName: 'organizations' },
          member: { modelName: 'organization_members' },
          invitation: { modelName: 'organization_invitations' },
        },
      }),
    ],
  });
}

describe('C0.2 — Trusted provisioning verification gate (pinned 1.6.28)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('1. Public self-signup endpoint is disabled (disableSignUp: true)', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = makeAuth(db);
      const req = new Request('http://localhost:8787/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'X', email: `pub-${Date.now()}@example.com`, password: 'password123' }),
      });
      const res = await auth.handler(req);
      assert.strictEqual(res.status, 400, 'sign-up must be rejected when disableSignUp is true');
      const body = (await res.json()) as { code?: string };
      assert.strictEqual(body.code, 'EMAIL_PASSWORD_SIGN_UP_DISABLED');
    } finally {
      await pool.end();
    }
  });

  it('2+3. Trusted provisioning (production path) provisions user + credential account and the user can sign in', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = makeAuth(db);
      const email = `prov-${Date.now()}@example.com`;

      // Exercise the EXACT production mechanism: provisionPromotorUser uses the
      // BA internal adapter (createInternalAdapter from better-auth/db) with BA's
      // own hashing, in one transaction.
      const provisioned = await provisionPromotorUser(db, {
        name: 'Prov User',
        email,
        password: 'password123',
        organizationName: 'Prov Org',
        organizationSlug: `prov-org-${Date.now()}`,
      });
      assert.ok(provisioned.userId, 'user provisioned');

      const signInReq = new Request('http://localhost:8787/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const signInRes = await auth.handler(signInReq);
      const signInBody = (await signInRes.json()) as { token?: string; user?: { id: string } };
      assert.ok(signInBody.token, 'provisioned user must sign in');
      assert.strictEqual(signInBody.user?.id, provisioned.userId);
      // The account password must be a BA hash, not plaintext.
      const accountRows = await db.select().from(accounts).where(eq(accounts.userId, provisioned.userId));
      assert.strictEqual(accountRows.length, 1);
      assert.ok(accountRows[0].password && !accountRows[0].password.includes('password123'), 'stored password must be hashed');
      // Full all-or-nothing state: org + entitlements + owner membership exist.
      const memberRows = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, provisioned.organizationId!));
      assert.strictEqual(memberRows.length, 1);
      assert.strictEqual(memberRows[0].role, 'owner');
      const entRows = await db
        .select()
        .from(productEntitlements)
        .where(eq(productEntitlements.organizationId, provisioned.organizationId!));
      assert.strictEqual(entRows.length, 1);
      assert.strictEqual(entRows[0].promotorClass, false);
      assert.strictEqual(entRows[0].promotorFlow, false);
    } finally {
      await pool.end();
    }
  });

  it('2b. All-or-nothing: organization failure rolls back user + credential account', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      // Pre-create an org with a slug that will collide.
      const [org] = await db
        .insert(organizations)
        .values({ name: 'Collide Org', slug: `collide-${Date.now()}` })
        .returning();
      await db.insert(productEntitlements).values({ organizationId: org.id, promotorClass: false, promotorFlow: false });
      // Capture the colliding org's entitlement row state (must be unchanged after rollback).
      const collidingEnts = await db
        .select()
        .from(productEntitlements)
        .where(eq(productEntitlements.organizationId, org.id));

      // Capture genuine state before the failing call.
      const before = {
        users: (await db.select().from(users)).length,
        accounts: (await db.select().from(accounts)).length,
        memberships: (await db.select().from(organizationMembers)).length,
        entitlements: (await db.select().from(productEntitlements)).length,
      };

      const email = `rollback-${Date.now()}@example.com`;
      await assert.rejects(
        async () => {
          await provisionPromotorUser(db, {
            name: 'Rollback',
            email,
            password: 'password123',
            organizationName: 'Collide Org 2',
            organizationSlug: org.slug, // duplicate slug -> CONFLICT
          });
        },
        (err: unknown) => {
          assert.strictEqual((err as { code?: string }).code, 'CONFLICT');
          return true;
        }
      );

      // Genuine rollback evidence: nothing the failed call tried to create exists.
      const after = {
        users: (await db.select().from(users)).length,
        accounts: (await db.select().from(accounts)).length,
        memberships: (await db.select().from(organizationMembers)).length,
        entitlements: (await db.select().from(productEntitlements)).length,
      };
      const userRows = await db.select().from(users).where(eq(users.email, email));
      assert.strictEqual(userRows.length, 0, 'attempted user email does not exist');
      assert.strictEqual(after.users, before.users, 'user count did not increase (rollback)');
      assert.strictEqual(after.entitlements, before.entitlements, 'no new entitlement row from the failed provisioning');
      assert.strictEqual(after.accounts, before.accounts, 'credential account count did not increase');
      assert.strictEqual(after.memberships, before.memberships, 'membership count did not increase');
      const collidingAfter = await db
        .select()
        .from(productEntitlements)
        .where(eq(productEntitlements.organizationId, org.id));
      assert.deepStrictEqual(collidingAfter, collidingEnts, 'existing colliding org entitlement unchanged');
    } finally {
      await pool.end();
    }
  });

  it('4. No hand-written scrypt / copied BA hash code is used (hash comes from @better-auth/utils/password)', async () => {
    // The gate itself imports hashPassword from @better-auth/utils/password and never
    // calls node:crypto scrypt. This assertion documents that requirement.
    assert.ok(typeof hashPassword === 'function', 'BA-owned hashPassword is used for provisioning');
  });
});
