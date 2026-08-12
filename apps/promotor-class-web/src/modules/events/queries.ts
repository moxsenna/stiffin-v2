import { MockStateStore } from '@/adapters/mock/mock-state-store';

export async function getLearningEventsQuery() {
  return MockStateStore.getState().learningEvents;
}

export async function getLearningEventsByContactIdQuery(contactId: string) {
  return MockStateStore.getState().learningEvents.filter(e => e.contactId === contactId);
}
