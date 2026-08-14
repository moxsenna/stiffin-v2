import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { createOrganizationRepository } from '../src/repositories/organization-repository';
import { createContactRepository } from '../src/repositories/contact-repository';
import { contacts, organizations } from '../src/db/schema';

/**
 * B1 — Live Neon acceptance script (run manually by an operator).
 *
 * Environment:
 *   OWNER_DATABASE_URL   : neondb_owner credentials (migration + grant application)
 *   RUNTIME_DATABASE_URL : promotor_runtime credentials (what Hyperdrive uses)
 *
 * NEVER commit these values.
 *
 * REQUIRED OPERATOR SEQUENCE (this script does NOT run grants for you):
 *   1. Apply migration as owner:
 *        pnpm --filter @promotor/platform-api db:migrate
 *   2. Apply B1 grants as owner:
 *        psql "$OWNER_URL" -v owner_role=neondb_owner -f docs/sql/grants_b1.sql
 *   3. Run this acceptance script (runtime role)
 *   4. Verify Worker health (this script checks it too)
 *
 * Rehearse on a Neon BRANCH first, then repeat for production Neon.
 * If runtime grants are missing, this script FAILS with a clear message
 * instead of assuming they exist.
 *
 * Security: this script never prints connection strings, secrets, hostnames,
 * usernames, or raw database error messages. Failures use fixed safe codes.
 */
const OWNER_URL = process.env.OWNER_DATABASE_URL;
const RUNTIME_URL = process.env.RUNTIME_DATABASE_URL;

const results: { name: string; pass: boolean; detail?: string }[] = [];
function record(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main(): Promise<void> {
  if (!OWNER_URL || !RUNTIME_URL) {
    console.error('Required: OWNER_DATABASE_URL and RUNTIME_DATABASE_URL');
    process.exitCode = 2;
    return;
  }

  // 1. Owner: apply migrations.
  {
    const client = new Client({ connectionString: OWNER_URL });
    try {
      await client.connect();
      await migrate(drizzle(client), {
        migrationsFolder: join(process.cwd(), 'src', 'db', 'migrations'),
      });
      record('migration applied (owner role)', true);
    } catch {
      record('migration applied (owner role)', false, 'MIGRATION_FAILED');
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 2. Runtime: verify tables visible AND grants present.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    try {
      await client.connect();
      const tables = await client.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('organizations','users','organization_members','contacts','product_entitlements')`
      );
      record('runtime role sees all five B1 tables', tables.rows.length === 5);

      const hasGrants = await client
        .query(`SELECT has_table_privilege(current_user, 'public.contacts', 'SELECT,INSERT,UPDATE,DELETE') AS ok`)
        .then((r) => r.rows[0].ok === true)
        .catch(() => false);
      record(
        'runtime grants present (B1 CRUD)',
        hasGrants,
        hasGrants ? undefined : 'GRANTS_MISSING_RUN_grants_b1_sql'
      );
    } catch {
      record('runtime role sees all five B1 tables', false, 'RUNTIME_ACCESS_FAILED');
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 3. Runtime: CRUD roundtrip.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    try {
      await client.connect();
      const suffix = Date.now();
      const inserted = await client.query(
        `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
        [`B1 Acceptance ${suffix}`, `b1-acc-${suffix}`]
      );
      const id = inserted.rows[0].id;
      await client.query(`UPDATE organizations SET name = $1 WHERE id = $2`, [`B1 Acceptance ${suffix} v2`, id]);
      const read = await client.query(`SELECT name FROM organizations WHERE id = $1`, [id]);
      await client.query(`DELETE FROM organizations WHERE id = $1`, [id]);
      record('runtime role CRUD roundtrip', read.rows[0].name === `B1 Acceptance ${suffix} v2`);
    } catch {
      record('runtime role CRUD roundtrip', false, 'RUNTIME_CRUD_FAILED');
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 4. Runtime: forbidden DDL must fail.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    try {
      await client.connect();
      await client.query(`CREATE TABLE b1_forbidden (id uuid PRIMARY KEY)`);
      record('runtime role cannot execute DDL', false, 'DDL_UNEXPECTEDLY_ALLOWED');
    } catch {
      record('runtime role cannot execute DDL', true);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 5. Tenant isolation through repository layer.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    try {
      await client.connect();
      const db = drizzle(client);
      const orgRepo = createOrganizationRepository(db);
      const a = await orgRepo.create({ name: `Acc A ${Date.now()}`, slug: `acc-a-${Date.now()}` });
      const b = await orgRepo.create({ name: `Acc B ${Date.now()}`, slug: `acc-b-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
      const ca = await contactRepo.matchOrCreate({
        context: { organizationId: a.id },
        name: 'Tenant Probe',
        phoneRaw: '081200001111',
      });
      const crossRead = await contactRepo.findById({ organizationId: b.id }, ca.id);
      record('tenant isolation (cross-org read returns null)', crossRead === null);
      await db.delete(contacts).where(eq(contacts.id, ca.id));
      await db.delete(organizations).where(eq(organizations.id, a.id));
      await db.delete(organizations).where(eq(organizations.id, b.id));
    } catch {
      record('tenant isolation (cross-org read returns null)', false, 'TENANT_ISOLATION_FAILED');
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 6. Live Worker health endpoints.
  try {
    const res = await fetch('https://stiffin-promotor-api.moxsenna.workers.dev/health');
    record('worker GET /health returns 200', res.status === 200);
  } catch {
    record('worker GET /health returns 200', false, 'WORKER_UNREACHABLE');
  }
  try {
    const res = await fetch('https://stiffin-promotor-api.moxsenna.workers.dev/health/db');
    record('worker GET /health/db returns 200', res.status === 200);
  } catch {
    record('worker GET /health/db returns 200', false, 'WORKER_DB_UNREACHABLE');
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
  process.exitCode = failed.length > 0 ? 1 : 0;
}

void main();
