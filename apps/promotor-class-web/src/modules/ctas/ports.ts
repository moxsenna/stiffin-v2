import { LearningEvent } from '@promotor/contracts';

export interface CtaRepositoryPort {
  recordCtaViewed(contactId: string, enrollmentId: string, lessonId: string, ctaUrl: string): Promise<LearningEvent>;
  recordCtaClicked(contactId: string, enrollmentId: string, lessonId: string, ctaUrl: string): Promise<LearningEvent>;
}
