import { LearningEvent, LearningEventType } from '@promotor/contracts';

export interface EventRepositoryPort {
  getLearningEvents(): Promise<LearningEvent[]>;
  getLearningEventsByContactId(contactId: string): Promise<LearningEvent[]>;
  recordLearningEvent(
    organizationId: string,
    contactId: string,
    eventType: LearningEventType,
    programId?: string,
    enrollmentId?: string,
    lessonId?: string,
    payload?: Record<string, unknown>
  ): Promise<LearningEvent>;
}
