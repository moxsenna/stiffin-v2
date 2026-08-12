import { MockStateStore } from '@/adapters/mock/mock-state-store';

export async function getLearningSignalsQuery() {
  return MockStateStore.getState().learningSignals;
}

export async function getSignalByContactIdQuery(contactId: string) {
  return MockStateStore.getState().learningSignals.find(s => s.contactId === contactId);
}
