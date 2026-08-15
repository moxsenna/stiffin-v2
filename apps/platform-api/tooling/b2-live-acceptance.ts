/**
 * B2 — Live Neon acceptance script (run manually by an operator).
 *
 * Release/rehearsal tooling — NOT an automatic deployer.
 *
 * Modes:
 *   --plan     prints sanitized steps only; NO DB mutation, NO network.
 *   --verify   performs read/auth acceptance checks only where possible;
 *              NEVER applies migrations or grants.
 *
 * Environment (canonical names; NEVER commit these values):
 *   RUNTIME_DATABASE_URL : promotor_runtime credentials (what Hyperdrive uses)
 *   BETTER_AUTH_URL      : Worker base URL (or local dev URL)
 *   BETTER_AUTH_SECRET   : Better Auth secret (only used for local auth instance)
 *
 * REQUIRED OPERATOR SEQUENCE (this script does NOT run grants for you):
 *   1. Apply migrations as owner:  DATABASE_URL=... pnpm db:migrate
 *   2. Apply grants as owner:       psql ... -f docs/sql/grants_b1.sql && grants_b2.sql
 *   3. pnpm --filter @promotor/platform-api b2:live-acceptance --verify
 *
 * Rehearse on a Neon BRANCH first, then repeat for production Neon.
 *
 * SIDE-EFFECT-FREE for production: --verify never executes DDL, never applies
 * migrations/grants, and uses disposable test identities only. DDL denial is
 * verified via privilege introspection.
 *
 * Security: this script never prints connection strings, secrets, hostnames,
 * usernames, or raw database error messages. Failures use fixed safe codes.
 */
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const B1_TABLES = ['organizations', 'users', 'organization_members', 'contacts', 'product_entitlements'] as const;
const B2_TABLES = ['sessions', 'accounts', 'verifications', 'organization_invitations', 'auth_rate_limits'] as const;
const CRUD_PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;

const RUNTIME_URL = process.env.RUNTIME_DATABASE_URL;
const OWNER_URL = process.env.OWNER_DATABASE_URL;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;

const SAFE_CODES = {
  OK: 'B2_ACCEPTANCE_OK',
  FAIL: 'B2_ACCEPTANCE_FAIL',
  SKIP: 'B2_ACCEPTANCE_SKIP',
} as const;

function safeLog(code: string, label: string, ok: boolean, detail?: string): void {
  // detail is a fixed safe code/word, never raw credentials/errors.
  console.log(`${ok ? 'PASS' : 'FAIL'} [${label}] ${code}${detail ? ` (${detail})` : ''}`);
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Migration/journal fingerprints (safe metadata — file contents only). */
function fingerprintMigrations(): Record<string, string> {
  const dir = join(process.cwd(), 'src', 'db', 'migrations');
  const out: Record<string, string> = {};
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.sql')) {
      out[f] = sha256(readFileSync(join(dir, f), 'utf8'));
    } else if (f === 'meta') {
      const journal = readFileSync(join(dir, f, '_journal.json'), 'utf8');
      out['meta/_journal.json'] = sha256(journal);
    }
  }
  return out;
}

async function planMode(): Promise<void> {
  console.log('B2 live acceptance — PLAN (no DB mutation, no network)');
  console.log('Steps that an operator would run:');
  console.log('  1. [owner] DATABASE_URL=<owner> pnpm --filter @promotor/platform-api db:migrate');
  console.log('  2. [owner] psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/grants_b1.sql');
  console.log('  3. [owner] psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/grants_b2.sql');
  console.log('  4. [runtime] pnpm --filter @promotor/platform-api b2:live-acceptance --verify');
  console.log('  5. [runtime] Worker /health + /health/db checks');
  const fp = fingerprintMigrations();
  console.log('Migration fingerprints (computed locally, safe):');
  for (const [name, hash] of Object.entries(fp)) {
    console.log(`  ${name}  ${hash}`);
  }
  console.log('Plan complete. No DB mutation performed.');
}

