import { eq, and, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { integrationOutbox, IntegrationOutboxRow, NewIntegrationOutboxRow } from '../../db/schema/integration-outbox';
import type { PromotorFlowAdapter, LearningNextActionRequest, LearningActivityProjection } from '@promotor/contracts';
import { createLocalPromotorFlowAdapter } from '../../adapters/local-promotor-flow-adapter';
import { logOperation } from '../../core/observability';

export interface EnqueueOutboxInput {
  organizationId: string;
  destination: 'PROMOTORFLOW' | 'PROMOTOR_FLOW' | string;
  operation: 'CREATE_NEXT_ACTION' | 'APPEND_ACTIVITY' | string;
  idempotencyKey: string;
  payloadJson?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export interface ProcessPendingResult {
  processedCount: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

export interface IntegrationOutboxService {
  enqueue(input: EnqueueOutboxInput, tx?: NodePgDatabase): Promise<IntegrationOutboxRow>;
  processPending(options?: { limit?: number; now?: Date; organizationId?: string }): Promise<ProcessPendingResult>;
  dispatchPending(flowAdapter: PromotorFlowAdapter, limit?: number, organizationId?: string): Promise<number>;
}

export function createIntegrationOutboxService(
  db: NodePgDatabase,
  dependencies: {
    flowAdapter?: PromotorFlowAdapter;
    clock?: () => Date;
  } = {}
): IntegrationOutboxService {
  const getNow = dependencies.clock ?? (() => new Date());
  const defaultAdapter = createLocalPromotorFlowAdapter(db as any);

  return {
    async enqueue(input: EnqueueOutboxInput, txDb?: NodePgDatabase): Promise<IntegrationOutboxRow> {
      const runner = txDb ?? db;
      const now = getNow();
      const payload = input.payloadJson ?? input.payload ?? {};

      const [row] = await runner
        .insert(integrationOutbox)
        .values({
          organizationId: input.organizationId,
          destination: input.destination,
          operation: input.operation,
          idempotencyKey: input.idempotencyKey,
          payloadJson: payload,
          status: 'PENDING',
          attemptCount: 0,
          nextAttemptAt: now,
          createdAt: now,
        })
        .onConflictDoNothing({
          target: [integrationOutbox.destination, integrationOutbox.idempotencyKey],
        })
        .returning();

      if (!row) {
        // Return existing row if conflict
        const [existing] = await runner
          .select()
          .from(integrationOutbox)
          .where(
            and(
              eq(integrationOutbox.destination, input.destination),
              eq(integrationOutbox.idempotencyKey, input.idempotencyKey)
            )
          )
          .limit(1);
        return existing;
      }

      return row;
    },

    async processPending(options = {}) {
      const limit = options.limit ?? 20;
      const now = options.now ?? getNow();
      const searchUntil = new Date(now.getTime() + 60000);
      const flowAdapter = dependencies.flowAdapter ?? defaultAdapter;

      const conditions = [
        eq(integrationOutbox.status, 'PENDING'),
        lte(integrationOutbox.nextAttemptAt, searchUntil),
      ];
      if (options.organizationId) {
        conditions.push(eq(integrationOutbox.organizationId, options.organizationId));
      }

      // Select candidate rows
      const candidates = await db
        .select()
        .from(integrationOutbox)
        .where(and(...conditions))
        .limit(limit);

      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const row of candidates) {
        const itemStart = performance.now();
        try {
          if (row.destination === 'PROMOTORFLOW' || row.destination === 'PROMOTOR_FLOW') {
            const boundAdapter = (flowAdapter as any)?.withContext
              ? (flowAdapter as any).withContext({ organizationId: row.organizationId })
              : flowAdapter;

            if (row.operation === 'CREATE_NEXT_ACTION') {
              if (typeof (boundAdapter as any).createLearningNextAction === 'function') {
                await (boundAdapter as any).createLearningNextAction(row.payloadJson);
              } else if (typeof boundAdapter.createNextAction === 'function') {
                await boundAdapter.createNextAction(row.payloadJson as unknown as LearningNextActionRequest);
              }
            } else if (row.operation === 'APPEND_ACTIVITY') {
              if (typeof boundAdapter.appendLearningActivity === 'function') {
                await boundAdapter.appendLearningActivity(row.payloadJson as unknown as LearningActivityProjection);
              }
            }
          }

          // Mark as COMPLETED
          await db
            .update(integrationOutbox)
            .set({
              status: 'COMPLETED',
              processedAt: now,
            })
            .where(eq(integrationOutbox.id, row.id));

          successCount++;

          logOperation({
            operation: 'OUTBOX_DISPATCH_ITEM',
            result: 'SUCCESS',
            duration_ms: performance.now() - itemStart,
            organization_id: row.organizationId,
            integration_destination: (row.destination === 'PROMOTORFLOW' || row.destination === 'PROMOTOR_FLOW') ? 'PROMOTORFLOW' : null,
            details: {
              outboxId: row.id,
              operationType: row.operation,
              idempotencyKey: row.idempotencyKey,
            },
          });
        } catch (err: any) {
          const nextAttemptCount = (row.attemptCount ?? 0) + 1;
          const isDead = nextAttemptCount >= 5;
          const backoffSeconds = Math.pow(2, nextAttemptCount) * 30;
          const nextAttemptTime = new Date(now.getTime() + backoffSeconds * 1000);
          const errorMsg = err?.message ? String(err.message).slice(0, 255) : 'UNKNOWN_ERROR';

          await db
            .update(integrationOutbox)
            .set({
              status: isDead ? 'FAILED' : 'PENDING',
              attemptCount: nextAttemptCount,
              nextAttemptAt: nextAttemptTime,
              lastErrorCode: errorMsg,
            })
            .where(eq(integrationOutbox.id, row.id));

          failedCount++;
          errors.push({ id: row.id, error: errorMsg });

          logOperation({
            level: isDead ? 'error' : 'warn',
            operation: 'OUTBOX_DISPATCH_ITEM',
            result: isDead ? 'FAILURE' : 'RETRY',
            duration_ms: performance.now() - itemStart,
            organization_id: row.organizationId,
            integration_destination: (row.destination === 'PROMOTORFLOW' || row.destination === 'PROMOTOR_FLOW') ? 'PROMOTORFLOW' : null,
            details: {
              outboxId: row.id,
              operationType: row.operation,
              attemptCount: nextAttemptCount,
            },
            error: {
              code: 'DISPATCH_FAILURE',
              message: errorMsg,
            },
          });
        }
      }

      return {
        processedCount: candidates.length,
        successCount,
        failedCount,
        errors,
      };
    },

    async dispatchPending(flowAdapter: PromotorFlowAdapter, limit = 20, organizationId?: string) {
      const now = getNow();
      const searchUntil = new Date(now.getTime() + 60000);
      const conditions = [
        eq(integrationOutbox.status, 'PENDING'),
        lte(integrationOutbox.nextAttemptAt, searchUntil),
      ];
      if (organizationId) {
        conditions.push(eq(integrationOutbox.organizationId, organizationId));
      }

      const candidates = await db
        .select()
        .from(integrationOutbox)
        .where(and(...conditions))
        .limit(limit);

      let processed = 0;

      for (const row of candidates) {
        try {
          const boundAdapter = (flowAdapter as any)?.withContext
            ? (flowAdapter as any).withContext({ organizationId: row.organizationId })
            : flowAdapter;

          if (row.operation === 'CREATE_NEXT_ACTION') {
            if (typeof (boundAdapter as any).createLearningNextAction === 'function') {
              await (boundAdapter as any).createLearningNextAction(row.payloadJson);
            } else if (typeof boundAdapter.createNextAction === 'function') {
              await boundAdapter.createNextAction(row.payloadJson as any);
            }
          } else if (row.operation === 'APPEND_ACTIVITY') {
            if (typeof boundAdapter.appendLearningActivity === 'function') {
              await boundAdapter.appendLearningActivity(row.payloadJson as any);
            }
          }

          await db
            .update(integrationOutbox)
            .set({
              status: 'COMPLETED',
              processedAt: now,
            })
            .where(eq(integrationOutbox.id, row.id));

          processed++;
        } catch (err: any) {
          const nextAttemptCount = (row.attemptCount ?? 0) + 1;
          const isDead = nextAttemptCount >= 5;
          const backoffSeconds = Math.pow(2, nextAttemptCount) * 30;
          const nextAttemptTime = new Date(now.getTime() + backoffSeconds * 1000);

          await db
            .update(integrationOutbox)
            .set({
              status: isDead ? 'FAILED' : 'PENDING',
              attemptCount: nextAttemptCount,
              nextAttemptAt: nextAttemptTime,
              lastErrorCode: err?.message ? String(err.message).slice(0, 255) : 'UNKNOWN_ERROR',
            })
            .where(eq(integrationOutbox.id, row.id));
        }
      }

      return processed;
    },
  };
}
