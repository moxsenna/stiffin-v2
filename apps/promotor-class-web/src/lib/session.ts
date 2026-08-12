import { MockStateStore } from '@/adapters/mock/mock-state-store';

const SESSION_KEY = 'promotor_class_learner_session_v1';

export function getActiveLearnerContactId(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
  }
  return MockStateStore.getState().currentLearnerAccess.contactId;
}

export function setActiveLearnerSession(contactId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, contactId);
  }
  MockStateStore.updateState(curr => ({
    ...curr,
    currentLearnerAccess: { contactId },
  }));
}

export function clearActiveLearnerSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
  MockStateStore.updateState(curr => ({
    ...curr,
    currentLearnerAccess: { contactId: null },
  }));
}
