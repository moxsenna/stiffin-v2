import { PromotorApiClient } from '@promotor/api-client';
import {
  LearnerEnrollmentDetailsDto,
  CompleteLessonResponse,
  SubmitReflectionResponse,
  RecordLearningEventResponse,
  LearningSignalDto,
} from '@promotor/contracts';
import { LearningRepositoryPort } from '@/modules/learning/ports';

export class HttpLearningRepository implements LearningRepositoryPort {
  constructor(private readonly client: PromotorApiClient) {}

  async getEnrollmentDetails(enrollmentId: string): Promise<LearnerEnrollmentDetailsDto> {
    return this.client.getLearnerEnrollmentDetails(enrollmentId);
  }

  async completeLesson(enrollmentId: string, lessonId: string): Promise<CompleteLessonResponse> {
    return this.client.completeLearnerLesson(enrollmentId, lessonId);
  }

  async submitReflection(
    enrollmentId: string,
    lessonId: string,
    data: { responseText?: string | null; selectedOptions?: unknown }
  ): Promise<SubmitReflectionResponse> {
    return this.client.submitLearnerReflection(enrollmentId, lessonId, data);
  }

  async recordEvent(
    enrollmentId: string,
    data: { eventType: string; payload?: Record<string, unknown> }
  ): Promise<RecordLearningEventResponse> {
    return this.client.recordLearnerEvent(enrollmentId, data);
  }

  async listSignals(status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalDto[]> {
    const res = await this.client.listClassSignals(status);
    return res.signals;
  }

  async updateSignalStatus(
    signalId: string,
    status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'
  ): Promise<LearningSignalDto> {
    const res = await this.client.updateClassSignalStatus(signalId, status);
    return res.signal;
  }
}
