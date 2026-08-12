import { learnerRepository } from '@/adapters/mock/learner-repository';

export async function getEnrollmentsQuery() {
  return learnerRepository.getEnrollments();
}

export async function getEnrollmentByIdQuery(id: string) {
  return learnerRepository.getEnrollmentById(id);
}

export async function getEnrollmentsByContactIdQuery(contactId: string) {
  return learnerRepository.getEnrollmentsByContactId(contactId);
}
