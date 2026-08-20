import { getPromotorFlowAdapter } from '@/adapters';
import { IntegrationHealth } from '@promotor/contracts';

export async function getIntegrationHealthQuery(): Promise<IntegrationHealth> {
  return getPromotorFlowAdapter().getIntegrationHealth();
}
