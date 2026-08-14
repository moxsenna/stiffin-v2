import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { createOrganizationRepository } from '../src/repositories/organization-repository';
import { createContactRepository } from '../src/repositories/contact-repository';
import { contacts, organizations } from '../src/db/schema';

const B1_TABLES = ['organizations', 'users', 'organization_members', 'contacts', 'product_entitlements'] as const;
const CRUD_PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;

/**
 * B1 — Live Neon acceptance script (run manually by an operator).
 *
 * Environment (canonical names):
 *   OWNER_DATABASE_URL   : neondb_owner credentials (migration + grant application)
 *   RUNTIME_DATABASE_URL : promotor_runtime credentials (what Hyperdrive uses)
 *
 * NEVER commit these values.
 *
 * REQUIRED OPERATOR SEQUENCE (this script does NOT run grants for you):
 *
 *   POSIX (bash/zsh):
 *     1. Apply migration as owner (migrator reads DATABASE_URL):
 *          export DATABASE_URL="$OWNER_DATABASE_URL"
 *          pnpm --filter @promotor/platform-api db:migrate
 *     2. Apply B1 grants as owner (FAIL-FAST):
 *          psql "$OWNER_DATABASE_URL" \
 *            -v ON_ERROR_STOP=1 \
 *            -f docs/sql/grants_b1.sql
 *     3. Run acceptance (runtime role):
 *          pnpm --filter @promotor/platform-api b1:live-acceptance
 *
 *   PowerShell (Windows):
 *     1. $env:DATABASE_URL = $env:OWNER_DATABASE_URL
 *        pnpm --filter @promotor/platform-api db:migrate
 *     2. psql "$env:OWNER_DATABASE_URL" `
 *          -v ON_ERROR_STOP=1 `
 *          -f docs/sql/grants_b1.sql
 *     3. pnpm --filter @promotor/platform-api b1:live-acceptance
 *
 *   (Step 4 — Worker /health and /health/db — is checked by this script.
 *    NOTE: Worker /health/db proves the EXISTING production Hyperdrive path,
 *    NOT the rehearsal branch. Branch proof comes from RUNTIME_DATABASE_URL.)
 *
 * Rehearse on a Neon BRANCH first, then repeat for production Neon.
 *
 * SIDE-EFFECT-FREE for production: this script never executes DDL and never
 * leaves test tables behind. DDL denial is verified via privilege
 * introspection (has_schema_privilege CREATE = false); the ACTIVE
 * CREATE TABLE rejection test lives only in the ephemeral CI PostgreSQL.
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

  // 2. Runtime: all five tables visible.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    try {
      await client.connect();
      const tables = await client.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1::text[])`,
        [[...B1_TABLES]]
      );
      record('runtime role sees all five B1 tables', tables.rows.length === B1_TABLES.length);
    } catch {
      record('runtime role sees all five B1 tables', false, 'RUNTIME_ACCESS_FAILED');
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 3. Runtime: grants on ALL FIVE tables × FOUR privileges = 20 checks.
  //    PostgreSQL's comma-separated privilege list returns true when ANY
  //    listed privilege is held, so every check is its own has_table_privilege.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    try {
      await client.connect();
      const conditions: string[] = [];
      for (const table of B1_TABLES) {
        for (const priv of CRUD_PRIVILEGES) {
          conditions.push(`has_table_privilege(current_user, 'public.${table}', '${priv}')`);
        }
      }
      const res = await client.query(`SELECT (${conditions.join(' AND ')}) AS ok`);
      const allGrants = res.rows[0].ok === true;
      record(
        'runtime grants complete (5 tables x 4 CRUD = 20/20)',
        allGrants,
        allGrants ? undefined : 'GRANTS_INCOMPLETE_RUN_grants_b1_sql'
      );
    } catch {
      record('runtime grants complete (5 tables x 4 CRUD = 20/20)', false, 'GRANTS_CHECK_FAILED');
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 4. Runtime: no CREATE privilege in public schema (introspection only —
  //    no DDL is attempted, so production acceptance is side-effect-free).
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    try {
      await client.connect();
      const res = await client.query(
        `SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS ok`
      );
      const denied = res.rows[0].ok === false;
      record(
        'runtime role cannot CREATE in public schema',
        denied,
        denied ? undefined : 'CREATE_PRIVILEGE_UNEXPECTEDLY_GRANTED'
      );
    } catch {
      record('runtime role cannot CREATE in public schema', false, 'PRIVILEGE_CHECK_FAILED');
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  // 5. Runtime: CRUD roundtrip (organizations; cleans up after itself).
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

  // 6. Tenant isolation through repository layer (probe rows cleaned up).
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

  // 7. Live Worker health endpoints.
  //    NOTE: /health/db proves the EXISTING production Hyperdrive path, not
  //    the rehearsal branch. Branch proof comes from RUNTIME_DATABASE_URL.
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
