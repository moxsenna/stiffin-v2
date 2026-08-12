import { learnerRepository } from '@/adapters/mock/learner-repository';

export async function createEnrollmentCommand(contactId: string, programId: string) {
  return learnerRepository.createEnrollment(contactId, programId);
}
