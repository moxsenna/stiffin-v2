import { describe, it } from 'node:test';
import assert from 'node:assert';
import { withRuntimeSql, pgErrorCode } from './test-env';

const BILLING_COMMERCE_TABLES = [
  'organization_subscriptions',
  'commerce_orders',
  'payment_records',
  'platform_fee_entries',
  'organization_bank_accounts',
  'provider_webhook_events',
];

describe('P0 — Talira Billing & Commerce Least Privilege Grants', () => {
  it('least privilege: promotor_runtime cannot execute DDL (CREATE, ALTER, DROP TABLE)', async () => {
    if (!process.env.RUNTIME_DATABASE_URL && !process.env.TEST_DATABASE_URL) return;

    await withRuntimeSql(async (client) => {
      // 1. CREATE TABLE must fail
      await assert.rejects(
        async () => {
          await client.query(`CREATE TABLE public.billing_ddl_fail (id uuid PRIMARY KEY)`);
        },
        (err: unknown) => {
          const code = pgErrorCode(err);
          assert.ok(code === '42501', `CREATE TABLE must fail with 42501, got ${code}`);
          return true;
        }
      );

      // 2. ALTER TABLE must fail
      await assert.rejects(
        async () => {
          await client.query(`ALTER TABLE public.organization_subscriptions ADD COLUMN evil_col text`);
        },
        (err: unknown) => {
          const code = pgErrorCode(err);
          assert.ok(code === '42501', `ALTER TABLE must fail with 42501, got ${code}`);
          return true;
        }
      );

      // 3. DROP TABLE must fail
      await assert.rejects(
        async () => {
          await client.query(`DROP TABLE public.provider_webhook_events`);
        },
        (err: unknown) => {
          const code = pgErrorCode(err);
          assert.ok(code === '42501', `DROP TABLE must fail with 42501, got ${code}`);
          return true;
        }
      );
    });
  });

  it('least privilege: promotor_runtime has CRUD on all 6 billing and commerce tables (24 checks)', async () => {
    if (!process.env.RUNTIME_DATABASE_URL && !process.env.TEST_DATABASE_URL) return;

    await withRuntimeSql(async (client) => {
      for (const table of BILLING_COMMERCE_TABLES) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const res = await client.query(
            `SELECT has_table_privilege(current_user, 'public.' || $1, $2) AS has`,
            [table, privilege]
          );
          assert.strictEqual(
            res.rows[0].has,
            true,
            `promotor_runtime must have ${privilege} on ${table}`
          );
        }
      }
    });
  });

  it('least privilege: promotor_runtime can perform actual DML operations on provider_webhook_events', async () => {
    if (!process.env.RUNTIME_DATABASE_URL && !process.env.TEST_DATABASE_URL) return;

    await withRuntimeSql(async (client) => {
      const testEvtId = `evt_grant_test_${Date.now()}`;

      // INSERT
      const insRes = await client.query(
        `INSERT INTO public.provider_webhook_events (provider, provider_event_id, event_type, processing_result)
         VALUES ('PAYCORE', $1, 'payment.succeeded', 'TEST')
         RETURNING id, provider_event_id`,
        [testEvtId]
      );
      assert.strictEqual(insRes.rows.length, 1);
      const rowId = insRes.rows[0].id;

      // SELECT
      const selRes = await client.query(
        `SELECT id, provider_event_id, processing_result
         FROM public.provider_webhook_events
         WHERE id = $1`,
        [rowId]
      );
      assert.strictEqual(selRes.rows.length, 1);
      assert.strictEqual(selRes.rows[0].provider_event_id, testEvtId);

      // UPDATE
      const updRes = await client.query(
        `UPDATE public.provider_webhook_events
         SET processing_result = 'SUCCESS'
         WHERE id = $1
         RETURNING processing_result`,
        [rowId]
      );
      assert.strictEqual(updRes.rows[0].processing_result, 'SUCCESS');

      // DELETE
      const delRes = await client.query(
        `DELETE FROM public.provider_webhook_events WHERE id = $1`,
        [rowId]
      );
      assert.strictEqual(delRes.rowCount, 1);
    });
  });
});
