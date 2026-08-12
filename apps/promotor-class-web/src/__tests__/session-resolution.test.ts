import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MockStateStore } from '../adapters/mock/mock-state-store';
import {
  getActiveLearnerSession,
  setActiveLearnerSession,
  clearActiveLearnerSession,
  resolveWorkspaceSlug,
  setLastPublicWorkspaceSlug,
} from '../lib/session';

// Polyfill window & localStorage for Node test runner
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

if (typeof (global as any).window === 'undefined') {
  (global as any).window = {};
  (global as any).localStorage = mockLocalStorage;
}

describe('PromotorClass F0.3.1 Session & Multi-Tenant Resolution Test Suite', () => {
  beforeEach(() => {
    storageMap.clear();
    MockStateStore.resetDemo();
    clearActiveLearnerSession();
    MockStateStore.updateState(curr => ({
      ...curr,
      currentLearnerAccess: { contactId: null, workspaceSlug: null },
    }));
  });

  it('A. V2 Session: contactId + workspaceSlug resolves correctly', () => {
    setActiveLearnerSession({ contactId: 'contact_ayu', workspaceSlug: 'rina' });

    const session = getActiveLearnerSession();
    assert.strictEqual(session !== null, true);
    assert.strictEqual(session?.contactId, 'contact_ayu');
    assert.strictEqual(session?.workspaceSlug, 'rina');
  });

  it('B. Legacy contactId + known last workspace migrates correctly', () => {
    clearActiveLearnerSession();
    mockLocalStorage.setItem('promotor_class_learner_session_v1', 'contact_nina');
    mockLocalStorage.setItem('promotor_class_last_public_workspace', 'budi_workspace');

    const session = getActiveLearnerSession();
    assert.strictEqual(session !== null, true);
    assert.strictEqual(session?.contactId, 'contact_nina');
    assert.strictEqual(session?.workspaceSlug, 'budi_workspace');

    // Verify migrated to V2 storage
    const v2Stored = mockLocalStorage.getItem('promotor_class_learner_session_v2');
    assert.strictEqual(v2Stored !== null, true);
    assert.strictEqual(JSON.parse(v2Stored!).workspaceSlug, 'budi_workspace');
  });

  it('C. Legacy contactId + NO known workspace MUST return null and MUST NOT become "rina"', () => {
    clearActiveLearnerSession();
    mockLocalStorage.setItem('promotor_class_learner_session_v1', 'contact_unknown');
    // Ensure no last_public_workspace exists
    mockLocalStorage.removeItem('promotor_class_last_public_workspace');

    const session = getActiveLearnerSession();
    assert.strictEqual(session, null, 'Session MUST return null when workspace is unknown');
    assert.notStrictEqual((session as any)?.workspaceSlug, 'rina', 'Session MUST NOT default to "rina"');
  });

  it('D. resolveWorkspaceSlug priority: explicit route > active session > last public workspace > null', () => {
    clearActiveLearnerSession();
    mockLocalStorage.clear();

    // Priority 4: No route, no session, no last public -> null
    assert.strictEqual(resolveWorkspaceSlug(), null);

    // Priority 3: Last public workspace
    setLastPublicWorkspaceSlug('last_public_ws');
    assert.strictEqual(resolveWorkspaceSlug(), 'last_public_ws');

    // Priority 2: Active session overrides last public
    setActiveLearnerSession({ contactId: 'contact_ayu', workspaceSlug: 'session_ws' });
    assert.strictEqual(resolveWorkspaceSlug(), 'session_ws');

    // Priority 1: Explicit route overrides active session
    assert.strictEqual(resolveWorkspaceSlug('explicit_route_ws'), 'explicit_route_ws');
  });
});
