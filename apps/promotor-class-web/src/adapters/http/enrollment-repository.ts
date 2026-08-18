import { PromotorClassContentApiClient } from '@promotor/api-client';
import {
  EnrollmentRepositoryPort,
  PublicRegistrationPayload,
  PublicRegistrationResponse,
} from '@/modules/enrollments/ports';

export class HttpEnrollmentRepository implements EnrollmentRepositoryPort {
  private client: PromotorClassContentApiClient;

  constructor(client: PromotorClassContentApiClient) {
    this.client = client;
  }

  async registerPublicLearner(payload: PublicRegistrationPayload): Promise<PublicRegistrationResponse> {
    return this.client.registerPublicLearner(payload.workspaceSlug, payload.programSlug, {
      name: payload.name,
      phoneRaw: payload.phoneRaw,
      email: payload.email,
    });
  }

  async createEnrollment(contactId: string, programId: string): Promise<{ id: string; status: string }> {
    const res = await this.client.createManualEnrollment({ contactId, programId });
    return {
      id: res.enrollment.id,
      status: res.enrollment.status,
    };
  }

  async getEnrollments(filter?: { programId?: string; contactId?: string }): Promise<any[]> {
    const res = await this.client.listClassEnrollments(filter);
    return res.enrollments;
  }

  async getEnrollmentById(id: string): Promise<any> {
    // Return enrollment by querying learner programs or class enrollments
    const res = await this.client.listClassEnrollments();
    return res.enrollments.find((e) => e.id === id);
  }
}
