import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('P0-5 — Production Frontend Build Configuration & Bundle Invariants (PromotorFlow)', () => {
  it('1. package.json deploy:cf specifies production API URL and NEXT_PUBLIC_API_MODE=http', () => {
    const pkgPath = path.join(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    assert.ok(pkg.scripts['deploy:cf'], 'deploy:cf script must exist');
    assert.ok(
      pkg.scripts['deploy:cf'].includes('NEXT_PUBLIC_API_MODE=http'),
      'deploy:cf MUST set NEXT_PUBLIC_API_MODE=http'
    );
    assert.ok(
      pkg.scripts['deploy:cf'].includes('https://stiffin-promotor-api.moxsenna.workers.dev'),
      'deploy:cf MUST set production API URL'
    );
    assert.strictEqual(
      pkg.scripts['deploy:cf'].includes('localhost:8787'),
      false,
      'deploy:cf MUST NOT reference localhost:8787'
    );
    assert.strictEqual(
      pkg.scripts['deploy:cf'].includes('stiffin-promotor-api-staging'),
      false,
      'deploy:cf MUST NOT reference staging API'
    );
  });

  it('2. Production source files contain zero demo session tokens', () => {
    function scanDir(dirPath: string): string[] {
      let results: string[] = [];
      if (!fs.existsSync(dirPath)) return results;
      for (const file of fs.readdirSync(dirPath)) {
        const full = path.join(dirPath, file);
        if (fs.statSync(full).isDirectory()) {
          results = results.concat(scanDir(full));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(full);
        }
      }
      return results;
    }

    const prodDirs = [
      path.join(__dirname, '../app'),
      path.join(__dirname, '../components'),
      path.join(__dirname, '../lib'),
      path.join(__dirname, '../modules'),
    ];

    let allFiles: string[] = [];
    for (const dir of prodDirs) {
      allFiles = allFiles.concat(scanDir(dir));
    }

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const rel = path.relative(path.join(__dirname, '..'), file);

      assert.strictEqual(
        content.includes('staging-promotor-session-token-demo'),
        false,
        `Production source file ${rel} MUST NOT contain demo session token`
      );
    }
  });
});
