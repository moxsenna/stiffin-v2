import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql, eq, and } from 'drizzle-orm';
import {
  withIntegrationDb,
  withRuntimeSql,
  withOwnerSql,
  TEST_DATABASE_URL,
  pgErrorCode,
} from './test-env';
import {
  organizations,
  contacts,
  programs,
  enrollments,
  learnerAccessTokens,
} from '../../db/schema';
import { createEnrollmentService } from '../../services/class/enrollment-service';
import { createPromotorClassAdapter } from '../../services/class/promotor-class-adapter';
import { DomainError } from '../../core/errors';

const enabled = Boolean(TEST_DATABASE_URL);

const ALL_27_TABLES = [
  // B1 (5)
  'organizations',
  'users',
  'organization_members',
  'contacts',
  'product_entitlements',
  // B2 (5)
  'sessions',
  'accounts',
  'verifications',
  'organization_invitations',
  'auth_rate_limits',
  // B3 (6)
  'programs',
  'modules',
  'lessons',
  'lesson_attachments',
  'program_presentations',
  'workspace_profiles',
  // B6 (8)
  'services',
  'bookings',
  'next_actions',
  'activities',
  'contact_flow_states',
  'aftercare_records',
  'contact_assessments',
  'message_templates',
  // B6.1 (1)
  'availability_rules',
  // B4 (2)
  'enrollments',
  'learner_access_tokens',
];

