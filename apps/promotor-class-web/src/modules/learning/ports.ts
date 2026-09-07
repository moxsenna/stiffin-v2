import {
  LearnerEnrollmentDetailsDto,
  CompleteLessonResponse,
  SubmitReflectionResponse,
  RecordLearningEventResponse,
  LearningSignalDto,
  LearningEventType,
} from '@promotor/contracts';

export interface LearningRepositoryPort {
  getEnrollmentDetails(enrollmentId: string): Promise<LearnerEnrollmentDetailsDto>;
  completeLesson(enrollmentId: string, lessonId: string): Promise<CompleteLessonResponse>;
  submitReflection(
    enrollmentId: string,
    lessonId: string,
    data: { responseText?: string | null; selectedOptions?: unknown }
  ): Promise<SubmitReflectionResponse>;
  updateLessonPosition(
    enrollmentId: string,
    lessonId: string,
    positionSeconds: number
  ): Promise<{ ok: boolean }>;
  recordEvent(
    enrollmentId: string,
    data: { eventType: LearningEventType; payload?: Record<string, unknown> }
  ): Promise<RecordLearningEventResponse>;
  listSignals(status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalDto[]>;
  updateSignalStatus(signalId: string, status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalDto>;
}
