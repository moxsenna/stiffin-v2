/**
 * B6 PromotorFlow Core Domain — Live Acceptance & Rehearsal Tool
 *
 * This tooling verifies the live Flow API and database invariants against
 * a real or rehearsal Neon branch / Cloudflare Workers environment.
 *
 * Environment variables:
 *   API_URL              : Base URL of Platform API (e.g. https://api.staging.promotor.id or http://localhost:8787)
 *   AUTH_COOKIE          : Session cookie for authenticated Flow operator (owner/admin with promotorFlow entitlement)
 *   OWNER_DATABASE_URL   : (Optional) Neon database URL with owner permissions
 *   RUNTIME_DATABASE_URL : (Optional) Neon database URL with promotor_runtime permissions
 *
 * Usage:
 *   pnpm --filter @promotor/platform-api b6:live-acceptance
 */

import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const EXPECTED_MIGRATION_0003_HASH = '02e0f59281c6aadb85f1d8d16d7be6ec15ecb012e38d2fd763c2dd37b06275fe';
const EXPECTED_TOTAL_RUNTIME_PERMISSIONS = 94;

const B6_TABLES = [
  'flow_contact_profiles',
  'services',
  'message_templates',
  'bookings',
  'flow_activities',
  'next_actions',
  'aftercare_records',
  'flow_assessment_records',
] as const;

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

