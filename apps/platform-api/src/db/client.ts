import { Client } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { Env } from '../env';

export type DrizzleDb = NodePgDatabase;
export type DbHandle = NodePgDatabase<any> | PgTransaction<any, any, any>;

let schemaMigrationEnsured = false;

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
    if (!schemaMigrationEnsured) {
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS "organization_bank_accounts" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "organization_id" uuid NOT NULL,
            "bank_name" text NOT NULL,
            "account_number" text NOT NULL,
            "account_holder_name" text NOT NULL,
            "is_active" boolean DEFAULT true NOT NULL,
            "sort_order" integer DEFAULT 0 NOT NULL,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
          );
        `);
      } catch (err: any) {
        console.error('[ensure organization_bank_accounts error]:', err?.message || err);
      }

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS "organization_payment_settings" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "organization_id" uuid NOT NULL,
            "sales_whatsapp_number" text,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
          );
        `);
      } catch (err: any) {
        console.error('[ensure organization_payment_settings error]:', err?.message || err);
      }

      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS "program_purchase_requests" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "organization_id" uuid NOT NULL,
            "program_id" uuid NOT NULL,
            "contact_id" uuid NOT NULL,
            "purchase_reference" text NOT NULL,
            "purchase_method" text NOT NULL,
            "status" text DEFAULT 'PENDING' NOT NULL,
            "price_amount" integer DEFAULT 0 NOT NULL,
            "currency" text DEFAULT 'IDR' NOT NULL,
            "buyer_name" text NOT NULL,
            "buyer_phone" text NOT NULL,
            "buyer_note" text,
            "bank_account_id" uuid,
            "approved_at" timestamp with time zone,
            "approved_by_user_id" uuid,
            "rejected_at" timestamp with time zone,
            "rejected_by_user_id" uuid,
            "rejection_reason" text,
            "enrollment_id" uuid,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
          );
        `);
      } catch (err: any) {
        console.error('[ensure program_purchase_requests error]:', err?.message || err);
      }

      schemaMigrationEnsured = true;
    }
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
