import { promotorFlowAdapter } from '@/adapters/mock/promotorflow-adapter';
import { IntegrationHealth } from '@promotor/contracts';

export async function getIntegrationHealthQuery(): Promise<IntegrationHealth> {
  return promotorFlowAdapter.getIntegrationHealth();
}
