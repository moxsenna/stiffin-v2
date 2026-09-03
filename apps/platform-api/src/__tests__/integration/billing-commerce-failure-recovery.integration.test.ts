import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  withIntegrationDb,
  withRuntimeSql,
  TEST_DATABASE_URL,
  pgErrorCode,
} from './test-env';
import {
  organizations,
  programs,
  organizationSubscriptions,
  commerceOrders,
} from '../../db/schema';
import { createCommerceService } from '../../services/commerce/commerce-service';
import { createCommerceRepository } from '../../repositories/commerce-repository';
import { createSubscriptionRepository } from '../../repositories/subscription-repository';
import { createPlanAccessService } from '../../services/billing/plan-access-service';
import { createProgramRepository } from '../../repositories/program-repository';
import { createContactRepository } from '../../repositories/contact-repository';
import { createOrganizationRepository } from '../../repositories/organization-repository';
import { createEnrollmentService } from '../../services/class/enrollment-service';
import { createLearningEventRepository } from '../../repositories/learning-event-repository';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { DomainError } from '../../core/errors';

const enabled = Boolean(TEST_DATABASE_URL);

describe(
  'Talira Commercial Engine — Gateway Failure Recovery Integration Suite (PostgreSQL Persisted Truth)',
  { skip: !enabled ? 'TEST_DATABASE_URL not set' : false },
  () => {
    let testOrgId: string;
    let testOrgSlug: string;
    let testProgramId: string;
    let testProgramSlug: string;

    before(async () => {
      await withIntegrationDb(async (db) => {
        testOrgSlug = `fail-rec-org-${Date.now()}`;
        testProgramSlug = `paid-program-${Date.now()}`;

        // 1. Create Organization
        const [org] = await db
          .insert(organizations)
          .values({
            name: 'Failure Recovery Test Org',
            slug: testOrgSlug,
          })
          .returning();
        testOrgId = org.id;

        // 2. Create Active SOLO Subscription (to permit paid programs)
        await db.insert(organizationSubscriptions).values({
          organizationId: testOrgId,
          planCode: 'SOLO',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          provider: 'PAYCORE',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // 3. Create Published Paid Program
        const [prog] = await db
          .insert(programs)
          .values({
            organizationId: testOrgId,
            title: 'Paid Recovery Test Class',
            slug: testProgramSlug,
            status: 'published',
            accessType: 'public',
            programType: 'paid',
            pricing: 'one_time',
            priceAmount: 199000,
          })
          .returning();
        testProgramId = prog.id;
      });
    });

    it('Program checkout: when Paycore createOrder throws, local order transitions to FAILED in PostgreSQL (never orphan PENDING)', async () => {
      await withIntegrationDb(async (db) => {
        const commerceRepo = createCommerceRepository(db);
        const subscriptionRepo = createSubscriptionRepository(db);
        const planAccessService = createPlanAccessService(subscriptionRepo);
        const programRepo = createProgramRepository(db);
        const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
        const orgRepo = createOrganizationRepository(db);
        const learningEventRepo = createLearningEventRepository(db);
        const enrollmentService = createEnrollmentService(db, {
          planAccessService,
        });

        // Failing PaycoreClient mock simulating gateway timeout/network exception
        const failingPaycoreClient: any = {
          createOrder: async () => {
            throw new Error('ECONNREFUSED: Gateway connection timed out');
          },
        };

        const commerceService = createCommerceService({
          commerceRepo,
          subscriptionRepo,
          planAccessService,
          paycoreClient: failingPaycoreClient,
          programRepo,
          contactRepo,
          orgRepo,
          enrollmentService,
          learningEventRepo,
          appUuid: '00000000-0000-0000-0000-000000000001',
        });

        // Attempt checkout
        await assert.rejects(
          async () =>
            commerceService.createProgramCheckout(testOrgSlug, testProgramSlug, {
              name: 'Recovery Learner',
              phone: '+6281299997777',
              sourceChannel: 'STOREFRONT',
            }),
          (err: any) => {
            assert.ok(err instanceof DomainError);
            assert.strictEqual(err.code, 'PAYMENT_GATEWAY_ERROR');
            return true;
          }
        );

        // Verify persisted state in PostgreSQL via runtime role
        await withRuntimeSql(async (client) => {
          const res = await client.query(
            `SELECT id, reference, status, order_type, amount, payment_mode
             FROM public.commerce_orders
             WHERE organization_id = $1 AND program_id = $2
             ORDER BY created_at DESC LIMIT 1`,
            [testOrgId, testProgramId]
          );

          assert.strictEqual(res.rows.length, 1, 'Order must be persisted in database');
          const row = res.rows[0];
          assert.strictEqual(row.status, 'FAILED', 'Order status must be updated to FAILED');
          assert.notStrictEqual(row.status, 'PENDING', 'Order must NOT remain PENDING');
          assert.strictEqual(row.amount, 199000);
          assert.strictEqual(row.order_type, 'PROGRAM_PURCHASE');
        });
      });
    });

    it('Subscription checkout: when Paycore createOrder throws, local subscription order transitions to FAILED in PostgreSQL', async () => {
      await withIntegrationDb(async (db) => {
        const commerceRepo = createCommerceRepository(db);
        const subscriptionRepo = createSubscriptionRepository(db);
        const planAccessService = createPlanAccessService(subscriptionRepo);
        const programRepo = createProgramRepository(db);
        const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
        const orgRepo = createOrganizationRepository(db);
        const learningEventRepo = createLearningEventRepository(db);
        const enrollmentService = createEnrollmentService(db);

        const failingPaycoreClient: any = {
          createOrder: async () => {
            throw new Error('502 Bad Gateway from Paycore upstream');
          },
        };

        const commerceService = createCommerceService({
          commerceRepo,
          subscriptionRepo,
          planAccessService,
          paycoreClient: failingPaycoreClient,
          programRepo,
          contactRepo,
          orgRepo,
          enrollmentService,
          learningEventRepo,
          appUuid: '00000000-0000-0000-0000-000000000001',
        });

        await assert.rejects(
          async () =>
            commerceService.createSubscriptionCheckout(
              testOrgId,
              { planCode: 'SOLO', billingCycle: 'MONTHLY' },
              { id: 'usr-rec-test', name: 'Recovery Owner', email: 'owner@rec-test.id' }
            ),
          (err: any) => {
            assert.ok(err instanceof DomainError);
            assert.strictEqual(err.code, 'PAYMENT_GATEWAY_ERROR');
            return true;
          }
        );

        await withRuntimeSql(async (client) => {
          const res = await client.query(
            `SELECT id, reference, status, order_type, amount
             FROM public.commerce_orders
             WHERE organization_id = $1 AND order_type = 'SUBSCRIPTION_PURCHASE'
             ORDER BY created_at DESC LIMIT 1`,
            [testOrgId]
          );

          assert.strictEqual(res.rows.length, 1);
          const row = res.rows[0];
          assert.strictEqual(row.status, 'FAILED', 'Subscription order status must be FAILED');
          assert.notStrictEqual(row.status, 'PENDING');
          assert.strictEqual(row.amount, 149000);
        });
      });
    });

    it('PostgreSQL CHECK constraint verifies FAILED is accepted and arbitrary status is rejected (23514)', async () => {
      await withRuntimeSql(async (client) => {
        const testRefSuccess = `TEST-FAIL-STATUS-${Date.now()}`;
        const testRefBogus = `TEST-BOGUS-${Date.now()}`;

        // 1. Status 'FAILED' must succeed without error
        const insertRes = await client.query(
          `INSERT INTO public.commerce_orders
           (organization_id, reference, source_channel, payment_mode, amount, currency, status)
           VALUES ($1, $2, 'STOREFRONT', 'PAYCORE', 10000, 'IDR', 'FAILED')
           RETURNING id, status`,
          [testOrgId, testRefSuccess]
        );
        assert.strictEqual(insertRes.rows.length, 1);
        assert.strictEqual(insertRes.rows[0].status, 'FAILED');

        // 2. Arbitrary status 'GARBAGE_STATUS' must be rejected with 23514
        await assert.rejects(
          async () => {
            await client.query(
              `INSERT INTO public.commerce_orders
               (organization_id, reference, source_channel, payment_mode, amount, currency, status)
               VALUES ($1, $2, 'STOREFRONT', 'PAYCORE', 10000, 'IDR', 'GARBAGE_STATUS')`,
              [testOrgId, testRefBogus]
            );
          },
          (err: unknown) => {
            const code = pgErrorCode(err);
            assert.strictEqual(code, '23514', 'Must violate check constraint commerce_orders_status_check');
            return true;
          }
        );
      });
    });
  }
);
