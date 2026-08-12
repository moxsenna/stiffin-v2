import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MockStateStore } from '../adapters/mock/mock-state-store';

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

  it('4. Learner UI pages and components MUST NOT directly import MockStateStore or mock adapters', () => {
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

    const learnerAppFiles = scanDir(path.join(__dirname, '../app/(learner)'));
    const learnerCompFiles = scanDir(path.join(__dirname, '../components/learner'));
    const allLearnerFiles = [...learnerAppFiles, ...learnerCompFiles];

    assert.ok(allLearnerFiles.length > 0, 'Learner files must be found for testing');

    for (const filePath of allLearnerFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.strictEqual(
        content.includes('MockStateStore'),
        false,
        `Learner file ${path.basename(filePath)} MUST NOT directly import MockStateStore`
      );
      assert.strictEqual(
        content.includes('/adapters/mock/'),
        false,
        `Learner file ${path.basename(filePath)} MUST NOT directly import from /adapters/mock/`
      );
      assert.strictEqual(
        content.includes('@promotor/promotor-class-fixtures'),
        false,
        `Learner file ${path.basename(filePath)} MUST NOT directly import fixtures`
      );
    }
  });

  it('5. Public UI components MUST NOT contain hardcoded phone numbers like 6281234567890', () => {
    const publicComponentsDir = path.join(__dirname, '../components/public');
    if (fs.existsSync(publicComponentsDir)) {
      const files = fs.readdirSync(publicComponentsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(publicComponentsDir, file), 'utf-8');
        assert.strictEqual(
          content.includes('6281234567890'),
          false,
          `Public component ${file} MUST NOT contain hardcoded phone string 6281234567890`
        );
      }
    }
  });

  it('6. session.ts MUST NOT contain tenant fallbacks like || rina or workspaceSlug: rina', () => {
    const sessionFilePath = path.join(__dirname, '../lib/session.ts');
    const content = fs.readFileSync(sessionFilePath, 'utf-8');

    assert.strictEqual(
      content.includes("|| 'rina'"),
      false,
      "session.ts MUST NOT contain fallback || 'rina'"
    );
    assert.strictEqual(
      content.includes('workspaceSlug: \'rina\''),
      false,
      "session.ts MUST NOT contain workspaceSlug: 'rina'"
    );
  });
});
