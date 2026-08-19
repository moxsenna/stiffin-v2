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
  '0002_heavy_scarlet_witch': '9c408e9d74259546da420502c96d689bd8c82c92ee880a7e459019250f686b6b',
  '0003_smart_titania': '02e0f59281c6aadb85f1d8d16d7be6ec15ecb012e38d2fd763c2dd37b06275fe',
  '0004_swift_availability': 'c22c919d815156efbe9b33623bfae53e92cbbeddcb68e709d4aa259bc02812df',
  '0005_rapid_enrollment': '8b4c1cbd420367ab43464b963628eba83483f0422f734ebf9f5273e8d19d8161',
  '0006_smart_learning_engine': '682716b4c05e2a81270630f12bf211b74812fcaef35ac56334ebd3cda5d9aad6',
  '0007_v01_release_hardening': '8f89f04930012997f41eaf037149c0356e048b8c79ab7bf089813edea5bf2915',
  '0008_canonical_events_tightening': '483a6152b3725990e78efd9d5d2c9f2887a109645fe72e22e13b229f179da2cc',
} as const;

// Known Windows CRLF working-tree hashes — noncanonical diagnostics.
const CRLF_KNOWN = {
  '0000_modern_hydra': '06f67712f2024e8b605d73da5530b855e2648e87361367a18626a47cd459ae56',
  '0001_material_king_bedlam': '6c433d8e3f20f57d1ab1c4a86a92cb99952bd8d051a666e6ca1e800149683d66',
  '0002_heavy_scarlet_witch': '7905b55bd229b57efbe7b2d7c077d7c830c279b3b6779d5258d6811e11be7812',
  '0003_smart_titania': '2be73ba8766c7e3260b4bac77326f05d51f1408ef988f51c0282ac773f16d95f',
  '0004_swift_availability': 'cc4e87e75b23455e5a0ba96bcf840a0487a6ef0a14d801d40b5fafe64b31769d',
  '0005_rapid_enrollment': 'b385744966fc12c510dbb431d799b1e91fa96a86a0053b81e17e63df316e0247',
  '0006_smart_learning_engine': '1a36e9fe98341810d6dc5d1b374a1b8f4807b202e030d82970a17586da899b9e',
  '0007_v01_release_hardening': 'cd842d66c2e788ecee8402ee10d9add0b7260ead4eb1348ba4fa0902233e58b7',
  '0008_canonical_events_tightening': 'f6180b00374d10bcb32b0c3b9db5b9fa09e2ef1ac3ea70e5665d5d72e3dd2c00',
} as const;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function migrationBytes(): { name: string; lf: string }[] {
  const dir = join(process.cwd(), 'src', 'db', 'migrations');
  return [
    '0000_modern_hydra',
    '0001_material_king_bedlam',
    '0002_heavy_scarlet_witch',
    '0003_smart_titania',
    '0004_swift_availability',
    '0005_rapid_enrollment',
    '0006_smart_learning_engine',
    '0007_v01_release_hardening',
    '0008_canonical_events_tightening',
  ].map((tag) => {
    // .gitattributes eol=lf guarantees the working-tree bytes are canonical LF.
    const lf = readFileSync(join(dir, `${tag}.sql`), 'utf8').replace(/\r\n/g, '\n');
    return { name: tag, lf };
  });
}

