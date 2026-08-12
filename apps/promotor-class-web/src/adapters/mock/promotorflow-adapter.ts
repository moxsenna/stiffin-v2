import { FlowNextActionRef, IntegrationMode } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';

export class MockPromotorFlowAdapter {
  getIntegrationMode(): IntegrationMode {
    return MockStateStore.getState().entitlements.integrationMode;
  }

  setIntegrationMode(mode: IntegrationMode): void {
    MockStateStore.updateState(state => ({
      ...state,
      entitlements: {
        ...state.entitlements,
        integrationMode: mode,
      },
      integrationHealth: {
        ...state.integrationHealth,
        status: mode === 'BUNDLE_FLOW_UNAVAILABLE' ? 'degraded' : 'healthy',
      },
    }));
  }

  async createNextActionReference(contactId: string, suggestedTitle: string): Promise<FlowNextActionRef | null> {
    const mode = this.getIntegrationMode();

    if (mode === 'CLASS_ONLY') {
      // Local recommended step only
      return null;
    }

    if (mode === 'BUNDLE_FLOW_UNAVAILABLE') {
      // Flow unavailable, queue in outbox, return degraded reference
      MockStateStore.updateState(state => ({
        ...state,
        integrationHealth: {
          ...state.integrationHealth,
          status: 'degraded',
          pendingOutboxCount: state.integrationOutbox.length + 1,
        },
      }));
      return null;
    }

    // BUNDLE_AVAILABLE: Successfully creates Flow next action reference
    const newRef: FlowNextActionRef = {
      id: `ref_${Date.now()}`,
      flowNextActionId: `flow_act_${Date.now()}`,
      contactId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    MockStateStore.updateState(state => ({
      ...state,
      flowNextActionRefs: [newRef, ...state.flowNextActionRefs],
    }));

    return newRef;
  }
}

export const promotorFlowAdapter = new MockPromotorFlowAdapter();
