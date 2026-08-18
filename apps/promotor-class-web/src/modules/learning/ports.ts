import {
  LearnerEnrollmentDetailsDto,
  CompleteLessonResponse,
  SubmitReflectionResponse,
  RecordLearningEventResponse,
  LearningSignalDto,
} from '@promotor/contracts';

export interface LearningRepositoryPort {
  getEnrollmentDetails(enrollmentId: string): Promise<LearnerEnrollmentDetailsDto>;
  completeLesson(enrollmentId: string, lessonId: string): Promise<CompleteLessonResponse>;
  submitReflection(
    enrollmentId: string,
    lessonId: string,
    data: { responseText?: string | null; selectedOptions?: unknown }
  ): Promise<SubmitReflectionResponse>;
  recordEvent(
    enrollmentId: string,
    data: { eventType: string; payload?: Record<string, unknown> }
  ): Promise<RecordLearningEventResponse>;
  listSignals(status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalDto[]>;
  updateSignalStatus(signalId: string, status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalDto>;
}
