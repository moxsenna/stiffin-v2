import { getEventRepository } from '@/adapters';

export async function getLearningEventsQuery() {
  return getEventRepository().getLearningEvents();
}

export async function getLearningEventsByContactIdQuery(contactId: string) {
  return getEventRepository().getLearningEventsByContactId(contactId);
}
