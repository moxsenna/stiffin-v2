import { PromotorClassAdapterPort } from './ports';
import { EligibleProgramsInput, ProgramSummary } from '@promotor/contracts';

export function createPromotorClassQueries(adapter: PromotorClassAdapterPort) {
  return {
    async getIntegrationState() {
      return adapter.getEntitlementsAndHealth();
    },

    async getLearningContext(contactId: string) {
      return adapter.getLearningContext(contactId);
    },

    async listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]> {
      return adapter.listEligiblePrograms(input);
    },
  };
}
