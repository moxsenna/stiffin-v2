import { Client } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { Env } from '../env';

export type DrizzleDb = NodePgDatabase;
export type DbHandle = NodePgDatabase<any> | PgTransaction<any, any, any>;

/**
 * Execute a database operation using a request-scoped pg Client connection.
 * Guarantees client.connect() and client.end() cleanup in a try-finally block.
 */
export async function withDb<T>(
  connectionString: string,
  operation: (db: DrizzleDb) => Promise<T>
): Promise<T> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const db = drizzle(client);
    return await operation(db);
  } finally {
    await client.end();
  }
}

/**
 * Execute a live database health probe query (SELECT NOW()) via Hyperdrive connection string.
 * Uncached SQL query guarantees actual database roundtrip proof.
 */
export async function executeDbHealthProbe(env: Env): Promise<{ serverTime: string }> {
  if (!env.HYPERDRIVE?.connectionString) {
    throw new Error('Hyperdrive connection binding (env.HYPERDRIVE) is missing or unconfigured.');
  }

  return withDb(env.HYPERDRIVE.connectionString, async (db) => {
    const result = await db.execute<{ now: Date | string }>(sql`SELECT NOW() as now`);
    const row = result.rows[0];
    const serverTime = row?.now ? new Date(row.now).toISOString() : new Date().toISOString();
    return { serverTime };
  });
}
