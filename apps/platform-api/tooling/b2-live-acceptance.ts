/**
 * B2 — Live Neon acceptance script (run manually by an operator).
 *
 * Release/rehearsal tooling — NOT an automatic deployer.
 *
 * Modes:
 *   --plan           prints sanitized steps only; NO network, NO DB.
 *   --verify         READ-ONLY acceptance checks (safe for rehearsal AND
 *                    production). NO migrations, NO grants, NO DDL, NO
 *                    application-data mutation. FAIL-CLOSED: requires
 *                    RUNTIME_DATABASE_URL + OWNER_DATABASE_URL +
 *                    BETTER_AUTH_URL (all three) or it REFUSES non-zero;
 *                    no required check is ever silently skipped.
 *   --rehearse-auth  DISPOSABLE auth/application mutations. REQUIRES:
 *                      B2_TARGET_ENV=rehearsal-branch
 *                      B2_ALLOW_DISPOSABLE_MUTATIONS=YES
 *                    REFUSES B2_TARGET_ENV=production unconditionally.
 *                    Intended ONLY for a Neon rehearsal branch.
 *
 * Environment (canonical names; NEVER commit these values):
 *   RUNTIME_DATABASE_URL : promotor_runtime credentials (what Hyperdrive uses)
 *   OWNER_DATABASE_URL   : owner credentials (journal fingerprint only)
 *   BETTER_AUTH_URL      : Worker base URL (or local dev URL)
 *   BETTER_AUTH_SECRET   : Better Auth secret — REQUIRED ONLY for
 *                          --rehearse-auth; never read by --verify/--plan.
 *
 * REQUIRED OPERATOR SEQUENCE (this script does NOT run grants for you):
 *   1. Apply migrations as owner:  DATABASE_URL=... pnpm db:migrate
 *   2. Apply grants as owner:       psql ... -f docs/sql/grants_b1.sql && grants_b2.sql
 *   3. pnpm b2:live-acceptance --verify
 *   4. (rehearsal branch only) pnpm b2:live-acceptance --rehearse-auth
 *
 * Rehearse on a Neon BRANCH first, then repeat for production Neon.
 *
 * Security: this script never prints connection strings, secrets, hostnames,
 * usernames, session tokens, Set-Cookie values, disposable credentials, or raw
 * database error messages. Failures use fixed safe codes. Migration hashes are
 * safe release metadata and may be printed.
 */
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const B1_TABLES = ['organizations', 'users', 'organization_members', 'contacts', 'product_entitlements'] as const;
const B2_TABLES = ['sessions', 'accounts', 'verifications', 'organization_invitations', 'auth_rate_limits'] as const;
const CRUD_PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;
const EXPECTED_JOURNAL = ['0000_modern_hydra', '0001_material_king_bedlam'] as const;

/**
 * CANONICAL SOURCE FINGERPRINTS — Git/LF content, platform-independent.
 *
 * Drizzle hashes the raw migration bytes it reads. Git stores canonical LF
 * bytes (index `i/lf`); on a CRLF working tree the raw bytes differ and the
 * SHA-256 changes (e.g. Windows CRLF hashes: 0000 06f6…, 0001 6c43… — those
 * are NONCANONICAL diagnostics only). These constants are the LF hashes that
 * the DB journal MUST match. See docs/backend/B2_AUTH.md §migration fingerprint.
 */
const CANONICAL_MIGRATION_FINGERPRINTS: Record<string, string> = {
  '0000_modern_hydra': '86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689',
  '0001_material_king_bedlam': 'e5acd9851fe9f76920ed513ddb454dbb91ddc6bc2259a8caa591fe894c95c166',
};

const RUNTIME_URL = process.env.RUNTIME_DATABASE_URL;
const OWNER_URL = process.env.OWNER_DATABASE_URL;
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET;
const TARGET_ENV = process.env.B2_TARGET_ENV;
const ALLOW_MUTATIONS = process.env.B2_ALLOW_DISPOSABLE_MUTATIONS;

const SAFE_CODES = {
  OK: 'B2_ACCEPTANCE_OK',
  FAIL: 'B2_ACCEPTANCE_FAIL',
  REFUSED: 'B2_ACCEPTANCE_REFUSED',
  SKIP: 'B2_ACCEPTANCE_SKIP',
} as const;

