import { Enrollment } from '@promotor/contracts';

export interface EnrollmentRepositoryPort {
  getEnrollments(): Promise<Enrollment[]>;
  getEnrollmentById(id: string): Promise<Enrollment | undefined>;
  getEnrollmentsByContactId(contactId: string): Promise<Enrollment[]>;
  createEnrollment(contactId: string, programId: string): Promise<Enrollment>;
}
