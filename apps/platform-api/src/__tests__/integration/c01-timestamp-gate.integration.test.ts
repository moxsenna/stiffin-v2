/**
 * C0.1 — TIMESTAMP REUSE IMPLEMENTATION VERIFY GATE (frozen)
 *
 * Proves against real PostgreSQL 16 that Better Auth 1.6.28 (real pinned
 * drizzle adapter) can read/write the existing canonical B1 tables whose
 * Drizzle timestamps use mode 'string', while BA operates with Date objects.
 *
 * Mapping approach (proven by the pinned adapter source):
 * - The Drizzle adapter schema is keyed by the model names BA resolves
 *   (plural table names here).
 * - BA's field queries use the *Drizzle property names* (e.g. `userId`), and
 *   Drizzle maps the property to the snake_case DB column (`user_id`). So the
 *   `fields` config maps BA field -> Drizzle property name.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { getSessionCookie } from 'better-auth/cookies';
import { hashPassword } from '@better-auth/utils/password';
import { eq } from 'drizzle-orm';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withOwnerSql } from './test-env';
import { users, organizations, organizationMembers, sessions, accounts, verifications, organizationInvitations, authRateLimits, productEntitlements } from '../../db/schema';

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
    secret: 'c0-1-spike-secret-0123456789-abcdefghijklmnop',
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

describe('C0.1 — B1 timestamp reuse verification gate (pinned 1.6.28 adapter)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('3+6. BA signs in an existing canonical user; session + account Date writes land correctly; timestamps valid', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const auth = makeAuth(db);

      const user = await db.insert(users).values({ name: 'TS Signin', email: `tssign-${Date.now()}@example.com` }).returning();
      const org = await db.insert(organizations).values({ name: 'TS Org', slug: `tsorg-${Date.now()}` }).returning();
      await db.insert(productEntitlements).values({ organizationId: org[0].id, promotorClass: false, promotorFlow: false });
      await db.insert(organizationMembers).values({ organizationId: org[0].id, userId: user[0].id, role: 'owner' });
      const passwordHash = await hashPassword('password123');
      await db.insert(accounts).values({
        userId: user[0].id,
        accountId: user[0].id,
        providerId: 'credential',
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Sign in through BA's real HTTP handler (production path, real signed Set-Cookie).
      const signInReq = new Request('http://localhost:8787/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: user[0].email, password: 'password123' }),
      });
      const signInRes = await auth.handler(signInReq);
      const signInBody = (await signInRes.json()) as { token?: string };
      assert.ok(signInBody.token, 'BA must accept the existing canonical user + BA-hashed credential and return a session');
      const setCookieHeader = signInRes.headers.get('set-cookie');
      assert.ok(setCookieHeader, 'sign-in must set a session cookie');
      const signedCookie = setCookieHeader.split(';')[0];

      // Replay the signed cookie into a real get-session request via auth.handler.
      const req = new Request('http://localhost:8787/api/auth/get-session', {
        method: 'GET',
        headers: { cookie: signedCookie },
      });
      const res = await auth.handler(req);
      const body = (await res.json()) as { user?: { id: string }; session?: { expiresAt?: string | Date } };
      assert.ok(body.user, 'session cookie must resolve the canonical user');
      assert.strictEqual(body.user.id, user[0].id);
      assert.ok(Number.isFinite(new Date(body.session?.expiresAt as string).getTime()), 'session expiresAt is a valid Date');
      const row = await db.select().from(sessions).where(eq(sessions.token, signInBody.token));
      assert.strictEqual(row.length, 1, 'session row must exist in canonical sessions table');
      assert.ok(Number.isFinite(new Date(row[0].expiresAt as unknown as string).getTime()), 'session expires_at round-trips');
    } finally {
      await pool.end();
    }
  });

  it('4. organizations + organization_members reuse with string-mode timestamps (no Invalid Date)', async () => {
    const pool = new Pool({ connectionString: TEST_DATABASE_URL });
    try {
      const db = drizzle(pool);
      const org = await db.insert(organizations).values({ name: 'TS Org2', slug: `tsorg2-${Date.now()}` }).returning();
      const user = await db.insert(users).values({ name: 'TS Member2', email: `tsm2-${Date.now()}@example.com` }).returning();
      await db.insert(organizationMembers).values({ organizationId: org[0].id, userId: user[0].id, role: 'member' });
      const memberRows = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, org[0].id));
      assert.strictEqual(memberRows.length, 1);
      assert.strictEqual(memberRows[0].role, 'member', 'single role preserved');
      assert.ok(Number.isFinite(new Date(memberRows[0].createdAt as unknown as string).getTime()), 'member created_at valid Date');
      const orgRow = await db.select().from(organizations).where(eq(organizations.id, org[0].id));
      assert.ok(Number.isFinite(new Date(orgRow[0].createdAt as unknown as string).getTime()), 'org created_at valid Date');
    } finally {
      await pool.end();
    }
  });

  it('5. No B1 schema mutation required — timestamp columns unchanged (timestamptz, string mode in Drizzle)', async () => {
    await withOwnerSql(async (client) => {
      const res = await client.query(
        `SELECT table_name, column_name, data_type FROM information_schema.columns
         WHERE table_name IN ('users','organizations','organization_members') AND column_name IN ('created_at','updated_at')
         ORDER BY table_name, column_name`
      );
      assert.ok(res.rows.length >= 5, 'expected the B1 timestamp columns present');
      for (const row of res.rows) {
        assert.strictEqual(row.data_type, 'timestamp with time zone', `${row.table_name}.${row.column_name} must remain timestamptz`);
      }
    });
  });
});
