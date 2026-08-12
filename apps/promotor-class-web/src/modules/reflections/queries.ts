import { MockStateStore } from '@/adapters/mock/mock-state-store';

export async function getReflectionsQuery() {
  return MockStateStore.getState().reflections;
}

export async function getReflectionsByEnrollmentIdQuery(enrollmentId: string) {
  return MockStateStore.getState().reflections.filter(r => r.enrollmentId === enrollmentId);
}
