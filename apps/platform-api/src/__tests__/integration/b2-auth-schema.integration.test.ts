import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql } from 'drizzle-orm';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb, withRuntimeSql, withOwnerSql, pgErrorCode } from './test-env';
import {
  organizations,
  users,
  organizationMembers,
  productEntitlements,
  sessions,
  accounts,
  organizationInvitations,
  authRateLimits,
} from '../../db/schema';
import { eq } from 'drizzle-orm';

const enabled = Boolean(TEST_DATABASE_URL);

const B2_TABLES = ['sessions', 'accounts', 'verifications', 'organization_invitations', 'auth_rate_limits'];

/** Asserts a Drizzle insert rejects with a specific PostgreSQL error code. */
async function rejectsWithCode(
  db: ReturnType<typeof withIntegrationDb> extends Promise<infer T> ? T : never,
  fn: () => Promise<unknown>,
  code: string,
  message: string
): Promise<void> {
  await assert.rejects(
    fn,
    (err: unknown) => {
      assert.strictEqual(pgErrorCode(err), code, message);
      return true;
    },
    message
  );
}

describe('B2 — Auth schema PostgreSQL integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('schema: all five B2 tables exist', async () => {
    await withIntegrationDb(async (db) => {
      for (const table of B2_TABLES) {
        const res = await db.execute(sql`SELECT to_regclass(${`public.${table}`}) AS t`);
        assert.ok((res.rows[0] as { t: string }).t, `${table} must exist`);
      }
    });
  });

  it('schema: organizations gained logo and metadata nullable columns', async () => {
    await withRuntimeSql(async (client) => {
      const res = await client.query(
        `SELECT column_name, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'organizations' AND column_name IN ('logo', 'metadata')
         ORDER BY column_name`
      );
      assert.strictEqual(res.rows.length, 2, 'logo and metadata must both exist');
      for (const row of res.rows) {
        assert.strictEqual(row.is_nullable, 'YES', `${row.column_name} must be nullable`);
      }
    });
  });

  it('schema: sessions.token is unique and expires_at rejects NULL', async () => {
    await withIntegrationDb(async (db) => {
      const org = await db.insert(organizations).values({ name: 'Sess Org', slug: `sess-${Date.now()}` }).returning();
      const user = await db.insert(users).values({ name: 'Sess User', email: `sess-${Date.now()}@example.com` }).returning();
      const token = `tok-${Date.now()}`;
      const future = new Date(Date.now() + 3600_000);
      await db.insert(sessions).values({ token, userId: user[0].id, expiresAt: future, activeOrganizationId: org[0].id });
      await rejectsWithCode(
        db,
        async () => {
          await db.insert(sessions).values({ token, userId: user[0].id, expiresAt: future });
        },
        '23505',
        'sessions.token must be unique'
      );
      await rejectsWithCode(
        db,
        async () => {
          await db.insert(sessions).values({ token: `tok2-${Date.now()}`, userId: user[0].id, expiresAt: null as unknown as Date });
        },
        '23502',
        'sessions.expires_at must be NOT NULL'
      );
    });
  });

  it('schema: auth_rate_limits.key is unique and count/last_request reject NULL', async () => {
    await withIntegrationDb(async (db) => {
      const key = `rl-${Date.now()}`;
      await db.insert(authRateLimits).values({ key, count: 1, lastRequest: Date.now() });
      await rejectsWithCode(
        db,
        async () => {
          await db.insert(authRateLimits).values({ key, count: 2, lastRequest: Date.now() });
        },
        '23505',
        'auth_rate_limits.key must be unique'
      );
      await rejectsWithCode(
        db,
        async () => {
          await db.insert(authRateLimits).values({ key: `rl2-${Date.now()}`, count: null as unknown as number, lastRequest: Date.now() });
        },
        '23502',
        'auth_rate_limits.count must be NOT NULL'
      );
      await rejectsWithCode(
        db,
        async () => {
          await db.insert(authRateLimits).values({ key: `rl3-${Date.now()}`, count: 1, lastRequest: null as unknown as number });
        },
        '23502',
        'auth_rate_limits.last_request must be NOT NULL'
      );
    });
  });

  it('fk: sessions CASCADE on user hard delete; active_organization_id is a plain hint column', async () => {
    await withIntegrationDb(async (db) => {
      const org = await db.insert(organizations).values({ name: 'Fk Org', slug: `fk-${Date.now()}` }).returning();
      const user = await db.insert(users).values({ name: 'Fk User', email: `fk-${Date.now()}@example.com` }).returning();
      const session = await db
        .insert(sessions)
        .values({ token: `fk-tok-${Date.now()}`, userId: user[0].id, expiresAt: new Date(Date.now() + 3600_000), activeOrganizationId: org[0].id })
        .returning();

      await db.delete(organizations).where(eq(organizations.id, org[0].id));
      const afterOrgDelete = await db.select().from(sessions).where(eq(sessions.id, session[0].id));
      assert.strictEqual(afterOrgDelete.length, 1, 'session must survive org hard delete (no FK on hint column)');
      assert.strictEqual(afterOrgDelete[0].activeOrganizationId, org[0].id, 'hint column must not be mutated by org hard delete');

      await db.delete(users).where(eq(users.id, user[0].id));
      const afterUserDelete = await db.select().from(sessions).where(eq(sessions.id, session[0].id));
      assert.strictEqual(afterUserDelete.length, 0, 'session must CASCADE on user hard delete');
    });
  });

  it('fk: accounts CASCADE on user hard delete', async () => {
    await withIntegrationDb(async (db) => {
      const user = await db.insert(users).values({ name: 'Acct User', email: `acct-${Date.now()}@example.com` }).returning();
      const account = await db
        .insert(accounts)
        .values({ userId: user[0].id, accountId: user[0].id, providerId: 'credential' })
        .returning();
      await db.delete(users).where(eq(users.id, user[0].id));
      const rows = await db.select().from(accounts).where(eq(accounts.id, account[0].id));
      assert.strictEqual(rows.length, 0, 'account must CASCADE on user hard delete');
    });
  });

  it('fk: organization_invitations CASCADE on org hard delete', async () => {
    await withIntegrationDb(async (db) => {
      const org = await db.insert(organizations).values({ name: 'Inv Org', slug: `inv-${Date.now()}` }).returning();
      const inviter = await db.insert(users).values({ name: 'Inviter', email: `inviter-${Date.now()}@example.com` }).returning();
      const invitation = await db
        .insert(organizationInvitations)
        .values({
          organizationId: org[0].id,
          email: `invitee-${Date.now()}@example.com`,
          status: 'pending',
          expiresAt: new Date(Date.now() + 3600_000),
          inviterId: inviter[0].id,
        })
        .returning();
      await db.delete(organizations).where(eq(organizations.id, org[0].id));
      const afterOrgDelete = await db.select().from(organizationInvitations).where(eq(organizationInvitations.id, invitation[0].id));
      assert.strictEqual(afterOrgDelete.length, 0, 'invitation must CASCADE on org hard delete');
    });
  });

  it('fk: organization_invitations CASCADE on inviter user hard delete', async () => {
    await withIntegrationDb(async (db) => {
      const org = await db.insert(organizations).values({ name: 'Inv User Org', slug: `invuser-${Date.now()}` }).returning();
      const inviter = await db.insert(users).values({ name: 'Inviter', email: `inviter2-${Date.now()}@example.com` }).returning();
      const invitation = await db
        .insert(organizationInvitations)
        .values({
          organizationId: org[0].id,
          email: `invitee2-${Date.now()}@example.com`,
          status: 'pending',
          expiresAt: new Date(Date.now() + 3600_000),
          inviterId: inviter[0].id,
        })
        .returning();
      await db.delete(users).where(eq(users.id, inviter[0].id));
      const afterInviterDelete = await db.select().from(organizationInvitations).where(eq(organizationInvitations.id, invitation[0].id));
      assert.strictEqual(afterInviterDelete.length, 0, 'invitation must CASCADE on inviter user hard delete');
    });
  });

  it('coexistence: B1 data and B2 auth rows live side by side', async () => {
    await withIntegrationDb(async (db) => {
      const org = await db
        .insert(organizations)
        .values({ name: 'Coexist Org', slug: `coexist-${Date.now()}`, logo: 'https://example.com/logo.png', metadata: '{"k":"v"}' })
        .returning();
      await db.insert(productEntitlements).values({ organizationId: org[0].id, promotorClass: false, promotorFlow: false });
      const user = await db.insert(users).values({ name: 'Coexist User', email: `coexist-${Date.now()}@example.com` }).returning();
      await db.insert(organizationMembers).values({ organizationId: org[0].id, userId: user[0].id, role: 'owner' });
      await db.insert(sessions).values({ token: `coexist-tok-${Date.now()}`, userId: user[0].id, expiresAt: new Date(Date.now() + 3600_000) });

      const orgRow = await db.select().from(organizations).where(eq(organizations.id, org[0].id));
      assert.strictEqual(orgRow[0].logo, 'https://example.com/logo.png');
      assert.strictEqual(orgRow[0].metadata, '{"k":"v"}');
      const memberCount = await db.execute(
        sql`SELECT COUNT(*)::int AS c FROM organization_members WHERE organization_id = ${org[0].id}`
      );
      assert.strictEqual((memberCount.rows[0] as { c: number }).c, 1);
      const sessionCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM sessions WHERE user_id = ${user[0].id}`);
      assert.strictEqual((sessionCount.rows[0] as { c: number }).c, 1);
    });
  });

  it('least privilege: promotor_runtime cannot execute DDL (CREATE TABLE)', async () => {
    await withRuntimeSql(async (client) => {
      await assert.rejects(async () => {
        await client.query(`CREATE TABLE b2_should_fail (id uuid PRIMARY KEY)`);
      });
    });
  });

  it('least privilege: promotor_runtime has CRUD on all five B2 tables (20 checks)', async () => {
    await withRuntimeSql(async (client) => {
      for (const table of B2_TABLES) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const res = await client.query(
            `SELECT has_table_privilege(current_user, 'public.${table}', $1) AS has`,
            [privilege]
          );
          assert.strictEqual(res.rows[0].has, true, `promotor_runtime must have ${privilege} on ${table}`);
        }
      }
    });
  });

  it('least privilege: promotor_runtime retains all 20 B1 grants (regression)', async () => {
    await withRuntimeSql(async (client) => {
      const b1Tables = ['organizations', 'users', 'organization_members', 'contacts', 'product_entitlements'];
      for (const table of b1Tables) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const res = await client.query(
            `SELECT has_table_privilege(current_user, 'public.${table}', $1) AS has`,
            [privilege]
          );
          assert.strictEqual(res.rows[0].has, true, `promotor_runtime must retain ${privilege} on ${table}`);
        }
      }
    });
  });

  it('migration: journal contains B1 then B2 in order', async () => {
    await withOwnerSql(async (client) => {
      const res = await client.query(`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`);
      assert.ok(res.rows.length >= 2, 'at least two applied migrations expected (0000 + 0001)');
      assert.strictEqual(Number(res.rows[0].id), 1, 'first journal entry must be the B1 migration');
      assert.strictEqual(Number(res.rows[1].id), 2, 'second journal entry must be the B2 migration');
      for (const row of res.rows) {
        assert.ok(typeof row.hash === 'string' && row.hash.length > 0, 'journal hash must be recorded');
      }
    });
  });
});
