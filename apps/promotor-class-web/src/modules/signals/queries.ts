import { getSignalRepository } from '@/adapters';

export async function getLearningSignalsQuery() {
  return getSignalRepository().getSignals();
}

export async function getSignalByContactIdQuery(contactId: string) {
  return getSignalRepository().getSignalByContactId(contactId);
}
