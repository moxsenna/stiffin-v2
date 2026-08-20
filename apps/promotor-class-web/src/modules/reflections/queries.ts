import { getReflectionRepository } from '@/adapters';

export async function getReflectionsQuery() {
  return getReflectionRepository().getReflections();
}

export async function getReflectionsByEnrollmentIdQuery(enrollmentId: string) {
  return getReflectionRepository().getReflectionsByEnrollmentId(enrollmentId);
}
