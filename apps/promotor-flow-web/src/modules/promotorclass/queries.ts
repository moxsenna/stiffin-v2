import { PromotorClassAdapterPort } from './ports';
import { EligibleProgramsInput, ProgramSummary, EnrollmentStatus, LearningContext } from '@promotor/contracts';

export function createPromotorClassQueries(adapter: PromotorClassAdapterPort) {
  return {
    async getIntegrationState() {
      return adapter.getEntitlementsAndHealth();
    },

    async getLearningContext(contactId: string): Promise<LearningContext> {
      return adapter.getLearningContext(contactId);
    },

    async listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]> {
      return adapter.listEligiblePrograms(input);
    },

    async getEnrollmentStatus(contactId: string, programId: string): Promise<EnrollmentStatus | null> {
      return adapter.getEnrollmentStatus(contactId, programId);
    },
  };
}
