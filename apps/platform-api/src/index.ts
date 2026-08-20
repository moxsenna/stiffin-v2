import { createApp } from './app';
import { Env } from './env';
import { withDb } from './db/client';
import { createInactivitySweepService } from './services/class/inactivity-sweep-service';
import { createIntegrationOutboxService } from './services/integration/integration-outbox-service';

const app = createApp();

export default {
  fetch: app.fetch,

  async scheduled(_event: any, env: Env, _ctx: any): Promise<void> {
    if (!env.HYPERDRIVE?.connectionString) {
      console.warn('[Scheduled] env.HYPERDRIVE is missing, skipping scheduled jobs');
      return;
    }

    await withDb(env.HYPERDRIVE.connectionString, async (db) => {
      // 1. Process integration outbox pending items
      try {
        const outboxService = createIntegrationOutboxService(db);
        const outboxResult = await outboxService.processPending({ limit: 50 });
        console.log('[Scheduled Outbox]', outboxResult);
      } catch (err) {
        console.error('[Scheduled Outbox Error]', err);
      }

      // 2. Process inactivity & at-risk sweep
      try {
        const sweepService = createInactivitySweepService(db);
        const sweepResult = await sweepService.executeSweep({ batchSize: 100, maxPages: 10 });
        console.log('[Scheduled Inactivity Sweep]', sweepResult);
      } catch (err) {
        console.error('[Scheduled Inactivity Sweep Error]', err);
      }
    });
  },
};

