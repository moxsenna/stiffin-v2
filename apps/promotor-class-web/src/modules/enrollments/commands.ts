import { getEnrollmentRepository } from '@/adapters';

export async function createEnrollmentCommand(contactId: string, programId: string) {
  return getEnrollmentRepository().createEnrollment(contactId, programId);
}
