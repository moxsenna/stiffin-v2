import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Guardrails:
 * 1. Runtime Worker code (src/) must never reference DATABASE_URL —
 *    that env var is migration tooling ONLY (owner role). The Worker
 *    reads env.HYPERDRIVE.connectionString exclusively.
 * 2. packages/contracts is FROZEN during B1 — its source hash must
 *    stay identical to the committed baseline.
 */
const CONTRACTS_BASELINE_HASH = '9e6ce07a223dd066eb484408e3a03568b8f1a4db03f01cd4c59e33ee3035028f';

describe('B1 — source guardrails', () => {
  it('runtime src/ code never references DATABASE_URL', () => {
    const srcRoot = join(process.cwd(), 'src');
    const offending: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === '__tests__') continue; // tests are not runtime code
          walk(full);
        } else if (entry.endsWith('.ts')) {
          const content = readFileSync(full, 'utf8');
          if (content.includes('process.env.DATABASE_URL')) offending.push(full);
        }
      }
    };
    walk(srcRoot);

    assert.deepStrictEqual(offending, [], `DATABASE_URL must not appear in runtime source: ${offending.join(', ')}`);
  });

  it('packages/contracts is unchanged (frozen Shared Contracts V1)', () => {
    const contractsIndex = join(process.cwd(), '..', '..', 'packages', 'contracts', 'src', 'index.ts');
    assert.ok(existsSync(contractsIndex), 'contracts source must exist');
    const hash = createHash('sha256').update(readFileSync(contractsIndex)).digest('hex');
    assert.strictEqual(
      hash,
      CONTRACTS_BASELINE_HASH,
      'packages/contracts/src/index.ts was modified — contracts are frozen during B1'
    );
  });
});
