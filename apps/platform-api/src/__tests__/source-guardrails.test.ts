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
 * 2. packages/contracts deliberate B3 re-baseline (includes PromotorClass content models & DTOs).
 */
const CONTRACTS_BASELINE_HASH = 'bfcbc2dea5075775a818ffd4fa2facf98c7c55f54d83a5b56f490fd2d9f9d203';

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

  it('runtime src/auth/ code never references process.env at all (Workers has no process.env)', () => {
    const authRoot = join(process.cwd(), 'src', 'auth');
    assert.ok(existsSync(authRoot), 'src/auth must exist');
    const offending: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (entry.endsWith('.ts')) {
          const content = readFileSync(full, 'utf8');
          if (content.includes('process.env')) offending.push(full);
        }
      }
    };
    walk(authRoot);

    assert.deepStrictEqual(offending, [], `src/auth must never reference process.env: ${offending.join(', ')}`);
  });

  it('packages/contracts is unchanged (frozen Shared Contracts V1)', () => {
    const contractsIndex = join(process.cwd(), '..', '..', 'packages', 'contracts', 'src', 'index.ts');
    assert.ok(existsSync(contractsIndex), 'contracts source must exist');
    // Normalize CRLF→LF so the hash is identical on Windows and Linux checkout.
    const normalized = readFileSync(contractsIndex, 'utf8').replace(/\r\n/g, '\n');
    const hash = createHash('sha256').update(normalized).digest('hex');
    assert.strictEqual(
      hash,
      CONTRACTS_BASELINE_HASH,
      'packages/contracts/src/index.ts was modified — contracts are frozen during B1'
    );
  });
});
