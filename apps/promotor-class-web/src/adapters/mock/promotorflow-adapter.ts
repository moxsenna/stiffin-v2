import {
  PromotorFlowAdapter,
  FlowContactContext,
  AssessmentStatus,
  LearningNextActionRequest,
  FlowNextActionRef,
  LearningActivityProjection,
  IntegrationEventEnvelope,
  IntegrationHealth,
} from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';

export class MockPromotorFlowAdapter implements PromotorFlowAdapter {
  async getContactContext(contactId: string): Promise<FlowContactContext> {
    return {
      contactId,
      stage: 'CONTACTED',
      classification: 'PROSPECT',
      primaryNextAction: {
        id: `act_${contactId}_1`,
        type: 'FOLLOW_UP',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      },
    };
  }

  async getAssessmentStatus(contactId: string): Promise<AssessmentStatus> {
    const contact = MockStateStore.getState().contacts.find(c => c.id === contactId);
    if (!contact) return 'UNKNOWN';
    return contactId === 'contact_nina' ? 'COMPLETED' : 'NOT_STARTED';
  }

  async createNextAction(input: LearningNextActionRequest): Promise<FlowNextActionRef> {
    const state = MockStateStore.getState();

    // Idempotency check using input.idempotencyKey
    const existingRef = state.flowNextActionRefs.find(r => r.id === input.idempotencyKey);
    if (existingRef) {
      return existingRef;
    }

    const newRef: FlowNextActionRef = {
      id: input.idempotencyKey,
      contactId: input.contactId,
      nextActionId: `flow_act_${Date.now()}`,
      title: input.title,
      createdAt: new Date().toISOString(),
    };

    MockStateStore.updateState(curr => ({
      ...curr,
      flowNextActionRefs: [newRef, ...curr.flowNextActionRefs],
    }));

    return newRef;
  }

  async appendLearningActivity(input: LearningActivityProjection): Promise<void> {
    console.log('[MockPromotorFlowAdapter] Appended learning activity:', input);
  }

  // Internal Outbox Dispatcher Port
  async getIntegrationHealth(): Promise<IntegrationHealth> {
    return MockStateStore.getState().integrationHealth;
  }

  async dispatchOutboxEnvelope(envelope: IntegrationEventEnvelope): Promise<FlowNextActionRef | null> {
    const health = await this.getIntegrationHealth();

    if (health.promotorFlow === 'UNAVAILABLE') {
      return null;
    }

    const request: LearningNextActionRequest = {
      organizationId: envelope.organizationId,
      contactId: envelope.contactId,
      source: 'PROMOTORCLASS',
      sourceEventId: envelope.eventId,
      actionType: 'FOLLOW_UP',
      title: (envelope.payload.primaryReason as string) || 'Follow-up sinyal belajar',
      reason: (envelope.payload.primaryReason as string) || 'Mencapai milestone pembelajaran',
      context: {
        programId: envelope.subject?.programId,
        enrollmentId: envelope.subject?.enrollmentId,
      },
      idempotencyKey: `ref_${envelope.eventId}`,
    };

    return this.createNextAction(request);
  }
}

export const promotorFlowAdapter = new MockPromotorFlowAdapter();
