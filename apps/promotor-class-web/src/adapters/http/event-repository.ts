import { PromotorApiClient } from '@promotor/api-client';
import { LearningEvent, LearningEventType } from '@promotor/contracts';
import { EventRepositoryPort } from '@/modules/events/ports';

export class HttpEventRepository implements EventRepositoryPort {
  constructor(private readonly client: PromotorApiClient) {}

  async getLearningEvents(): Promise<LearningEvent[]> {
    const res = await this.client.listClassActivity();
    return res.activity as unknown as LearningEvent[];
  }

  async getLearningEventsByContactId(contactId: string): Promise<LearningEvent[]> {
    const events = await this.getLearningEvents();
    return events.filter((e) => e.contactId === contactId);
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
    if (!enrollmentId) {
      throw new Error('Pencatatan event pembelajaran membutuhkan enrollmentId di mode HTTP');
    }
    const res = await this.client.recordLearnerEvent(enrollmentId, {
      eventType,
      payload,
    });
    return {
      id: (res as any).eventId || `${enrollmentId}_${eventType}_${Date.now()}`,
      organizationId,
      contactId,
      eventType,
      programId,
      enrollmentId,
      lessonId,
      payload: payload || {},
      occurredAt: (res as any).occurredAt || new Date().toISOString(),
    };
  }
}