describe('B2/B3/B6/B6.1/B4/B5 — cross-platform migration fingerprint (canonical LF)', () => {
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

  it('canonical LF 0002 -> 9c408e9d... (Git/LF fingerprint)', () => {
    const [, , m2] = migrationBytes();
    assert.strictEqual(m2.name, '0002_heavy_scarlet_witch');
    assert.strictEqual(sha256(m2.lf), CANONICAL['0002_heavy_scarlet_witch']);
  });

  it('canonical LF 0003 -> 02e0f592... (Git/LF fingerprint)', () => {
    const [, , , m3] = migrationBytes();
    assert.strictEqual(m3.name, '0003_smart_titania');
    assert.strictEqual(sha256(m3.lf), CANONICAL['0003_smart_titania']);
  });

  it('canonical LF 0004 -> c22c919d... (Git/LF fingerprint)', () => {
    const [, , , , m4] = migrationBytes();
    assert.strictEqual(m4.name, '0004_swift_availability');
    assert.strictEqual(sha256(m4.lf), CANONICAL['0004_swift_availability']);
  });

  it('canonical LF 0005 -> 8b4c1cbd... (Git/LF fingerprint)', () => {
    const [, , , , , m5] = migrationBytes();
    assert.strictEqual(m5.name, '0005_rapid_enrollment');
    assert.strictEqual(sha256(m5.lf), CANONICAL['0005_rapid_enrollment']);
  });

  it('canonical LF 0006 -> 682716b4... (Git/LF fingerprint)', () => {
    const [, , , , , , m6] = migrationBytes();
    assert.strictEqual(m6.name, '0006_smart_learning_engine');
    assert.strictEqual(sha256(m6.lf), CANONICAL['0006_smart_learning_engine']);
  });

  it('canonical LF 0007 -> 8f89f049... (Git/LF fingerprint)', () => {
    const [, , , , , , , m7] = migrationBytes();
    assert.strictEqual(m7.name, '0007_v01_release_hardening');
    assert.strictEqual(sha256(m7.lf), CANONICAL['0007_v01_release_hardening']);
  });

  it('canonical LF 0008 -> 483a6152... (Git/LF fingerprint)', () => {
    const [, , , , , , , , m8] = migrationBytes();
    assert.strictEqual(m8.name, '0008_canonical_events_tightening');
    assert.strictEqual(sha256(m8.lf), CANONICAL['0008_canonical_events_tightening']);
  });

  it('same content as CRLF -> known non-canonical Windows hashes (diagnostic only)', () => {
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = migrationBytes();
    const crlf0 = m0.lf.replace(/\n/g, '\r\n');
    const crlf1 = m1.lf.replace(/\n/g, '\r\n');
    const crlf2 = m2.lf.replace(/\n/g, '\r\n');
    const crlf3 = m3.lf.replace(/\n/g, '\r\n');
    const crlf4 = m4.lf.replace(/\n/g, '\r\n');
    const crlf5 = m5.lf.replace(/\n/g, '\r\n');
    const crlf6 = m6.lf.replace(/\n/g, '\r\n');
    const crlf7 = m7.lf.replace(/\n/g, '\r\n');
    const crlf8 = m8.lf.replace(/\n/g, '\r\n');
    assert.strictEqual(sha256(crlf0), CRLF_KNOWN['0000_modern_hydra'], 'CRLF 0000 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf1), CRLF_KNOWN['0001_material_king_bedlam'], 'CRLF 0001 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf2), CRLF_KNOWN['0002_heavy_scarlet_witch'], 'CRLF 0002 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf3), CRLF_KNOWN['0003_smart_titania'], 'CRLF 0003 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf4), CRLF_KNOWN['0004_swift_availability'], 'CRLF 0004 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf5), CRLF_KNOWN['0005_rapid_enrollment'], 'CRLF 0005 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf6), CRLF_KNOWN['0006_smart_learning_engine'], 'CRLF 0006 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf7), CRLF_KNOWN['0007_v01_release_hardening'], 'CRLF 0007 must hash to the known Windows diagnostic hash');
    assert.strictEqual(sha256(crlf8), CRLF_KNOWN['0008_canonical_events_tightening'], 'CRLF 0008 must hash to the known Windows diagnostic hash');
    // They are DIFFERENT from canonical — never interchangeable.
    assert.notStrictEqual(CRLF_KNOWN['0000_modern_hydra'], CANONICAL['0000_modern_hydra']);
    assert.notStrictEqual(CRLF_KNOWN['0001_material_king_bedlam'], CANONICAL['0001_material_king_bedlam']);
    assert.notStrictEqual(CRLF_KNOWN['0002_heavy_scarlet_witch'], CANONICAL['0002_heavy_scarlet_witch']);
    assert.notStrictEqual(CRLF_KNOWN['0003_smart_titania'], CANONICAL['0003_smart_titania']);
    assert.notStrictEqual(CRLF_KNOWN['0004_swift_availability'], CANONICAL['0004_swift_availability']);
    assert.notStrictEqual(CRLF_KNOWN['0005_rapid_enrollment'], CANONICAL['0005_rapid_enrollment']);
    assert.notStrictEqual(CRLF_KNOWN['0006_smart_learning_engine'], CANONICAL['0006_smart_learning_engine']);
    assert.notStrictEqual(CRLF_KNOWN['0007_v01_release_hardening'], CANONICAL['0007_v01_release_hardening']);
    assert.notStrictEqual(CRLF_KNOWN['0008_canonical_events_tightening'], CANONICAL['0008_canonical_events_tightening']);
  });

  it('migration SQL working-tree files contain no CR bytes (eol=lf in effect)', () => {
    const dir = join(process.cwd(), 'src', 'db', 'migrations');
    for (const tag of [
      '0000_modern_hydra',
      '0001_material_king_bedlam',
      '0002_heavy_scarlet_witch',
      '0003_smart_titania',
      '0004_swift_availability',
      '0005_rapid_enrollment',
      '0006_smart_learning_engine',
      '0007_v01_release_hardening',
      '0008_canonical_events_tightening',
    ]) {
      const raw = readFileSync(join(dir, `${tag}.sql`));
      assert.strictEqual(raw.includes(0x0d), false, `${tag}.sql must contain NO 0x0D bytes in working tree`);
    }
  });

  it('CRLF input is rejected for migration execution (fail-closed preflight)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'eol-test-'));
    try {
      const migDir = join(tmp, 'migrations');
      const metaDir = join(migDir, 'meta');
      mkdirSync(metaDir, { recursive: true });
      writeFileSync(join(metaDir, '_journal.json'), JSON.stringify({ version: '7', dialect: 'postgresql', entries: [] }));
      writeFileSync(join(migDir, '0000_test.sql'), 'SELECT 1;\r\n');
      const violations = migrationEolViolations(migDir);
      assert.strictEqual(violations.length, 1);
      assert.strictEqual(violations[0], '0000_test.sql');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('meta/_journal.json CRLF is also rejected by preflight', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'eol-test-'));
    try {
      const migDir = join(tmp, 'migrations');
      const metaDir = join(migDir, 'meta');
      mkdirSync(metaDir, { recursive: true });
      writeFileSync(join(metaDir, '_journal.json'), '{\r\n  "version": "7"\r\n}\r\n');
      writeFileSync(join(migDir, '0000_test.sql'), 'SELECT 1;\n');
      const violations = migrationEolViolations(migDir);
      assert.strictEqual(violations.length, 1);
      assert.strictEqual(violations[0], 'meta/_journal.json');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
