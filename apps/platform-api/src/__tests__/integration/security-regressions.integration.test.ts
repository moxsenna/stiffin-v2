import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { withIntegrationDb, applyMigrationsAsOwner, TEST_DATABASE_URL } from './test-env';
import {
  organizations,
  contacts,
  programs,
  enrollments,
  learnerAccessTokens,
  learnerSessions,
  modules,
  lessons,
} from '../../db/schema';
import { createApp } from '../../app';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('Security Regression Invariants (10 Mandated Security Gates)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgBId: string;
  let contactAId: string;
  let contactBId: string;
  let programAId: string;
  let programBId: string;
  let enrollmentAId: string;
  let enrollmentBId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();

      // Org A
      const [orgA] = await db
        .insert(organizations)
        .values({ name: 'Sec Org A', slug: `sec-org-a-${now}` })
        .returning();
      orgAId = orgA.id;

      // Org B
      const [orgB] = await db
        .insert(organizations)
        .values({ name: 'Sec Org B', slug: `sec-org-b-${now}` })
        .returning();
      orgBId = orgB.id;

      // Contact A
      const [contactA] = await db
        .insert(contacts)
        .values({
          organizationId: orgAId,
          name: 'Learner A',
          phoneE164: `+62818${Math.floor(10000000 + Math.random() * 90000000)}`,
        })
        .returning();
      contactAId = contactA.id;

      // Contact B
      const [contactB] = await db
        .insert(contacts)
        .values({
          organizationId: orgBId,
          name: 'Learner B',
          phoneE164: `+62818${Math.floor(10000000 + Math.random() * 90000000)}`,
        })
        .returning();
      contactBId = contactB.id;

      // Program A
      const [progA] = await db
        .insert(programs)
        .values({
          organizationId: orgAId,
          title: 'Program A',
          slug: `sec-prog-a-${now}`,
          programType: 'lead_magnet',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      programAId = progA.id;

      // Program B
      const [progB] = await db
        .insert(programs)
        .values({
          organizationId: orgBId,
          title: 'Program B',
          slug: `sec-prog-b-${now}`,
          programType: 'lead_magnet',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      programBId = progB.id;

      // Enrollment A
      const [enrA] = await db
        .insert(enrollments)
        .values({
          organizationId: orgAId,
          programId: programAId,
          contactId: contactAId,
          status: 'ENROLLED',
          learningStatus: 'NOT_STARTED',
        })
        .returning();
      enrollmentAId = enrA.id;

      // Enrollment B
      const [enrB] = await db
        .insert(enrollments)
        .values({
          organizationId: orgBId,
          programId: programBId,
          contactId: contactBId,
          status: 'ENROLLED',
          learningStatus: 'NOT_STARTED',
        })
        .returning();
      enrollmentBId = enrB.id;
    });
  });

  it('1. raw learner session token absent from exchange JSON response body', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: orgAId,
        contactId: contactAId,
        tokenHash,
        expiresAt,
      });
    });

    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    // Must NOT contain any raw session token or secret keys
    assert.strictEqual(body.sessionToken, undefined, 'sessionToken must NOT be present in JSON');
    assert.strictEqual(body.token, undefined, 'token must NOT be present in JSON');
    assert.strictEqual(body.rawToken, undefined, 'rawToken must NOT be present in JSON');
    assert.strictEqual(body.secret, undefined, 'secret must NOT be present in JSON');
    assert.strictEqual(body.contactId, contactAId);
    assert.strictEqual(body.organizationId, orgAId);
  });

  it('2. session DB contains only hash (never plaintext token)', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: orgAId,
        contactId: contactAId,
        tokenHash,
        expiresAt,
      });
    });

    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );

    const setCookie = res.headers.get('set-cookie') || '';
    const match = setCookie.match(/promotor_learner_session=([^;]+)/);
    assert.ok(match, 'Must contain cookie');
    const rawSessionToken = match[1];

    await withIntegrationDb(async (db) => {
      const expectedHash = createHash('sha256').update(rawSessionToken).digest('hex');
      const dbSessions = await db.select().from(learnerSessions);
      const matched = dbSessions.find((s) => s.tokenHash === expectedHash);
      assert.ok(matched, 'DB must contain hashed session token');
      // Verify no DB session contains raw unhashed token
      const rawInDb = dbSessions.find((s) => (s as any).token === rawSessionToken || s.tokenHash === rawSessionToken);
      assert.strictEqual(rawInDb, undefined, 'DB must never store raw session token');
    });
  });

  it('3. cookie auth works to authenticate protected endpoints', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: orgAId,
        contactId: contactAId,
        tokenHash,
        expiresAt,
      });
    });

    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );
    const cookie = res.headers.get('set-cookie')!;

    const authRes = await app.request(
      '/api/v1/learner/me/enrollments',
      {
        method: 'GET',
        headers: { Cookie: cookie },
      },
      TEST_ENV as any
    );

    assert.strictEqual(authRes.status, 200);
  });

  it('4. expired session rejected with 401 fail-closed', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: orgAId,
        contactId: contactAId,
        tokenHash,
        expiresAt,
      });
    });

    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );
    const cookie = res.headers.get('set-cookie')!;
    const rawSessionToken = cookie.match(/promotor_learner_session=([^;]+)/)![1];
    const sessionHash = createHash('sha256').update(rawSessionToken).digest('hex');

    // Force expire in DB
    await withIntegrationDb(async (db) => {
      await db
        .update(learnerSessions)
        .set({ expiresAt: new Date(Date.now() - 3600000) })
        .where(eq(learnerSessions.tokenHash, sessionHash));
    });

    const expRes = await app.request(
      '/api/v1/learner/me/enrollments',
      {
        method: 'GET',
        headers: { Cookie: cookie },
      },
      TEST_ENV as any
    );

    assert.strictEqual(expRes.status, 401);
  });

  it('5. revoked session rejected with 401 fail-closed', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: orgAId,
        contactId: contactAId,
        tokenHash,
        expiresAt,
      });
    });

    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );
    const cookie = res.headers.get('set-cookie')!;
    const rawSessionToken = cookie.match(/promotor_learner_session=([^;]+)/)![1];
    const sessionHash = createHash('sha256').update(rawSessionToken).digest('hex');

    // Revoke session in DB
    await withIntegrationDb(async (db) => {
      await db
        .update(learnerSessions)
        .set({ revokedAt: new Date() })
        .where(eq(learnerSessions.tokenHash, sessionHash));
    });

    const revRes = await app.request(
      '/api/v1/learner/me/enrollments',
      {
        method: 'GET',
        headers: { Cookie: cookie },
      },
      TEST_ENV as any
    );

    assert.strictEqual(revRes.status, 401);
  });

  it('6. invalid access token rejected fail-closed', async () => {
    const app = createApp();
    const res = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: 'completely-invalid-nonexistent-token-hex' }),
      },
      TEST_ENV as any
    );

    assert.strictEqual(res.status, 401);
  });

  it('7. redeemed access token rejected on second attempt (exactly-once)', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: orgAId,
        contactId: contactAId,
        tokenHash,
        expiresAt,
      });
    });

    const app = createApp();

    // First attempt succeeds
    const res1 = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );
    assert.strictEqual(res1.status, 200);

    // Second attempt fails
    const res2 = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );
    assert.strictEqual(res2.status, 401);
  });

  it('8. repository contains no committed rehearsal credential in committed source', () => {
    const root = join(process.cwd(), 'src');
    const prohibitedHostPattern = ['ep', 'odd', 'hat'].join('-');
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (f.endsWith('.ts')) {
          if (f === 'security-regressions.integration.test.ts') continue;
          const content = readFileSync(full, 'utf8');
          assert.strictEqual(
            content.includes(prohibitedHostPattern),
            false,
            `File ${full} must not contain hardcoded rehearsal database host`
          );
          assert.strictEqual(
            content.includes('ci_runtime_pw') && !full.includes('test'),
            false,
            `Runtime source ${full} must not contain CI password`
          );
        }
      }
    };
    walk(root);
  });

  it('9. missing rehearsal DB secret fails closed', async () => {
    const app = createApp();
    const envWithoutDb = {
      ...TEST_ENV,
      HYPERDRIVE: { connectionString: '' },
    };

    const res = await app.request(
      '/health/db',
      { method: 'GET' },
      envWithoutDb as any
    );
    assert.strictEqual(res.status, 503, 'Missing DB connection string must fail closed with 503');
  });

  it('10. cross-org learner access still fails closed', async () => {
    // Authenticate Learner A (Org A)
    const rawTokenA = randomBytes(32).toString('hex');
    const tokenHashA = createHash('sha256').update(rawTokenA).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: orgAId,
        contactId: contactAId,
        tokenHash: tokenHashA,
        expiresAt,
      });
    });

    const app = createApp();
    const redeemA = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawTokenA }),
      },
      TEST_ENV as any
    );
    const cookieA = redeemA.headers.get('set-cookie')!;

    // Learner A attempts to access Enrollment B (Org B)
    const crossAccessRes = await app.request(
      `/api/v1/learner/enrollments/${enrollmentBId}`,
      {
        method: 'GET',
        headers: { Cookie: cookieA },
      },
      TEST_ENV as any
    );

    assert.ok(
      crossAccessRes.status === 403 || crossAccessRes.status === 404,
      `Cross-org access must return 403 or 404, got ${crossAccessRes.status}`
    );
  });
});
