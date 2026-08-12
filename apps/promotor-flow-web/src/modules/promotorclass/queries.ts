import { PromotorClassAdapterPort } from './ports';

export function createPromotorClassQueries(adapter: PromotorClassAdapterPort) {
  return {
    async getIntegrationState() {
      return adapter.getEntitlementsAndHealth();
    },

    async getLearningContext(contactId: string) {
      return adapter.getLearningContext(contactId);
    },
  };
}
