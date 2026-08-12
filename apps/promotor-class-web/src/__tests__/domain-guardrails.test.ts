import { describe, it } from 'node:test';
import assert from 'node:assert';
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
});
