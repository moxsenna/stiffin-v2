import {
  EnrollmentRepositoryPort,
  PublicRegistrationPayload,
  PublicRegistrationResponse,
} from '@/modules/enrollments/ports';
import { MockLearnerRepository, learnerRepository } from './learner-repository';

export class MockEnrollmentRepository implements EnrollmentRepositoryPort {
  private repo: MockLearnerRepository;

  constructor() {
    this.repo = learnerRepository;
  }

  async registerPublicLearner(payload: PublicRegistrationPayload): Promise<PublicRegistrationResponse> {
    const contactId = `contact_${Date.now()}`;
    const programId = `prog_${Date.now()}`;
    const enrollment = await this.repo.createEnrollment(contactId, programId);

    return {
      enrollmentId: enrollment.id,
      contactId,
      organizationId: enrollment.organizationId,
      programId,
      programTitle: 'Program Edukasi STIFIn',
      status: 'ENROLLED',
      accessToken: `mock_token_${Date.now()}`,
    };
  }

  async createEnrollment(contactId: string, programId: string): Promise<{ id: string; status: string }> {
    const enrollment = await this.repo.createEnrollment(contactId, programId);
    return {
      id: enrollment.id,
      status: enrollment.status,
    };
  }

  async getEnrollments(filter?: { programId?: string; contactId?: string }): Promise<any[]> {
    if (filter?.contactId) {
      return this.repo.getEnrollmentsByContactId(filter.contactId);
    }
    return this.repo.getEnrollments();
  }

  async getEnrollmentById(id: string): Promise<any> {
    return this.repo.getEnrollmentById(id);
  }
}
