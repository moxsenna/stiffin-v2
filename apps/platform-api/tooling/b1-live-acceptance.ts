import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { normalizePhone } from '@promotor/platform-core';
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
 * NEVER commit these values. This script prints PASS/FAIL per assertion and
 * exits non-zero on failure. It never prints connection strings or secrets.
 *
 * Order of operations:
 *   1. Rehearse migrations against a Neon BRANCH first (same script, different URLs).
 *   2. When the branch rehearsal is green, run against production Neon.
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
    await client.connect();
    try {
      await migrate(drizzle(client), {
        migrationsFolder: join(process.cwd(), 'src', 'db', 'migrations'),
      });
      record('migration applied (owner role)', true);
    } catch (err) {
      record('migration applied (owner role)', false, sanitize(err));
    } finally {
      await client.end();
    }
  }

  // 2. Runtime: verify tables visible.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    await client.connect();
    try {
      const tables = await client.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('organizations','users','organization_members','contacts','product_entitlements')`
      );
      record('runtime role sees all five B1 tables', tables.rows.length === 5);
    } catch (err) {
      record('runtime role sees all five B1 tables', false, sanitize(err));
    } finally {
      await client.end();
    }
  }

  // 3. Runtime: CRUD roundtrip.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    await client.connect();
    try {
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
    } catch (err) {
      record('runtime role CRUD roundtrip', false, sanitize(err));
    } finally {
      await client.end();
    }
  }

  // 4. Runtime: forbidden DDL must fail.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    await client.connect();
    try {
      await client.query(`CREATE TABLE b1_forbidden (id uuid PRIMARY KEY)`);
      record('runtime role cannot execute DDL', false, 'CREATE TABLE unexpectedly succeeded');
    } catch {
      record('runtime role cannot execute DDL', true);
    } finally {
      await client.end();
    }
  }

  // 5. Tenant isolation through repository layer.
  {
    const client = new Client({ connectionString: RUNTIME_URL });
    await client.connect();
    try {
      const db = drizzle(client);
      const orgRepo = createOrganizationRepository(db);
      const a = await orgRepo.create({ name: `Acc A ${Date.now()}`, slug: `acc-a-${Date.now()}` });
      const b = await orgRepo.create({ name: `Acc B ${Date.now()}`, slug: `acc-b-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone);
      const ca = await contactRepo.matchOrCreate({
        context: { organizationId: a.id },
        name: 'Tenant Probe',
        phoneRaw: '081200001111',
      });
      const crossRead = await contactRepo.findById({ organizationId: b.id }, ca.id);
      record('tenant isolation (cross-org read returns null)', crossRead === null);
      // Cleanup probe rows.
      await db.delete(contacts).where(eq(contacts.id, ca.id));
      await db.delete(organizations).where(eq(organizations.id, a.id));
      await db.delete(organizations).where(eq(organizations.id, b.id));
    } catch (err) {
      record('tenant isolation (cross-org read returns null)', false, sanitize(err));
    } finally {
      await client.end();
    }
  }

  // 6. Live Worker health endpoints.
  try {
    const res = await fetch('https://stiffin-promotor-api.moxsenna.workers.dev/health');
    record('worker GET /health returns 200', res.status === 200);
  } catch (err) {
    record('worker GET /health returns 200', false, sanitize(err));
  }
  try {
    const res = await fetch('https://stiffin-promotor-api.moxsenna.workers.dev/health/db');
    record('worker GET /health/db returns 200', res.status === 200);
  } catch (err) {
    record('worker GET /health/db returns 200', false, sanitize(err));
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
  process.exitCode = failed.length > 0 ? 1 : 0;
}

function sanitize(err: unknown): string {
  if (err instanceof Error) return err.message.split('\n')[0].slice(0, 120);
  return String(err).slice(0, 120);
}

void main();
