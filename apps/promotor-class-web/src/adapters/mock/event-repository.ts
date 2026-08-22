import { LearningEvent, LearningEventType } from '@promotor/contracts';
import { EventRepositoryPort } from '@/modules/events/ports';
import { MockStateStore } from './mock-state-store';

export class MockEventRepository implements EventRepositoryPort {
  async getLearningEvents(): Promise<LearningEvent[]> {
    return MockStateStore.getState().learningEvents;
  }

  async getLearningEventsByContactId(contactId: string): Promise<LearningEvent[]> {
    return MockStateStore.getState().learningEvents.filter((e) => e.contactId === contactId);
  }

  async recordLearningEvent(
    organizationId: string,
    contactId: string,
    eventType: LearningEventType,
    programId?: string,
    enrollmentId?: string,
    lessonId?: string,
    payload?: Record<string, unknown>
  ): Promise<LearningEvent> {
    const event: LearningEvent = {
      id: `ev-${Date.now()}`,
      organizationId,
      contactId,
      eventType,
      programId,
      enrollmentId,
      lessonId,
      payload: payload || {},
      occurredAt: new Date().toISOString(),
    };
    MockStateStore.updateState((s) => ({
      ...s,
      learningEvents: [event, ...s.learningEvents],
    }));
    return event;
  }
}
