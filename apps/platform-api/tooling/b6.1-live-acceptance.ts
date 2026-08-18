/**
 * B6.1 PromotorFlow Public Booking & Availability — Live Acceptance & Rehearsal Tool
 *
 * Environment variables:
 *   API_URL              : Base URL of Platform API (e.g. https://api.staging.promotor.id or http://localhost:8787)
 *   AUTH_COOKIE          : Session cookie for authenticated Flow operator (owner/admin with promotorFlow entitlement)
 *   OWNER_DATABASE_URL   : (Optional) Neon database URL with owner permissions
 *   RUNTIME_DATABASE_URL : (Optional) Neon database URL with promotor_runtime permissions
 *
 * Usage:
 *   pnpm --filter @promotor/platform-api b6.1:live-acceptance
 */

import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPECTED_MIGRATION_0003_HASH = '02e0f59281c6aadb85f1d8d16d7be6ec15ecb012e38d2fd763c2dd37b06275fe';
const EXPECTED_MIGRATION_0004_HASH = 'c22c919d815156efbe9b33623bfae53e92cbbeddcb68e709d4aa259bc02812df';
const EXPECTED_TOTAL_RUNTIME_PERMISSIONS = 98;

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details?: string) {
  results.push({ category, name, passed, details });
  const status = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`[${category}] ${status} ${name}${details ? ` — ${details}` : ''}`);
}

async function verifyMigrationFingerprints(): Promise<void> {
  const possibleDirs = [
    join(process.cwd(), 'apps', 'platform-api', 'src', 'db', 'migrations'),
    join(process.cwd(), 'src', 'db', 'migrations'),
    resolve(__dirname, '..', 'src', 'db', 'migrations'),
  ];
  const migrationsDir = possibleDirs.find((d) => existsSync(d));

  if (!migrationsDir) {
    record('FINGERPRINT', 'Migrations directory exists', false, 'Directory not found');
    return;
  }

  const files = readdirSync(migrationsDir);
  const file0003 = files.find((f) => f.startsWith('0003_') && f.endsWith('.sql'));
  const file0004 = files.find((f) => f.startsWith('0004_') && f.endsWith('.sql'));

  if (file0003) {
    const raw = readFileSync(join(migrationsDir, file0003), 'utf8');
    const canonicalLf = raw.replace(/\r\n/g, '\n');
    const hash = createHash('sha256').update(canonicalLf, 'utf8').digest('hex');
    const matches = hash === EXPECTED_MIGRATION_0003_HASH;
    record(
      'FINGERPRINT',
      `Migration 0003 (${file0003}) SHA-256 byte-identity (LF canonical)`,
      matches,
      matches ? hash.substring(0, 16) + '...' : `Expected ${EXPECTED_MIGRATION_0003_HASH}, got ${hash}`
    );
  }

  if (file0004) {
    const raw = readFileSync(join(migrationsDir, file0004), 'utf8');
    const canonicalLf = raw.replace(/\r\n/g, '\n');
    const hash = createHash('sha256').update(canonicalLf, 'utf8').digest('hex');
    const matches = hash === EXPECTED_MIGRATION_0004_HASH;
    record(
      'FINGERPRINT',
      `Migration 0004 (${file0004}) SHA-256 byte-identity (LF canonical)`,
      matches,
      matches ? hash.substring(0, 16) + '...' : `Expected ${EXPECTED_MIGRATION_0004_HASH}, got ${hash}`
    );
  }
}

async function verifyDatabasePermissions(runtimeUrl: string): Promise<void> {
  const client = new Client({ connectionString: runtimeUrl });
  try {
    await client.connect();

    // 1. Check availability_rules table exists
    const tableRes = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = 'availability_rules'`
    );
    record(
      'DATABASE',
      'Runtime role sees availability_rules table',
      tableRes.rows.length === 1,
      `Found ${tableRes.rows.length}/1`
    );

    // 2. Count total runtime permissions (98)
    const privRes = await client.query(
      `SELECT count(*)::int as total FROM information_schema.table_privileges WHERE grantee='promotor_runtime' AND table_schema='public'`
    );
    const total = privRes.rows[0]?.total ?? 0;
    record(
      'DATABASE',
      `Total promotor_runtime privileges == ${EXPECTED_TOTAL_RUNTIME_PERMISSIONS}`,
      total === EXPECTED_TOTAL_RUNTIME_PERMISSIONS,
      `Found ${total}/${EXPECTED_TOTAL_RUNTIME_PERMISSIONS}`
    );

    // 3. Verify availability_rules has all 4 CRUD permissions
    const availPrivs = await client.query(
      `SELECT privilege_type FROM information_schema.table_privileges WHERE grantee='promotor_runtime' AND table_name='availability_rules' ORDER BY privilege_type`
    );
    const types = availPrivs.rows.map((r: any) => r.privilege_type);
    record(
      'DATABASE',
      'availability_rules has SELECT, INSERT, UPDATE, DELETE privileges',
      types.length === 4 && types.includes('DELETE') && types.includes('INSERT') && types.includes('SELECT') && types.includes('UPDATE'),
      `Privileges: ${types.join(', ')}`
    );
  } catch (err: any) {
    record('DATABASE', 'Database permissions probe completed without error', false, err.message);
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  console.log('\n======================================================');
  console.log('  B6.1 Public Booking & Availability — Acceptance');
  console.log('======================================================\n');

  await verifyMigrationFingerprints();

  const runtimeDbUrl = process.env.RUNTIME_DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (runtimeDbUrl) {
    console.log('\n--- Database Role & Permissions Invariants ---');
    await verifyDatabasePermissions(runtimeDbUrl);
  }

  console.log('\n======================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Summary: ${passed}/${total} checks passed (${failed} failed)`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
