import { Client } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const OWNER_DATABASE_URL = process.env.OWNER_DATABASE_URL;

/**
 * Applies B1 migrations as the OWNER role when OWNER_DATABASE_URL is provided
 * (CI flow: owner=postgres applies DDL, then tests run as promotor_runtime).
 * No-op when absent — then TEST_DATABASE_URL must point at an already-migrated DB.
 */
export async function applyMigrationsAsOwner(): Promise<boolean> {
  if (!OWNER_DATABASE_URL) return false;
  const client = new Client({ connectionString: OWNER_DATABASE_URL });
  await client.connect();
  try {
    await migrate(drizzle(client), {
      migrationsFolder: join(process.cwd(), 'src', 'db', 'migrations'),
    });
    return true;
  } finally {
    await client.end();
  }
}

export function createDb(): NodePgDatabase {
  if (!TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is required for integration tests');
  }
  return drizzle(TEST_DATABASE_URL);
}

export async function withIntegrationDb<T>(operation: (db: NodePgDatabase) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    return await operation(drizzle(client));
  } finally {
    await client.end();
  }
}

/** Raw SQL as the runtime role (for least-privilege assertions). */
export async function withRuntimeSql<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Raw SQL as the owner role (for migration journal assertions). */
export async function withOwnerSql<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const url = OWNER_DATABASE_URL ?? TEST_DATABASE_URL;
  if (!url) throw new Error('OWNER_DATABASE_URL is required for owner-role assertions');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
