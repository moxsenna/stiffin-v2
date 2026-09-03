import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seedStagingDemo } from '../src/services/demo-seed-service';

export * from '../src/services/demo-seed-service';

const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('seed-staging-demo.ts');

if (isDirectRun) {
  const dbUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: Database URL missing. Provide STAGING_DATABASE_URL.');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  client
    .connect()
    .then(async () => {
      const db = drizzle(client);
      await seedStagingDemo(db);
      console.log('[SEED] Demo seed completed successfully.');
    })
    .catch((err: unknown) => {
      console.error('[SEED ERROR]', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await client.end();
    });
}
