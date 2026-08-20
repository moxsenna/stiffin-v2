import { createApp } from './app';
import { Env } from './env';
import { withDb } from './db/client';
import { createInactivitySweepService } from './services/class/inactivity-sweep-service';
import { createIntegrationOutboxService } from './services/integration/integration-outbox-service';
import { logOperation } from './core/observability';

const app = createApp();

export default {
  fetch: app.fetch,

  async scheduled(event: any, env: Env, _ctx: any): Promise<void> {
    const startTime = performance.now();
    const cronExpression = event?.cron || '*/15 * * * *';

    if (!env.HYPERDRIVE?.connectionString) {
      logOperation({
        level: 'warn',
        operation: 'SCHEDULED_TRIGGER',
        result: 'FAILURE',
        error: {
          code: 'HYPERDRIVE_BINDING_MISSING',
          message: 'env.HYPERDRIVE is unconfigured, skipping scheduled jobs',
        },
      });
      return;
    }

    await withDb(env.HYPERDRIVE.connectionString, async (db) => {
      // 1. Process integration outbox pending items
      const outboxStart = performance.now();
      try {
        const outboxService = createIntegrationOutboxService(db);
        const outboxResult = await outboxService.processPending({ limit: 50 });
        logOperation({
          operation: 'SCHEDULED_OUTBOX_DISPATCH',
          result: outboxResult.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
          duration_ms: performance.now() - outboxStart,
          details: {
            processedCount: outboxResult.processedCount,
            successCount: outboxResult.successCount,
            failureCount: outboxResult.errors.length,
          },
        });
      } catch (err: any) {
        logOperation({
          level: 'error',
          operation: 'SCHEDULED_OUTBOX_DISPATCH',
          result: 'FAILURE',
          duration_ms: performance.now() - outboxStart,
          error: {
            code: 'OUTBOX_DISPATCH_FAILURE',
            message: err?.message || 'Outbox dispatch job failed',
          },
        });
      }

      // 2. Process inactivity & at-risk sweep
      const sweepStart = performance.now();
      try {
        const sweepService = createInactivitySweepService(db);
        const sweepResult = await sweepService.executeSweep({ batchSize: 100, maxPages: 10 });
        logOperation({
          operation: 'SCHEDULED_INACTIVITY_SWEEP',
          result: sweepResult.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
          duration_ms: performance.now() - sweepStart,
          details: {
            scannedCount: sweepResult.scannedCount,
            atRiskCount: sweepResult.atRiskCount,
            emittedEventsCount: sweepResult.emittedEventsCount,
            failureCount: sweepResult.errors.length,
          },
        });
      } catch (err: any) {
        logOperation({
          level: 'error',
          operation: 'SCHEDULED_INACTIVITY_SWEEP',
          result: 'FAILURE',
          duration_ms: performance.now() - sweepStart,
          error: {
            code: 'INACTIVITY_SWEEP_FAILURE',
            message: err?.message || 'Inactivity sweep job failed',
          },
        });
      }
    });

    logOperation({
      operation: 'SCHEDULED_CRON_EXECUTION',
      result: 'SUCCESS',
      duration_ms: performance.now() - startTime,
      details: { cron: cronExpression },
    });
  },
};
