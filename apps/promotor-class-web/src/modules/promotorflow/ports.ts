import { IntegrationEventEnvelope, FlowNextActionRef, IntegrationHealth } from '@promotor/contracts';

export interface PromotorFlowAdapterPort {
  getIntegrationHealth(): Promise<IntegrationHealth>;
  dispatchOutboxEnvelope(envelope: IntegrationEventEnvelope): Promise<FlowNextActionRef | null>;
}
