/**
 * Domain & Architecture Guardrail Verification Tests for PromotorClass
 */
import { MockStateStore } from '../adapters/mock/mock-state-store';
import { normalizePhone } from '@promotor/platform-core';
import { evaluateSignalRules } from '../modules/signals/rules';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Guardrail Test Failed: ${message}`);
  }
}

export function runDomainGuardrailTests() {
  // Test 1: Class state schema has no canonical nextActions collection
  const state = MockStateStore.getState();
  assert(!('nextActions' in state), 'Class state schema must NOT have canonical nextActions collection');

  // Test 2: E.164 phone normalization produces valid +628... format
  assert(normalizePhone('08123456789') === '+628123456789', '08123456789 normalization');
  assert(normalizePhone('628123456789') === '+628123456789', '628123456789 normalization');
  assert(normalizePhone('+62 812-3456-789') === '+628123456789', '+62 812-3456-789 normalization');

  // Test 3: Signal rule evaluation returns Minat tinggi upon program completion
  const res1 = evaluateSignalRules(100, true, false);
  assert(res1.minatStatus === 'Minat tinggi', 'Completion yields Minat tinggi');
  assert(res1.primaryReason === 'Program selesai', 'Reason program selesai');

  // Test 4: Signal rule evaluation detects HP conflict in reflection text
  const res2 = evaluateSignalRules(66, false, false, 'Penggunaan HP sering memicu konflik');
  assert(res2.minatStatus === 'Minat sedang', 'HP reflection yields Minat sedang');
  assert(res2.primaryReason === 'Refleksi menyebut konflik penggunaan HP', 'Reason HP reflection');

  console.log('✅ All PromotorClass Domain Guardrail Tests Passed Cleanly!');
}

if (typeof require !== 'undefined' && require.main === module) {
  runDomainGuardrailTests();
}
