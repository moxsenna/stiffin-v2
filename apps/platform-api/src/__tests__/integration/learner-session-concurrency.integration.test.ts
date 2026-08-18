import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { randomBytes, createHash } from 'node:crypto';
import {
  withIntegrationDb,
  withRuntimeSql,
  TEST_DATABASE_URL,
  applyMigrationsAsOwner,
} from './test-env';
import {
  organizations,
  contacts,
  programs,
  learnerAccessTokens,
} from '../../db/schema';
import { createLearnerSessionService } from '../../services/class/learner-session-service';
import { createApp } from '../../app';

const enabled = Boolean(TEST_DATABASE_URL);

const TEST_ENV = {
  HYPERDRIVE: { connectionString: TEST_DATABASE_URL ?? '' },
  BETTER_AUTH_SECRET: 'test-secret-0123456789-abcdef',
  BETTER_AUTH_URL: 'http://localhost:8787',
  BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:3000',
};

describe('P0 Hardened — Learner Session & Concurrency Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testOrgSlug: string;
  let testProgramId: string;
  let testProgramSlug: string;
  let testContactId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();
      testOrgSlug = `sess-org-${now}`;
      testProgramSlug = `sess-prog-${now}`;

      const [org] = await db
        .insert(organizations)
        .values({ name: 'Session Test Org', slug: testOrgSlug })
        .returning();
      testOrgId = org.id;

      const [prog] = await db
        .insert(programs)
        .values({
          organizationId: testOrgId,
          title: 'Session Test Program',
          slug: testProgramSlug,
          programType: 'lead_magnet',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      testProgramId = prog.id;

      const [cnt] = await db
        .insert(contacts)
        .values({
          organizationId: testOrgId,
          name: 'Concurrency Learner',
          phoneE164: `+62819${Math.floor(10000000 + Math.random() * 90000000)}`,
        })
        .returning();
      testContactId = cnt.id;
    });
  });

  it('proves exactly-once token redemption under concurrent race (§5, §33)', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: testOrgId,
        contactId: testContactId,
        tokenHash,
        expiresAt,
      });
    });

    // Launch 2 parallel redemption attempts with independent connection pools
    const results = await Promise.allSettled([
      withIntegrationDb(async (db) => {
        const sessionService = createLearnerSessionService(db);
        return sessionService.redeemToken(rawToken);
      }),
      withIntegrationDb(async (db) => {
        const sessionService = createLearnerSessionService(db);
        return sessionService.redeemToken(rawToken);
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly 1 concurrent redemption must succeed');
    assert.strictEqual(rejected.length, 1, 'Exactly 1 concurrent redemption must fail');

    const winnerResult = (fulfilled[0] as PromiseFulfilledResult<any>).value;
    assert.ok(winnerResult.sessionToken.startsWith('lsess_'));
    assert.strictEqual(winnerResult.contactId, testContactId);
    assert.strictEqual(winnerResult.organizationId, testOrgId);

    // Verify session validation
    await withIntegrationDb(async (db) => {
      const sessionService = createLearnerSessionService(db);
      const val = await sessionService.validateSession(winnerResult.sessionToken);
      assert.strictEqual(val.isValid, true);
      assert.strictEqual(val.session?.contactId, testContactId);
    });
  });

  it('rejects expired access token redemption fail-closed (§4)', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: testOrgId,
        contactId: testContactId,
        tokenHash,
        expiresAt: expiredAt,
      });
    });

    await withIntegrationDb(async (db) => {
      const sessionService = createLearnerSessionService(db);
      await assert.rejects(
        () => sessionService.redeemToken(rawToken),
        (err: any) => {
          assert.strictEqual(err.code, 'UNAUTHORIZED');
          return true;
        }
      );
    });
  });

  it('revoking a session invalidates subsequent access (§6)', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: testOrgId,
        contactId: testContactId,
        tokenHash,
        expiresAt,
      });
    });

    let sessionToken = '';
    let sessionId = '';

    await withIntegrationDb(async (db) => {
      const sessionService = createLearnerSessionService(db);
      const res = await sessionService.redeemToken(rawToken);
      sessionToken = res.sessionToken;
      sessionId = res.session.id;

      const val1 = await sessionService.validateSession(sessionToken);
      assert.strictEqual(val1.isValid, true);

      await sessionService.revokeSession(sessionId);

      const val2 = await sessionService.validateSession(sessionToken);
      assert.strictEqual(val2.isValid, false);
    });
  });

  it('HTTP API: sets HttpOnly cookie upon redemption and authorizes /api/v1/learner/me/enrollments (§6)', async () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await withIntegrationDb(async (db) => {
      await db.insert(learnerAccessTokens).values({
        organizationId: testOrgId,
        contactId: testContactId,
        tokenHash,
        expiresAt,
      });
    });

    const app = createApp();

    // 1. Redeem via HTTP endpoint
    const redeemRes = await app.request(
      '/api/v1/learner/auth/redeem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: rawToken }),
      },
      TEST_ENV as any
    );

    assert.strictEqual(redeemRes.status, 200);
    const redeemBody = (await redeemRes.json()) as any;
    assert.strictEqual(redeemBody.contactId, testContactId);

    const setCookieHeader = redeemRes.headers.get('set-cookie');
    assert.ok(setCookieHeader, 'Must set cookie header');
    assert.ok(setCookieHeader.includes('promotor_learner_session='), 'Must set promotor_learner_session');
    assert.ok(setCookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');

    // Extract cookie value
    const match = setCookieHeader.match(/promotor_learner_session=([^;]+)/);
    assert.ok(match, 'Must match session cookie value');
    const cookieVal = match[1];

    // 2. Access protected endpoint with cookie
    const enrollmentsRes = await app.request(
      '/api/v1/learner/me/enrollments',
      {
        method: 'GET',
        headers: {
          Cookie: `promotor_learner_session=${cookieVal}`,
        },
      },
      TEST_ENV as any
    );

    assert.strictEqual(enrollmentsRes.status, 200);
    const enrollmentsBody = (await enrollmentsRes.json()) as any;
    assert.ok(Array.isArray(enrollmentsBody.programs));

    // 3. Accessing without cookie fails 401 UNAUTHORIZED
    const unauthRes = await app.request(
      '/api/v1/learner/me/enrollments',
      { method: 'GET' },
      TEST_ENV as any
    );
    assert.strictEqual(unauthRes.status, 401);
  });
});
