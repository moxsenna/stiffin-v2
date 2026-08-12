import { IntegrationEventEnvelope, FlowNextActionRef, IntegrationHealth } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';
import { PromotorFlowAdapterPort } from '@/modules/promotorflow/ports';

export class MockPromotorFlowAdapter implements PromotorFlowAdapterPort {
  async getIntegrationHealth(): Promise<IntegrationHealth> {
    return MockStateStore.getState().integrationHealth;
  }

  async setIntegrationHealth(status: 'AVAILABLE' | 'UNAVAILABLE'): Promise<void> {
    MockStateStore.updateState(state => ({
      ...state,
      integrationHealth: {
        ...state.integrationHealth,
        promotorFlow: status,
      },
    }));
  }

  async dispatchOutboxEnvelope(envelope: IntegrationEventEnvelope): Promise<FlowNextActionRef | null> {
    const health = await this.getIntegrationHealth();

    if (health.promotorFlow === 'UNAVAILABLE') {
      // Flow offline, envelope remains queued in integrationOutbox
      return null;
    }

    // PromotorFlow AVAILABLE: Generate FlowNextActionRef
    const newRef: FlowNextActionRef = {
      id: `ref_${Date.now()}`,
      contactId: envelope.contactId,
      nextActionId: `flow_act_${Date.now()}`,
      title: (envelope.subject as string) || 'Rekomendasi Aksi PromotorFlow',
      createdAt: new Date().toISOString(),
    };

    MockStateStore.updateState(state => ({
      ...state,
      flowNextActionRefs: [newRef, ...state.flowNextActionRefs],
      integrationOutbox: state.integrationOutbox.map(item => {
        if (item.envelope.eventId === envelope.eventId) {
          return { ...item, status: 'SENT', sentAt: new Date().toISOString() };
        }
        return item;
      }),
    }));

    return newRef;
  }
}

export const promotorFlowAdapter = new MockPromotorFlowAdapter();
