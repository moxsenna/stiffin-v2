import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationEolViolations } from '../../tooling/migrate';

/**
 * Cross-platform migration fingerprint guards (E-A remediation).
 *
 * Drizzle hashes the RAW BYTES it reads from migration files. Git's canonical
 * content is LF. A CRLF working tree therefore produces non-canonical journal
 * hashes. These tests prove:
 *   - canonical LF content hashes to the frozen Git/LF fingerprints
 *   - the same content as CRLF hashes to the known non-canonical Windows hash
 *     (diagnostic only — NEVER canonical)
 *   - CRLF/CR files are REJECTED before migration execution (fail-closed)
 */

const CANONICAL = {
  '0000_modern_hydra': '86a3e3d993e3c038908e741649c2586afe2ae7ca737be641680c9af475bc7689',
  '0001_material_king_bedlam': 'e5acd9851fe9f76920ed513ddb454dbb91ddc6bc2259a8caa591fe894c95c166',
} as const;

// Known Windows CRLF working-tree hashes — noncanonical diagnostics.
const CRLF_KNOWN = {
  '0000_modern_hydra': '06f67712f2024e8b605d73da5530b855e2648e87361367a18626a47cd459ae56',
  '0001_material_king_bedlam': '6c433d8e3f20f57d1ab1c4a86a92cb99952bd8d051a666e6ca1e800149683d66',
} as const;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function migrationBytes(): { name: string; lf: string }[] {
  const dir = join(process.cwd(), 'src', 'db', 'migrations');
  return ['0000_modern_hydra', '0001_material_king_bedlam'].map((tag) => {
    // .gitattributes eol=lf guarantees the working-tree bytes are canonical LF.
    const lf = readFileSync(join(dir, `${tag}.sql`), 'utf8').replace(/\r\n/g, '\n');
    return { name: tag, lf };
  });
}

describe('B2 — cross-platform migration fingerprint (canonical LF)', () => {
  it('canonical LF 0000 -> 86a3e3d9... (Git/LF fingerprint)', () => {
    const [m0] = migrationBytes();
    assert.strictEqual(m0.name, '0000_modern_hydra');
    assert.strictEqual(sha256(m0.lf), CANONICAL['0000_modern_hydra']);
  });

  it('canonical LF 0001 -> e5acd985... (Git/LF fingerprint)', () => {
    const [, m1] = migrationBytes();
    assert.strictEqual(m1.name, '0001_material_king_bedlam');
    assert.strictEqual(sha256(m1.lf), CANONICAL['0001_material_king_bedlam']);
  });

  it('same content as CRLF -> known non-canonical Windows hashes (diagnostic only)', () => {
    const [m0, m1] = migrationBytes();
    const crlf0 = m0.lf.replace(/\n/g, '\r\n');
    const crlf1 = m1.lf.replace(/\n/g, '\r\n');
    assert.strictEqual(sha256(crlf0), CRLF_KNOWN['0000_modern_hydra'], 'CRLF 0000 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf1), CRLF_KNOWN['0001_material_king_bedlam'], 'CRLF 0001 must hash to the known Windows diagnostic hash');
    // They are DIFFERENT from canonical — never interchangeable.
    assert.notStrictEqual(CRLF_KNOWN['0000_modern_hydra'], CANONICAL['0000_modern_hydra']);
    assert.notStrictEqual(CRLF_KNOWN['0001_material_king_bedlam'], CANONICAL['0001_material_king_bedlam']);
  });

  it('migration SQL working-tree files contain no CR bytes (eol=lf in effect)', () => {
    const dir = join(process.cwd(), 'src', 'db', 'migrations');
    const violations = migrationEolViolations(dir);
    assert.deepStrictEqual(violations, [], 'no CR bytes allowed in migration SQL or meta JSON');
  });

  it('CRLF input is rejected for migration execution (fail-closed preflight)', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'migrate-crlf-'));
    try {
      writeFileSync(join(sandbox, '0000_modern_hydra.sql'), 'CREATE TABLE x (id int);\r\n');
      mkdirSync(join(sandbox, 'meta'));
      const violations = migrationEolViolations(sandbox);
      assert.deepStrictEqual(violations, ['0000_modern_hydra.sql'], 'CRLF file must be flagged');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it('meta/_journal.json CRLF is also rejected by preflight', () => {
    const sandbox = mkdtempSync(join(tmpdir(), 'migrate-crlf-meta-'));
    try {
      writeFileSync(join(sandbox, '0000_modern_hydra.sql'), 'CREATE TABLE x (id int);\n');
      const metaDir = join(sandbox, 'meta');
      mkdirSync(metaDir);
      writeFileSync(join(metaDir, '_journal.json'), '{}\r\n');
      const violations = migrationEolViolations(sandbox);
      assert.deepStrictEqual(violations, ['meta/_journal.json'], 'CRLF journal must be flagged');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
