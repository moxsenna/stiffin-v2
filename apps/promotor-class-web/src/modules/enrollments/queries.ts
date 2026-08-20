import { getEnrollmentRepository } from '@/adapters';

export async function getEnrollmentsQuery() {
  return getEnrollmentRepository().getEnrollments();
}

export async function getEnrollmentByIdQuery(id: string) {
  return getEnrollmentRepository().getEnrollmentById(id);
}

export async function getEnrollmentsByContactIdQuery(contactId: string) {
  return getEnrollmentRepository().getEnrollments({ contactId });
}
