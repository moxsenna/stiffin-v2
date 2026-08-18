import { getLearningRepository } from '@/adapters';

export async function getEnrollmentFullDetailsQuery(enrollmentId: string) {
  const repo = getLearningRepository();
  return repo.getEnrollmentDetails(enrollmentId);
}

export async function listSignalsQuery(status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED') {
  const repo = getLearningRepository();
  return repo.listSignals(status);
}