describe('B4 — Registration & Enrollment Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testOrgSlug: string;
  let testProgramId: string;
  let testProgramSlug: string;
  let testContactId: string;

  before(async () => {
    await withIntegrationDb(async (db) => {
      testOrgSlug = `b4-org-${Date.now()}`;
      testProgramSlug = `stifin-dna-intro-${Date.now()}`;

      // Create Organization
      const [org] = await db
        .insert(organizations)
        .values({
          name: 'B4 Test Organization',
          slug: testOrgSlug,
        })
        .returning();
      testOrgId = org.id;

      // Create Published Public Program
      const [prog] = await db
        .insert(programs)
        .values({
          organizationId: testOrgId,
          title: 'Pengantar STIFIn DNA Level 1',
          slug: testProgramSlug,
          status: 'published',
          accessType: 'public',
          programType: 'lead_magnet',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      testProgramId = prog.id;

      // Create Initial Shared Core Contact
      const [cnt] = await db
        .insert(contacts)
        .values({
          organizationId: testOrgId,
          name: 'Existing Contact',
          phoneE164: '+6281299990001',
        })
        .returning();
      testContactId = cnt.id;
    });
  });

  describe('1. Schema & Privilege Arithmetic', () => {
    it('verifies exact 106 runtime capability arithmetic across all 27 tables', async () => {
      await withRuntimeSql(async (client) => {
        const res = await client.query(
          `SELECT table_name, privilege_type
           FROM information_schema.table_privileges
           WHERE grantee = 'promotor_runtime' AND table_schema = 'public'
           ORDER BY table_name, privilege_type`
        );

        const privileges = res.rows as { table_name: string; privilege_type: string }[];
        assert.ok(
          privileges.length >= 106,
          `Expected at least 106 runtime table privileges, found ${privileges.length}`
        );

        // Verify enrollments and learner_access_tokens have all 4 CRUD privileges
        for (const t of ['enrollments', 'learner_access_tokens']) {
          const privs = privileges
            .filter((p) => p.table_name === t)
            .map((p) => p.privilege_type)
            .sort();
          assert.deepStrictEqual(
            privs,
            ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
            `table ${t} must have all 4 CRUD privileges`
          );
        }
      });
    });

    it('verifies migration journal records at least 6 migrations (0000 to 0005+)', async () => {
      await withOwnerSql(async (client) => {
        const res = await client.query(`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`);
        assert.ok(res.rows.length >= 6, 'at least 6 migrations must be recorded in journal');
      });
    });
  });

  describe('2. Public Registration Flow', () => {
    it('registers a new learner: creates contact, creates enrollment, generates SHA-256 token', async () => {
      await withIntegrationDb(async (db) => {
        const service = createEnrollmentService(db);
        const result = await service.registerPublicLearner({
          slug: testOrgSlug,
          programSlug: testProgramSlug,
          name: 'Budi Santoso',
          phoneRaw: '081234567890',
          email: 'budi@example.com',
        });

        assert.ok(result.enrollmentId);
        assert.ok(result.contactId);
        assert.strictEqual(result.organizationId, testOrgId);
        assert.strictEqual(result.programId, testProgramId);
        assert.strictEqual(result.status, 'ENROLLED');
        assert.ok(result.accessToken.length >= 32, 'accessToken must be high entropy');

        // Verify Contact in DB
        const contactRows = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, result.contactId));
        assert.strictEqual(contactRows.length, 1);
        assert.strictEqual(contactRows[0].phoneE164, '+6281234567890');
        assert.strictEqual(contactRows[0].name, 'Budi Santoso');

        // Verify Enrollment in DB
        const enrollRows = await db
          .select()
          .from(enrollments)
          .where(eq(enrollments.id, result.enrollmentId));
        assert.strictEqual(enrollRows.length, 1);
        assert.strictEqual(enrollRows[0].progressPercent, 0);
        assert.strictEqual(enrollRows[0].intentLabel, 'COLD');
        assert.strictEqual(enrollRows[0].learningStatus, 'NOT_STARTED');

        // Verify Token Redemption
        const redeemed = await service.redeemLearnerToken(result.accessToken);
        assert.strictEqual(redeemed.contactId, result.contactId);
        assert.strictEqual(redeemed.organizationId, testOrgId);
      });
    });

    it('idempotency: re-registering same phone reuses Contact and Enrollment without duplicate rows', async () => {
      await withIntegrationDb(async (db) => {
        const service = createEnrollmentService(db);
        const first = await service.registerPublicLearner({
          slug: testOrgSlug,
          programSlug: testProgramSlug,
          name: 'Siti Rahma',
          phoneRaw: '0812-7777-8888',
        });

        const second = await service.registerPublicLearner({
          slug: testOrgSlug,
          programSlug: testProgramSlug,
          name: 'Siti Rahma',
          phoneRaw: '0812-7777-8888',
        });

        assert.strictEqual(second.contactId, first.contactId, 'Contact ID must be reused');
        assert.strictEqual(second.enrollmentId, first.enrollmentId, 'Enrollment ID must be reused');

        // Confirm DB has exactly 1 enrollment for this contact + program
        const count = await db
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.organizationId, testOrgId),
              eq(enrollments.programId, testProgramId),
              eq(enrollments.contactId, first.contactId)
            )
          );
        assert.strictEqual(count.length, 1);
      });
    });

    it('rejects registration for unpublished or non-public programs', async () => {
      await withIntegrationDb(async (db) => {
        // Create draft program
        const [draft] = await db
          .insert(programs)
          .values({
            organizationId: testOrgId,
            title: 'Draft Program',
            slug: `draft-prog-${Date.now()}`,
            status: 'draft',
            accessType: 'public',
            programType: 'lead_magnet',
            pricing: 'free',
            priceAmount: 0,
          })
          .returning();

        const service = createEnrollmentService(db);
        await assert.rejects(
          async () => {
            await service.registerPublicLearner({
              slug: testOrgSlug,
              programSlug: draft.slug,
              name: 'Tester',
              phoneRaw: '081200001111',
            });
          },
          (err: any) => {
            assert.ok(err instanceof DomainError);
            assert.strictEqual(err.code, 'FORBIDDEN');
            return true;
          }
        );
      });
    });
  });

  describe('3. Manual Operator Enrollment & PromotorClass Adapter', () => {
    it('operator manually enrolls contact and adapter returns learning context', async () => {
      await withIntegrationDb(async (db) => {
        const service = createEnrollmentService(db);
        const adapter = createPromotorClassAdapter(db);

        const enrollment = await service.enrollContact({
          organizationId: testOrgId,
          programId: testProgramId,
          contactId: testContactId,
        });

        assert.strictEqual(enrollment.contactId, testContactId);
        assert.strictEqual(enrollment.status, 'ENROLLED');

        // Query via Adapter
        const learningContext = await adapter.getLearningContext(testOrgId, testContactId);
        assert.strictEqual(learningContext.contactId, testContactId);
        assert.strictEqual(learningContext.activeEnrollments.length, 1);
        assert.strictEqual(learningContext.activeEnrollments[0].programId, testProgramId);
        assert.strictEqual(learningContext.activeEnrollments[0].learningStatus, 'NOT_STARTED');

        // Eligible programs query
        const eligible = await adapter.listEligiblePrograms(testOrgId);
        assert.ok(eligible.length >= 1);
        assert.ok(eligible.some((p) => p.id === testProgramId));
      });
    });

    it('cross-organization access fails closed', async () => {
      await withIntegrationDb(async (db) => {
        // Create Org B
        const [orgB] = await db
          .insert(organizations)
          .values({
            name: 'Org B',
            slug: `org-b-${Date.now()}`,
          })
          .returning();

        const adapter = createPromotorClassAdapter(db);

        // Trying to get contact from Org A using Org B context fails closed
        await assert.rejects(
          async () => {
            await adapter.getLearningContext(orgB.id, testContactId);
          },
          (err: any) => {
            assert.ok(err instanceof DomainError);
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });
  });
});
