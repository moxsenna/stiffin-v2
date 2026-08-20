import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MockStateStore, INITIAL_RINA_PROFILE } from '../adapters/mock/mock-state-store';
import { getProgramRepository, resetAdapterInstances } from '../adapters';

describe('Domain Guardrails & Architecture Integrity Tests', () => {
  it('1. Class State MUST NOT contain nextActions collection', () => {
    const state = MockStateStore.getState();
    assert.strictEqual('nextActions' in state, false, 'Class state schema MUST NOT contain nextActions');
  });

  it('2. Contacts must use E.164 phone string property phoneE164', () => {
    const state = MockStateStore.getState();
    state.contacts.forEach(contact => {
      assert.ok(contact.phoneE164.startsWith('+'), `Contact ${contact.name} phoneE164 must start with +`);
    });
  });

  it('3. Learning Events must have valid canonical eventType', () => {
    const state = MockStateStore.getState();
    state.learningEvents.forEach(evt => {
      assert.ok(evt.eventType, `Event ${evt.id} must have eventType`);
    });
  });

  it('4. ALL UI pages & components (learner, public, promotor) MUST NOT directly import MockStateStore or mock adapters', () => {
    function scanDir(dirPath: string): string[] {
      let results: string[] = [];
      if (!fs.existsSync(dirPath)) return results;
      const list = fs.readdirSync(dirPath);
      for (const file of list) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(scanDir(fullPath));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const uiDirectories = [
      path.join(__dirname, '../app/(learner)'),
      path.join(__dirname, '../app/(public)'),
      path.join(__dirname, '../app/(promotor)'),
      path.join(__dirname, '../components/learner'),
      path.join(__dirname, '../components/public'),
      path.join(__dirname, '../components/promotor'),
      path.join(__dirname, '../components/layout'),
    ];

    let allUiFiles: string[] = [];
    for (const dir of uiDirectories) {
      allUiFiles = allUiFiles.concat(scanDir(dir));
    }

    assert.ok(allUiFiles.length > 0, 'UI files must be found for testing');

    for (const filePath of allUiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(path.join(__dirname, '..'), filePath);

      assert.strictEqual(
        content.includes('MockStateStore'),
        false,
        `UI layer file ${relPath} MUST NOT directly import MockStateStore`
      );
      assert.strictEqual(
        content.includes('/adapters/mock/'),
        false,
        `UI layer file ${relPath} MUST NOT directly import from /adapters/mock/`
      );
      assert.strictEqual(
        content.includes('@promotor/promotor-class-fixtures'),
        false,
        `UI layer file ${relPath} MUST NOT directly import fixtures`
      );
      assert.strictEqual(
        content.includes('staging-promotor-session-token-demo'),
        false,
        `UI layer file ${relPath} MUST NOT contain demo session token`
      );
    }
  });

  it('5. Public & Promotor UI components & default seed profile MUST NOT contain fake phone numbers like 6281234567890', () => {
    function scanDir(dirPath: string): string[] {
      let results: string[] = [];
      if (!fs.existsSync(dirPath)) return results;
      const list = fs.readdirSync(dirPath);
      for (const file of list) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(scanDir(fullPath));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const uiDirs = [
      path.join(__dirname, '../components/public'),
      path.join(__dirname, '../components/promotor'),
    ];

    for (const dir of uiDirs) {
      const files = scanDir(dir);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const relPath = path.relative(path.join(__dirname, '..'), file);
        assert.strictEqual(
          content.includes('6281234567890'),
          false,
          `UI component ${relPath} MUST NOT contain hardcoded phone string 6281234567890`
        );
      }
    }

    assert.strictEqual(
      !!INITIAL_RINA_PROFILE.whatsappPhoneE164?.includes('6281234567890'),
      false,
      'INITIAL_RINA_PROFILE MUST NOT contain fake phone number 6281234567890'
    );
  });

  it('6. session.ts MUST NOT contain tenant fallbacks or MockStateStore imports', () => {
    const sessionFilePath = path.join(__dirname, '../lib/session.ts');
    const content = fs.readFileSync(sessionFilePath, 'utf-8');

    assert.strictEqual(
      content.includes("|| 'rina'"),
      false,
      "session.ts MUST NOT contain fallback || 'rina'"
    );
    assert.strictEqual(
      content.includes('MockStateStore'),
      false,
      'session.ts MUST NOT import MockStateStore'
    );
  });

  it('7. ALL modules/** files MUST NOT directly import from /adapters/mock/ or /adapters/http/ (factory only)', () => {
    const targetDir = path.join(__dirname, '../modules');
    const files: string[] = [];

    function scan(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          scan(full);
        } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
          files.push(full);
        }
      }
    }
    scan(targetDir);

    assert.ok(files.length > 0, 'Target module files must be found');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const rel = path.relative(path.join(__dirname, '..'), file);
      assert.strictEqual(
        content.includes('/adapters/mock/'),
        false,
        `modules file ${rel} MUST NOT import from /adapters/mock/`
      );
      assert.strictEqual(
        content.includes('MockStateStore'),
        false,
        `modules file ${rel} MUST NOT import MockStateStore`
      );
      assert.strictEqual(
        content.includes('/adapters/http/'),
        false,
        `modules file ${rel} MUST NOT import from /adapters/http/`
      );
    }
  });

  it('8. Adapter Factory fails closed in production when mode is not http', () => {
    const origEnv = process.env.NODE_ENV;
    const origMode = process.env.NEXT_PUBLIC_API_MODE;
    try {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_API_MODE;
      resetAdapterInstances();

      assert.throws(
        () => {
          getProgramRepository();
        },
        /Production environment requires NEXT_PUBLIC_API_MODE="http"/
      );
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      process.env.NEXT_PUBLIC_API_MODE = origMode;
      resetAdapterInstances();
    }
  });
});
