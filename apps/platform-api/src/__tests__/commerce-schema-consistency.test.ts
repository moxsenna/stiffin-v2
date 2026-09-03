import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CommerceOrderStatusSchema,
  CommercePaymentModeSchema,
  PaymentRecordStatusSchema,
} from '@promotor/contracts';

describe('Talira Commercial Engine — Schema & SQL Constraint Consistency Guard', () => {
  const migration0010Path = join(
    process.cwd(),
    'src',
    'db',
    'migrations',
    '0010_talira_billing_and_commerce.sql'
  );
  const sqlContent = readFileSync(migration0010Path, 'utf8').replace(/\r\n/g, '\n');

  it('commerce_orders_status_check SQL constraint exactly matches CommerceOrderStatusSchema', () => {
    const statusMatch = sqlContent.match(
      /CONSTRAINT "commerce_orders_status_check" CHECK \("status" IN \(([^)]+)\)\)/
    );
    assert.ok(statusMatch, 'commerce_orders_status_check constraint must exist in 0010 SQL migration');

    const sqlStatuses = statusMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .sort();

    const domainStatuses = [...CommerceOrderStatusSchema.options].sort();

    assert.deepStrictEqual(
      sqlStatuses,
      domainStatuses,
      'SQL CHECK constraint on commerce_orders.status MUST exactly match CommerceOrderStatusSchema options'
    );
    assert.ok(
      domainStatuses.includes('FAILED'),
      'FAILED status must be present in CommerceOrderStatusSchema for gateway failure recovery'
    );
  });

  it('commerce_orders_payment_mode_check SQL constraint exactly matches CommercePaymentModeSchema', () => {
    const modeMatch = sqlContent.match(
      /CONSTRAINT "commerce_orders_payment_mode_check" CHECK \("payment_mode" IN \(([^)]+)\)\)/
    );
    assert.ok(modeMatch, 'commerce_orders_payment_mode_check constraint must exist in 0010 SQL migration');

    const sqlModes = modeMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .sort();

    const domainModes = [...CommercePaymentModeSchema.options].sort();

    assert.deepStrictEqual(
      sqlModes,
      domainModes,
      'SQL CHECK constraint on commerce_orders.payment_mode MUST match CommercePaymentModeSchema'
    );
  });

  it('payment_records_status_check SQL constraint exactly matches PaymentRecordStatusSchema', () => {
    const statusMatch = sqlContent.match(
      /CONSTRAINT "payment_records_status_check" CHECK \("status" IN \(([^)]+)\)\)/
    );
    assert.ok(statusMatch, 'payment_records_status_check constraint must exist in 0010 SQL migration');

    const sqlStatuses = statusMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .sort();

    const domainStatuses = [...PaymentRecordStatusSchema.options].sort();

    assert.deepStrictEqual(
      sqlStatuses,
      domainStatuses,
      'SQL CHECK constraint on payment_records.status MUST match PaymentRecordStatusSchema'
    );
  });
});