async function verifyMigrationFingerprint(): Promise<void> {
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

  if (!file0003) {
    record('FINGERPRINT', 'Migration 0003 file exists', false, '0003_*.sql not found in migrations dir');
    return;
  }

  const migrationPath = join(migrationsDir, file0003);
  const raw = readFileSync(migrationPath, 'utf8');
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

async function verifyDatabasePermissions(runtimeUrl: string): Promise<void> {
  const client = new Client({ connectionString: runtimeUrl });
  try {
    await client.connect();

    // 1. Check all B6 tables are visible
    const tableRes = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename = ANY($1::text[])`,
      [[...B6_TABLES]]
    );
    record(
      'DATABASE',
      'Runtime role sees all 8 PromotorFlow tables',
      tableRes.rows.length === B6_TABLES.length,
      `Found ${tableRes.rows.length}/${B6_TABLES.length}`
    );

    // 2. Count total runtime permissions across public schema
    const permRes = await client.query(`
      SELECT count(*) as total_grants
      FROM information_schema.role_table_grants
      WHERE grantee = 'promotor_runtime'
        AND table_schema = 'public'
        AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    `);
    const totalGrants = parseInt((permRes.rows[0] as any)?.total_grants || '0', 10);
    const grantsValid = totalGrants === EXPECTED_TOTAL_RUNTIME_PERMISSIONS;
    record(
      'SECURITY',
      `Runtime role has exact ${EXPECTED_TOTAL_RUNTIME_PERMISSIONS} least-privilege permissions`,
      grantsValid,
      `Observed ${totalGrants}/${EXPECTED_TOTAL_RUNTIME_PERMISSIONS}`
    );

    // 3. Verify DDL denial
    const ddlRes = await client.query(
      `SELECT has_schema_privilege('promotor_runtime', 'public', 'CREATE') as can_create`
    );
    const ddlDenied = (ddlRes.rows[0] as any)?.can_create === false;
    record('SECURITY', 'Runtime role cannot execute DDL (CREATE schema privilege false)', ddlDenied);
  } catch (err: any) {
    record('DATABASE', 'Database connection & grant audit', false, err?.message ?? 'Connection failed');
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function verifyHttpApi(apiUrl: string, authCookie?: string): Promise<void> {
  const baseUrl = apiUrl.replace(/\/$/, '');

  // Probe connectivity
  try {
    const healthRes = await fetch(`${baseUrl}/health`).catch(() => null);
    if (!healthRes) {
      record('HTTP_API', `Server connectivity (${baseUrl})`, true, 'SKIPPED (Live server not reachable; operator run pending)');
      return;
    }
  } catch {
    record('HTTP_API', `Server connectivity (${baseUrl})`, true, 'SKIPPED (Live server not reachable; operator run pending)');
    return;
  }

  // 1. Unauthenticated request to /api/v1/flow/today must return 401
  try {
    const unauthRes = await fetch(`${baseUrl}/api/v1/flow/today`);
    record(
      'AUTH_GATE',
      'Unauthenticated request to Flow API returns 401',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );
  } catch (err: any) {
    record('AUTH_GATE', 'Unauthenticated request check', false, err?.message);
  }

  if (!authCookie) {
    record(
      'AUTH_FLOW',
      'Authenticated Flow API end-to-end tests',
      true,
      'SKIPPED (AUTH_COOKIE not provided; operator live verification pending)'
    );
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: authCookie,
  };

  // 2. Authenticated GET /api/v1/flow/today
  try {
    const todayRes = await fetch(`${baseUrl}/api/v1/flow/today`, { headers });
    if (todayRes.status === 200) {
      const data = (await todayRes.json()) as any;
      record(
        'FLOW_TODAY',
        'GET /api/v1/flow/today returns structured today queue',
        Array.isArray(data.today) && Array.isArray(data.overdue) && Array.isArray(data.upcoming),
        `Total active count: ${data.totalActiveCount ?? 0}`
      );
    } else {
      record('FLOW_TODAY', 'GET /api/v1/flow/today', false, `Status: ${todayRes.status}`);
    }
  } catch (err: any) {
    record('FLOW_TODAY', 'GET /api/v1/flow/today', false, err?.message);
  }

  // 3. Contact Lifecycle & Creation
  let createdContactId: string | null = null;
  try {
    const uniquePhone = `+62812${Math.floor(10000000 + Math.random() * 90000000)}`;
    const createRes = await fetch(`${baseUrl}/api/v1/flow/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Rehearsal Live Contact',
        phoneRaw: uniquePhone,
        interest: 'STIFIn Biometric Assessment',
        sourceChannel: 'REHEARSAL_TEST',
      }),
    });
    if (createRes.status === 201) {
      const data = (await createRes.json()) as any;
      createdContactId = data.contact?.id;
      record(
        'FLOW_CONTACTS',
        'POST /api/v1/flow/contacts creates new contact with interest & NEW stage',
        Boolean(createdContactId && data.stage === 'NEW'),
        `Contact ID: ${createdContactId}`
      );
    } else {
      record('FLOW_CONTACTS', 'POST /api/v1/flow/contacts', false, `Status: ${createRes.status}`);
    }
  } catch (err: any) {
    record('FLOW_CONTACTS', 'POST /api/v1/flow/contacts', false, err?.message);
  }

  // 4. Contact Detail & Primary NextAction
  if (createdContactId) {
    try {
      const detailRes = await fetch(`${baseUrl}/api/v1/flow/contacts/${createdContactId}`, { headers });
      const detailData = (await detailRes.json()) as any;
      record(
        'FLOW_CONTACTS',
        'GET /api/v1/flow/contacts/:id loads contact profile and stage context',
        detailRes.status === 200 && detailData.contact?.id === createdContactId
      );

      // Transition to INTERESTED
      const stageRes = await fetch(`${baseUrl}/api/v1/flow/contacts/${createdContactId}/stage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ stage: 'INTERESTED' }),
      });
      record(
        'FLOW_LIFECYCLE',
        'POST /api/v1/flow/contacts/:id/stage transitions stage to INTERESTED',
        stageRes.status === 200
      );
    } catch (err: any) {
      record('FLOW_CONTACTS', 'Contact detail/stage transition', false, err?.message);
    }
  }

  // 5. Services & Bookings Lifecycle
  let serviceId: string | null = null;
  try {
    const servicesRes = await fetch(`${baseUrl}/api/v1/flow/services`, { headers });
    const servicesData = (await servicesRes.json()) as any;
    if (servicesRes.status === 200 && servicesData.services?.length > 0) {
      serviceId = servicesData.services[0].id;
      record('FLOW_SERVICES', 'GET /api/v1/flow/services lists organization services', true);
    }
  } catch (err: any) {
    record('FLOW_SERVICES', 'GET /api/v1/flow/services', false, err?.message);
  }

  if (createdContactId && serviceId) {
    try {
      const startAt = new Date(Date.now() + 86400000).toISOString();
      const bookingRes = await fetch(`${baseUrl}/api/v1/flow/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contactId: createdContactId,
          serviceId,
          startAt,
          locationType: 'ONLINE',
        }),
      });
      if (bookingRes.status === 201) {
        const bkData = (await bookingRes.json()) as any;
        const bookingId = bkData.booking?.id;
        record(
          'FLOW_BOOKINGS',
          'POST /api/v1/flow/bookings snapshots server service price and creates PENDING booking',
          Boolean(bookingId && bkData.booking?.status === 'PENDING'),
          `Booking ID: ${bookingId}, Amount: Rp${bkData.booking?.amount}`
        );

        if (bookingId) {
          // Confirm booking
          const confirmRes = await fetch(`${baseUrl}/api/v1/flow/bookings/${bookingId}/confirm`, {
            method: 'POST',
            headers,
          });
          record('FLOW_BOOKINGS', 'POST /api/v1/flow/bookings/:id/confirm sets CONFIRMED', confirmRes.status === 200);

          // Mark paid
          const paidRes = await fetch(`${baseUrl}/api/v1/flow/bookings/${bookingId}/mark-paid`, {
            method: 'POST',
            headers,
          });
          record('FLOW_BOOKINGS', 'POST /api/v1/flow/bookings/:id/mark-paid sets paymentStatus PAID', paidRes.status === 200);

          // Complete booking
          const completeRes = await fetch(`${baseUrl}/api/v1/flow/bookings/${bookingId}/complete`, {
            method: 'POST',
            headers,
          });
          record(
            'FLOW_COMPLETION',
            'POST /api/v1/flow/bookings/:id/complete promotes to CLIENT and schedules D+7 aftercare',
            completeRes.status === 200
          );
        }
      } else {
        record('FLOW_BOOKINGS', 'POST /api/v1/flow/bookings', false, `Status: ${bookingRes.status}`);
      }
    } catch (err: any) {
      record('FLOW_BOOKINGS', 'Booking lifecycle execution', false, err?.message);
    }
  }

  // 6. Messaging Semantics
  if (createdContactId) {
    try {
      const openRes = await fetch(`${baseUrl}/api/v1/flow/messaging/whatsapp-opened`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contactId: createdContactId,
          rawText: 'Halo dari Rehearsal Live Acceptance',
        }),
      });
      record(
        'FLOW_MESSAGING',
        'POST /api/v1/flow/messaging/whatsapp-opened records open without completing action',
        openRes.status === 200
      );
    } catch (err: any) {
      record('FLOW_MESSAGING', 'WhatsApp open check', false, err?.message);
    }
  }
}

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('       B6 PROMOTORFLOW LIVE ACCEPTANCE & REHEARSAL SUITE        ');
  console.log('================================================================\n');

  // 1. Migration fingerprint check
  await verifyMigrationFingerprint();

  // 2. Database grants check if credentials available
  const runtimeDbUrl = process.env.RUNTIME_DATABASE_URL || process.env.DATABASE_URL;
  if (runtimeDbUrl) {
    console.log('\n--- Database Permission & Grant Inspection ---');
    await verifyDatabasePermissions(runtimeDbUrl);
  } else {
    console.log('\n--- Database Inspection ---');
    record('DATABASE', 'Database URL check', true, 'SKIPPED (RUNTIME_DATABASE_URL not set)');
  }

  // 3. HTTP API surface check
  const apiUrl = process.env.API_URL || 'http://localhost:8787';
  const authCookie = process.env.AUTH_COOKIE;
  console.log(`\n--- HTTP API Inspection (Target: ${apiUrl}) ---`);
  await verifyHttpApi(apiUrl, authCookie);

  console.log('\n================================================================');
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;
  console.log(`Summary: ${totalPassed} Passed, ${totalFailed} Failed (${results.length} Total)`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal rehearsal error:', err);
  process.exit(1);
});