function safeLog(label: string, ok: boolean, code?: string, detail?: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} [${label}] ${code ?? (ok ? SAFE_CODES.OK : SAFE_CODES.FAIL)}${detail ? ` (${detail})` : ''}`);
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Raw working-tree migration content fingerprints (SHA-256 of raw bytes). */
function localMigrationFingerprints(): Record<string, string> {
  const dir = join(process.cwd(), 'src', 'db', 'migrations');
  const out: Record<string, string> = {};
  for (const tag of EXPECTED_JOURNAL) {
    const file = join(dir, `${tag}.sql`);
    out[tag] = existsSync(file) ? sha256(readFileSync(file, 'utf8')) : '(missing)';
  }
  return out;
}

/**
 * Canonical source fingerprint check.
 *
 * Drizzle hashes the RAW bytes it reads. The DB journal therefore records raw
 * working-tree bytes. That must equal Git's canonical LF bytes. When the
 * working tree is CRLF, raw != canonical — REFUSE with MIGRATION_EOL_NOT_CANONICAL
 * rather than calling the CRLF hash canonical.
 */
function checkCanonicalFingerprints(rawFp: Record<string, string>): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const tag of EXPECTED_JOURNAL) {
    const raw = rawFp[tag];
    const canonical = CANONICAL_MIGRATION_FINGERPRINTS[tag];
    if (raw !== '(missing)' && raw === canonical) continue;
    // Distinguish "file missing" from "EOL non-canonical (CRLF)".
    failures.push(raw === '(missing)' ? `${tag}.sql missing` : `${tag}.sql EOL non-canonical (raw != canonical LF)`);
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Local journal verification: parse the actual meta/_journal.json and prove the
 * local canonical sequence is exactly [0000_modern_hydra, 0001_material_king_bedlam]
 * in that order. Do NOT rely on hard-coded filenames alone.
 */
function localJournalTags(): { tags: string[]; errors: string[] } {
  const journalPath = join(process.cwd(), 'src', 'db', 'migrations', 'meta', '_journal.json');
  const errors: string[] = [];
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries?: Array<{ tag?: string }> };
    tags = (parsed.entries ?? []).map((e) => e.tag ?? '(untagged)');
  } catch {
    errors.push('local _journal.json unreadable or malformed');
  }
  return { tags, errors };
}

/**
 * Connect + sanitize: wraps EVERY pg connection attempt (initial connect
 * included) so failures emit only a fixed safe code — never the raw pg/Node
 * error object, hostname, port, username, connection string, or TLS detail.
 */
async function connectSanitized(connectionString: string, code: string): Promise<Client | null> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    return client;
  } catch {
    safeLog(code, false, undefined, 'connection failed (safe code)');
    await client.end().catch(() => undefined);
    return null;
  }
}

// Guard: any unhandled rejection must never leak raw pg/Node internals.
process.on('unhandledRejection', (reason) => {
  console.error(`[B2_ACCEPTANCE] fatal safe-code: B2_ACCEPTANCE_UNHANDLED (${SAFE_CODES.FAIL})`);
  void reason; // never printed
  process.exitCode = 1;
});

async function planMode(): Promise<void> {
  console.log('B2 live acceptance — PLAN (no DB mutation, no network)');
  console.log('Operator steps:');
  console.log('  1. [owner] DATABASE_URL=<owner> pnpm --filter @promotor/platform-api db:migrate');
  console.log('  2. [owner] psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/grants_b1.sql');
  console.log('  3. [owner] psql "$OWNER_DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/grants_b2.sql');
  console.log('  4. [runtime] pnpm --filter @promotor/platform-api b2:live-acceptance --verify');
  console.log('  5. (rehearsal branch only) B2_TARGET_ENV=rehearsal-branch B2_ALLOW_DISPOSABLE_MUTATIONS=YES pnpm --filter @promotor/platform-api b2:live-acceptance --rehearse-auth');
  console.log('  6. [runtime] Worker /health + /health/db checks');
  const fp = localMigrationFingerprints();
  console.log('Canonical source migration fingerprints (SHA-256, Git/LF):');
  for (const tag of EXPECTED_JOURNAL) {
    console.log(`  ${tag}.sql  ${CANONICAL_MIGRATION_FINGERPRINTS[tag]}`);
  }
  console.log('Raw working-tree fingerprints (diagnostic only):');
  for (const [tag, hash] of Object.entries(fp)) {
    console.log(`  ${tag}.sql  ${hash}`);
  }
  console.log('Plan complete. No DB mutation performed.');
}

/**
 * --verify: read-only acceptance. FAIL-CLOSED — RUNTIME_DATABASE_URL,
 * OWNER_DATABASE_URL and BETTER_AUTH_URL are ALL required; any missing one
 * REFUSES with a sanitized fixed code and non-zero exit (never a silent SKIP).
 * No required acceptance check may be skipped.
 */
async function verifyMode(): Promise<number> {
  if (!RUNTIME_URL || !OWNER_URL || !BETTER_AUTH_URL) {
    const missing = [
      !RUNTIME_URL ? 'RUNTIME_DATABASE_URL' : null,
      !OWNER_URL ? 'OWNER_DATABASE_URL' : null,
      !BETTER_AUTH_URL ? 'BETTER_AUTH_URL' : null,
    ].filter(Boolean).join(', ');
    console.error(`[B2_ACCEPTANCE] REFUSED: --verify requires all of RUNTIME_DATABASE_URL, OWNER_DATABASE_URL, BETTER_AUTH_URL (missing: ${missing}) (${SAFE_CODES.REFUSED})`);
    return 1;
  }
  let failures = 0;
  const client = await connectSanitized(RUNTIME_URL, 'runtime connection');
  if (!client) {
    failures++;
    console.log(`B2 acceptance --verify complete. Failures: ${failures}`);
    return 1;
  }
  try {
    // 1. Tables exist (B1 + B2).
    for (const table of [...B1_TABLES, ...B2_TABLES]) {
      const res = await client.query('SELECT to_regclass($1) AS t', [`public.${table}`]);
      const ok = Boolean(res.rows[0]?.t);
      safeLog(`table ${table}`, ok);
      if (!ok) failures++;
    }

    // 2. Runtime privileges: 40/40.
    for (const table of [...B1_TABLES, ...B2_TABLES]) {
      for (const priv of CRUD_PRIVILEGES) {
        const res = await client.query('SELECT has_table_privilege(current_user, $1, $2) AS has', [`public.${table}`, priv]);
        const ok = res.rows[0].has === true;
        safeLog(`${table}.${priv}`, ok);
        if (!ok) failures++;
      }
    }

    // 3. Runtime CREATE privilege absent.
    const create = await client.query(`SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS has`);
    const ddlDenied = create.rows[0].has === false;
    safeLog('runtime CREATE denied', ddlDenied);
    if (!ddlDenied) failures++;

    // 4. LOCAL canonical journal: parse meta/_journal.json — must contain
    // exactly [0000_modern_hydra, 0001_material_king_bedlam] in order.
    const localJournal = localJournalTags();
    if (localJournal.errors.length > 0) {
      for (const e of localJournal.errors) {
        safeLog(`local journal: ${e}`, false);
        failures++;
      }
    } else {
      const localJournalOk =
        localJournal.tags.length === EXPECTED_JOURNAL.length &&
        localJournal.tags.every((tag, i) => tag === EXPECTED_JOURNAL[i]);
      safeLog('local journal exact sequence (0000_modern_hydra, 0001_material_king_bedlam)', localJournalOk);
      if (!localJournalOk) failures++;
    }

    // 5. CANONICAL source fingerprints (LF-normalized content = Git canonical).
    //    Raw working-tree bytes are diagnostic only; CRLF raw bytes that differ
    //    from canonical REFUSE with MIGRATION_EOL_NOT_CANONICAL.
    const rawFp = localMigrationFingerprints();
    const canonicalCheck = checkCanonicalFingerprints(rawFp);
    for (const tag of EXPECTED_JOURNAL) {
      const ok = canonicalCheck.failures.every((f) => !f.startsWith(`${tag}.sql`));
      safeLog(
        `canonical fingerprint ${tag}.sql == Git/LF (${CANONICAL_MIGRATION_FINGERPRINTS[tag]})`,
        ok,
        ok ? undefined : 'MIGRATION_EOL_NOT_CANONICAL',
        ok ? rawFp[tag] : 'raw working-tree bytes != canonical LF (likely CRLF)'
      );
      if (!ok) failures++;
    }

    // 6. DB journal: exact row count/order + hashes == CANONICAL Git/LF
    //    fingerprints (not the raw working-tree bytes — see check 5).
    const ownerClient = await connectSanitized(OWNER_URL, 'owner connection');
    if (!ownerClient) {
      failures++;
    } else {
      try {
        const journal = await ownerClient.query(
          `SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`
        );
        const dbHashes = journal.rows.map((r) => String(r.hash));
        const tagMatches = journal.rows.length === EXPECTED_JOURNAL.length;
        safeLog('journal exact entry count (2)', tagMatches);
        if (!tagMatches) failures++;
        for (let i = 0; i < EXPECTED_JOURNAL.length; i++) {
          const tag = EXPECTED_JOURNAL[i];
          const dbHash = dbHashes[i];
          const canonicalHash = CANONICAL_MIGRATION_FINGERPRINTS[tag];
          const ok = dbHash === canonicalHash;
          safeLog(
            `migration hash ${tag} == canonical Git/LF`,
            ok,
            ok ? undefined : 'MIGRATION_HASH_NOT_CANONICAL',
            ok ? dbHash : 'DB journal hash != canonical LF fingerprint'
          );
          if (!ok) failures++;
        }
      } catch {
        safeLog('migration journal readable', false);
        failures++;
      } finally {
        await ownerClient.end();
      }
    }

    // 7+8. Health endpoints (mandatory — never skipped).
    try {
      const health = await fetch(`${BETTER_AUTH_URL}/health`);
      safeLog('worker /health', health.ok);
      if (!health.ok) failures++;
    } catch {
      safeLog('worker /health reachable', false, SAFE_CODES.FAIL, 'network error (safe code)');
      failures++;
    }
    try {
      const healthDb = await fetch(`${BETTER_AUTH_URL}/health/db`);
      safeLog('worker /health/db (deployed Worker current Hyperdrive path)', healthDb.ok);
      if (!healthDb.ok) failures++;
    } catch {
      safeLog('worker /health/db reachable', false, SAFE_CODES.FAIL, 'network error (safe code)');
      failures++;
    }

    // 9. Rate-limit storage queryable.
    try {
      await client.query(`SELECT COUNT(*)::int AS c FROM auth_rate_limits`);
      safeLog('auth_rate_limits queryable', true);
    } catch {
      safeLog('auth_rate_limits queryable', false);
      failures++;
    }
  } catch {
    console.error('[B2_ACCEPTANCE] fatal safe-code: B2_ACCEPTANCE_FAIL_CONNECTION');
    failures++;
  } finally {
    await client.end();
  }
  console.log(`B2 acceptance --verify complete. Failures: ${failures}`);
  return failures === 0 ? 0 : 1;
}

/**
 * --rehearse-auth: disposable auth/application acceptance using the ACTUAL
 * frozen Phase C/D code in-process. Guards:
 *   B2_TARGET_ENV must be exactly "rehearsal-branch"
 *   B2_ALLOW_DISPOSABLE_MUTATIONS must be exactly "YES"
 *   B2_TARGET_ENV=production is REFUSED unconditionally.
 * The Neon branch itself is disposable, so no production cleanup is needed.
 */
async function rehearseAuthMode(): Promise<number> {
  if (TARGET_ENV === 'production') {
    console.error(`[B2_ACCEPTANCE] REFUSED: B2_TARGET_ENV=production is never allowed for --rehearse-auth (${SAFE_CODES.REFUSED})`);
    return 1;
  }
  if (TARGET_ENV !== 'rehearsal-branch' || ALLOW_MUTATIONS !== 'YES') {
    console.error(`[B2_ACCEPTANCE] REFUSED: --rehearse-auth requires B2_TARGET_ENV=rehearsal-branch AND B2_ALLOW_DISPOSABLE_MUTATIONS=YES (${SAFE_CODES.REFUSED})`);
    return 1;
  }
  if (!RUNTIME_URL || !BETTER_AUTH_SECRET) {
    console.error('RUNTIME_DATABASE_URL and BETTER_AUTH_SECRET are required for --rehearse-auth');
    return 1;
  }

  let failures = 0;
  // Dynamic imports of the actual frozen production code.
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { createAuth } = await import('../src/auth/create-auth');
  const { provisionPromotorUser } = await import('../src/auth/provisioning');
  const { createPromotorUserService } = await import('../src/services/promotor-user-service');
  const { createApp } = await import('../src/app');
  const { eq } = await import('drizzle-orm');
  const { sessions, productEntitlements } = await import('../src/db/schema');
  const { organizationMembers } = await import('../src/db/schema');

  const pool = new Pool({ connectionString: RUNTIME_URL });
  try {
    const db = drizzle(pool);
    const env = {
      HYPERDRIVE: { connectionString: RUNTIME_URL },
      BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: BETTER_AUTH_URL ?? 'http://localhost:8787',
      BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
    };
    // Test-only rate-limit seam is not used here — durable DB limiting with
    // enabled:true is part of what we prove.
    const auth = createAuth(db, env);
    // Build the full app BEFORE any request (Hono builds its router matcher on
    // first dispatch; no routes can be added afterwards). Entitlement probe
    // routes live under /api/rehearse/* — a test-only in-process composition,
    // NOT production routes (no /api/diag anywhere).
    const { requireOrganization, requireEntitlement } = await import('../src/auth/authorization');
    const { sessionMiddleware } = await import('../src/auth/session-middleware');
    const app = createApp();
    app.use('/api/rehearse/*', sessionMiddleware);
    app.get('/api/rehearse/class', requireOrganization(), requireEntitlement('promotorClass'), (c) => c.json({ ok: true }, 200));
    app.get('/api/rehearse/flow', requireOrganization(), requireEntitlement('promotorFlow'), (c) => c.json({ ok: true }, 200));

    const tag = Date.now();
    const email = `rehearse-${tag}@example.com`;
    const provisioned = await provisionPromotorUser(db, {
      name: 'B2 Rehearsal',
      email,
      password: 'password123',
      organizationName: 'B2 Rehearsal Org',
      organizationSlug: `b2-rehearse-${tag}`,
    });
    safeLog('A. trusted disposable provisioning', true);
    void provisioned;

    // B+C. sign-in + session round-trip.
    const signIn = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    }));
    const signInBody = (await signIn.json()) as { token?: string };
    const signInOk = Boolean(signInBody.token);
    safeLog('B. sign-in succeeds', signInOk);
    if (!signInOk) failures++;
    const setCookie = signIn.headers.get('set-cookie');
    const cookie = setCookie ? setCookie.split(';')[0] : '';
    const sessRes = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: { cookie },
    }));
    const sessBody = (await sessRes.json()) as { user?: unknown };
    safeLog('C. session cookie round-trip', Boolean(sessBody.user));
    if (!sessBody.user) failures++;

    // D. /api/me.
    const meRes = await app.request('/api/me', { headers: { cookie } }, env);
    const meBody = (await meRes.json()) as { user?: { email?: string }; organization?: unknown; membership?: unknown; entitlements?: unknown };
    const meOk = meRes.status === 200 && meBody.user?.email === email && Boolean(meBody.organization) && Boolean(meBody.membership) && Boolean(meBody.entitlements);
    safeLog('D. /api/me canonical user/org/membership/entitlements', meOk);
    if (!meOk) failures++;

    // E. valid UUID set-active.
    const setOk = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
      method: 'POST',
      headers: { cookie, origin: env.BETTER_AUTH_URL, 'content-type': 'application/json' },
      body: JSON.stringify({ organizationId: provisioned.organizationId }),
    }));
    safeLog('E. valid UUID set-active', [200, 302].includes(setOk.status));
    if (![200, 302].includes(setOk.status)) failures++;

    // F. malformed UUID set-active -> 403.
    const setBad = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
      method: 'POST',
      headers: { cookie, origin: env.BETTER_AUTH_URL, 'content-type': 'application/json' },
      body: JSON.stringify({ organizationId: 'not-a-uuid' }),
    }));
    safeLog('F. malformed UUID set-active -> 403', setBad.status === 403);
    if (setBad.status !== 403) failures++;

    // G. organizationSlug set-active -> 403.
    const setSlug = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/organization/set-active`, {
      method: 'POST',
      headers: { cookie, origin: env.BETTER_AUTH_URL, 'content-type': 'application/json' },
      body: JSON.stringify({ organizationSlug: 'whatever' }),
    }));
    safeLog('G. organizationSlug set-active -> 403', setSlug.status === 403);
    if (setSlug.status !== 403) failures++;

    // H. raw BA org list -> 403.
    const list = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/organization/list`, {
      method: 'GET',
      headers: { cookie, origin: env.BETTER_AUTH_URL },
    }));
    safeLog('H. raw BA /organization/list -> 403', list.status === 403);
    if (list.status !== 403) failures++;

    // I. public signup stays disabled.
    const signup = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X', email: `pub-${tag}@example.com`, password: 'password123' }),
    }));
    const signupBody = (await signup.json()) as { code?: string };
    safeLog('I. public signup disabled', signupBody.code === 'EMAIL_PASSWORD_SIGN_UP_DISABLED');
    if (signupBody.code !== 'EMAIL_PASSWORD_SIGN_UP_DISABLED') failures++;

    // J. user hard delete disabled.
    const delUser = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/delete-user`, {
      method: 'POST',
      headers: { cookie, origin: env.BETTER_AUTH_URL, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }));
    safeLog('J. BA user hard delete disabled', delUser.status !== 200);
    if (delUser.status === 200) failures++;

    // Entitlement boundary — the /api/rehearse/* routes were registered before
    // first dispatch; they reuse the real createApp error handling
    // (AuthError -> 401/403/500) and authLifecycle/sessionMiddleware.
    const baseUrl = env.BETTER_AUTH_URL;

    // false entitlement -> deny.
    await db.update(productEntitlements).set({ promotorClass: false, promotorFlow: false }).where(eq(productEntitlements.organizationId, provisioned.organizationId!));
    const classDeny = await app.request(`${baseUrl}/api/rehearse/class`, { headers: { cookie } }, env);
    const flowDeny = await app.request(`${baseUrl}/api/rehearse/flow`, { headers: { cookie } }, env);
    safeLog('K. promotorClass=false -> ENTITLEMENT_DENIED', classDeny.status === 403 && ((await classDeny.json()) as { error?: { code?: string } }).error?.code === 'ENTITLEMENT_DENIED');
    if (!(classDeny.status === 403)) failures++;
    const flowDenyBody = (await flowDeny.json()) as { error?: { code?: string } };
    safeLog('L. promotorFlow=false -> ENTITLEMENT_DENIED', flowDeny.status === 403 && flowDenyBody.error?.code === 'ENTITLEMENT_DENIED');
    if (!(flowDeny.status === 403 && flowDenyBody.error?.code === 'ENTITLEMENT_DENIED')) failures++;

    // true entitlement -> passes.
    await db.update(productEntitlements).set({ promotorClass: true, promotorFlow: true }).where(eq(productEntitlements.organizationId, provisioned.organizationId!));
    const classPass = await app.request(`${baseUrl}/api/rehearse/class`, { headers: { cookie } }, env);
    const flowPass = await app.request(`${baseUrl}/api/rehearse/flow`, { headers: { cookie } }, env);
    safeLog('M. true entitlement passes', classPass.status === 200 && flowPass.status === 200);
    if (!(classPass.status === 200 && flowPass.status === 200)) failures++;

    // Soft delete + session revocation (disposable identity only).
    const userSvc = createPromotorUserService(db);
    await userSvc.softDeletePromotorUser(provisioned.userId);
    const sessionsLeft = await db.select().from(sessions).where(eq(sessions.userId, provisioned.userId));
    const oldSess = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: { cookie },
    }));
    const oldSessBody = (await oldSess.json().catch(() => null)) as { user?: unknown } | null;
    const reSignIn = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    }));
    safeLog('N. soft-delete purges all sessions', sessionsLeft.length === 0);
    if (sessionsLeft.length !== 0) failures++;
    safeLog('O. old session rejected', !oldSessBody || !oldSessBody.user);
    if (oldSessBody?.user) failures++;
    safeLog('P. re-sign-in rejected', reSignIn.status === 401);
    if (reSignIn.status !== 401) failures++;
  } catch (err) {
    console.error('[B2_ACCEPTANCE] fatal safe-code: B2_ACCEPTANCE_FAIL_REHEARSE');
    failures++;
  } finally {
    await pool.end();
  }
  console.log(`B2 acceptance --rehearse-auth complete. Failures: ${failures}`);
  return failures === 0 ? 0 : 1;
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode === '--plan') {
    await planMode();
    return;
  }
  if (mode === '--verify') {
    process.exitCode = await verifyMode();
    return;
  }
  if (mode === '--rehearse-auth') {
    process.exitCode = await rehearseAuthMode();
    return;
  }
  console.error('Usage: tsx tooling/b2-live-acceptance.ts --plan | --verify | --rehearse-auth');
  process.exitCode = 1;
}

void main();
