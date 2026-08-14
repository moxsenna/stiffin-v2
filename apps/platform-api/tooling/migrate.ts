import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';

/**
 * Migration tooling (owner authority — neondb_owner).
 * Applies Drizzle migrations from ./src/db/migrations to the target database.
 *
 * This file is TOOLING ONLY. It is never imported by the Worker runtime
 * (wrangler main is src/index.ts) and never runs inside Cloudflare Workers.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[B1 migrate] DATABASE_URL is required. Run with owner-role credentials.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await migrate(drizzle(client), {
      migrationsFolder: join(process.cwd(), 'src', 'db', 'migrations'),
    });
    console.log('[B1 migrate] migrations applied successfully');
  } finally {
    await client.end();
  }
}

void main();
