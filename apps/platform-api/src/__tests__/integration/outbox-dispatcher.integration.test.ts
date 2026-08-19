import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { eq } from 'drizzle-orm';
import {
  withIntegrationDb,
  TEST_DATABASE_URL,
  applyMigrationsAsOwner,
} from './test-env';
import { organizations, integrationOutbox } from '../../db/schema';
import { createIntegrationOutboxService } from '../../services/integration/integration-outbox-service';
import type { PromotorFlowAdapter } from '@promotor/contracts';

const enabled = Boolean(TEST_DATABASE_URL);

describe('Durable Outbox & Dispatcher Integration Suite (§21, §22, §23, §24, §25, §36)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();
      const [org] = await db
        .insert(organizations)
        .values({ name: 'Outbox Test Org', slug: `outbox-org-${now}` })
        .returning();
      testOrgId = org.id;
    });
  });

  it('enqueues outbox task and dispatches successfully via flow adapter (§22, §23)', async () => {
    let createdActionPayload: any = null;

    const mockFlowAdapter: PromotorFlowAdapter = {
      async getContactContext() {
        return { contactId: 'cnt_123', stage: 'NEW', classification: 'PROSPECT' };
      },
      async getAssessmentStatus() {
        return 'NOT_STARTED';
      },
      async createNextAction(req) {
        createdActionPayload = req;
        return {
          id: 'na_mock_123',
          contactId: req.contactId,
          nextActionId: 'na_mock_123',
          title: req.title,
          createdAt: new Date().toISOString(),
        };
      },
      async appendLearningActivity(proj) {
        // no-op
      },
    };

    await withIntegrationDb(async (db) => {
      const outboxService = createIntegrationOutboxService(db);

      const idempotencyKey = `flow_na_${Date.now()}`;
      const enq = await outboxService.enqueue({
        organizationId: testOrgId,
        destination: 'PROMOTOR_FLOW',
        operation: 'CREATE_NEXT_ACTION',
        idempotencyKey,
        payload: {
          organizationId: testOrgId,
          contactId: 'cnt_123',
          type: 'FOLLOW_UP',
          title: 'Hot Lead Follow-up',
          dueDate: '2026-08-20',
          reason: 'Progress 80%',
        },
      });

      assert.strictEqual(enq.status, 'PENDING');

      // Dispatch pending tasks
      const processedCount = await outboxService.dispatchPending(mockFlowAdapter, 10, testOrgId);
      assert.strictEqual(processedCount, 1);
      assert.ok(createdActionPayload);
      assert.strictEqual(createdActionPayload.title, 'Hot Lead Follow-up');

      // Verify row is marked COMPLETED in database
      const [row] = await db
        .select()
        .from(integrationOutbox)
        .where(eq(integrationOutbox.id, enq.id));

      assert.strictEqual(row.status, 'COMPLETED');
      assert.ok(row.processedAt);
    });
  });

  it('handles delivery failure with exponential backoff (§24)', async () => {
    const failingFlowAdapter: PromotorFlowAdapter = {
      async getContactContext() {
        throw new Error('Simulated network timeout');
      },
      async getAssessmentStatus() {
        throw new Error('Simulated network timeout');
      },
      async createNextAction() {
        throw new Error('Simulated network timeout');
      },
      async appendLearningActivity() {
        throw new Error('Simulated network timeout');
      },
    };

    await withIntegrationDb(async (db) => {
      const outboxService = createIntegrationOutboxService(db);

      const idempotencyKey = `flow_fail_${Date.now()}`;
      const enq = await outboxService.enqueue({
        organizationId: testOrgId,
        destination: 'PROMOTOR_FLOW',
        operation: 'CREATE_NEXT_ACTION',
        idempotencyKey,
        payload: {
          organizationId: testOrgId,
          contactId: 'cnt_fail',
          type: 'FOLLOW_UP',
          title: 'Retry Action',
          dueDate: '2026-08-20',
        },
      });

      // Dispatch pending tasks
      const count = await outboxService.dispatchPending(failingFlowAdapter, 10, testOrgId);
      assert.strictEqual(count, 0, 'No task should be marked processed');

      const [row] = await db
        .select()
        .from(integrationOutbox)
        .where(eq(integrationOutbox.id, enq.id));

      assert.strictEqual(row.status, 'PENDING');
      assert.strictEqual(row.attemptCount, 1);
      assert.ok(row.lastErrorCode?.includes('Simulated network timeout'));
      assert.ok(row.nextAttemptAt);
    });
  });
});