async function verifyMode(): Promise<number> {
  if (!RUNTIME_URL) {
    console.error('RUNTIME_DATABASE_URL is required for --verify');
    return 1;
  }
  let failures = 0;
  const client = new Client({ connectionString: RUNTIME_URL });
  await client.connect();
  try {
    // 1. Tables exist (B1 + B2).
    for (const table of [...B1_TABLES, ...B2_TABLES]) {
      const res = await client.query('SELECT to_regclass($1) AS t', [`public.${table}`]);
      const ok = Boolean(res.rows[0]?.t);
      safeLog(ok ? SAFE_CODES.OK : SAFE_CODES.FAIL, `table ${table}`, ok);
      if (!ok) failures++;
    }

    // 2. Runtime privileges: B1 20 + B2 20 = 40.
    for (const table of [...B1_TABLES, ...B2_TABLES]) {
      for (const priv of CRUD_PRIVILEGES) {
        const res = await client.query('SELECT has_table_privilege(current_user, $1, $2) AS has', [`public.${table}`, priv]);
        const ok = res.rows[0].has === true;
        safeLog(ok ? SAFE_CODES.OK : SAFE_CODES.FAIL, `${table}.${priv}`, ok);
        if (!ok) failures++;
      }
    }

    // 3. DDL denied (privilege introspection — no DDL attempted).
    const create = await client.query(
      `SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS has`
    );
    const ddlDenied = create.rows[0].has === false;
    safeLog(ddlDenied ? SAFE_CODES.OK : SAFE_CODES.FAIL, 'runtime CREATE denied', ddlDenied);
    if (!ddlDenied) failures++;

    // 4. Migration journal present (owner-created table; runtime cannot read it —
    //    checked via the owner connection when OWNER_DATABASE_URL is provided).
    if (OWNER_URL) {
      const ownerClient = new Client({ connectionString: OWNER_URL });
      await ownerClient.connect();
      try {
        const journal = await ownerClient.query(`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`);
        const ok = journal.rows.length >= 2;
        safeLog(ok ? SAFE_CODES.OK : SAFE_CODES.FAIL, 'migration journal (>=2)', ok);
        if (!ok) failures++;
      } catch {
        safeLog(SAFE_CODES.FAIL, 'migration journal readable', false);
        failures++;
      } finally {
        await ownerClient.end();
      }
    } else {
      safeLog(SAFE_CODES.SKIP, 'migration journal (owner)', true, 'OWNER_DATABASE_URL not set');
    }

    // 5. Health endpoints (safe; no secrets).
    if (BETTER_AUTH_URL) {
      try {
        const health = await fetch(`${BETTER_AUTH_URL}/health`);
        const ok = health.ok;
        safeLog(ok ? SAFE_CODES.OK : SAFE_CODES.FAIL, 'worker /health', ok);
        if (!ok) failures++;
      } catch {
        safeLog(SAFE_CODES.FAIL, 'worker /health reachable', false, 'network error (safe code)');
        failures++;
      }
    } else {
      safeLog(SAFE_CODES.SKIP, 'worker /health', true, 'BETTER_AUTH_URL not set');
    }

    // 6. Durable rate-limit presence.
    try {
      const rl = await client.query(`SELECT COUNT(*)::int AS c FROM auth_rate_limits`);
      const ok = typeof rl.rows[0]?.c === 'number';
      safeLog(ok ? SAFE_CODES.OK : SAFE_CODES.FAIL, 'auth_rate_limits queryable', ok);
      if (!ok) failures++;
    } catch {
      safeLog(SAFE_CODES.FAIL, 'auth_rate_limits queryable', false);
      failures++;
    }
  } catch (err) {
    console.error('[B2_ACCEPTANCE] fatal safe-code: B2_ACCEPTANCE_FAIL_CONNECTION');
    failures++;
  } finally {
    await client.end();
  }
  console.log(`B2 acceptance --verify complete. Failures: ${failures}`);
  return failures === 0 ? 0 : 1;
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode === '--plan') {
    await planMode();
    return;
  }
  if (mode === '--verify') {
    const code = await verifyMode();
    process.exitCode = code;
    return;
  }
  console.error('Usage: tsx tooling/b2-live-acceptance.ts --plan | --verify');
  process.exitCode = 1;
}

void main();
