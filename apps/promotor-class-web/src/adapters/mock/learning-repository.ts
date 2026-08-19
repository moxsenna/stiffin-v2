import {
  LearnerEnrollmentDetailsDto,
  CompleteLessonResponse,
  SubmitReflectionResponse,
  RecordLearningEventResponse,
  LearningSignalDto,
  LearningEventType,
} from '@promotor/contracts';
import { LearningRepositoryPort } from '@/modules/learning/ports';

export class MockLearningRepository implements LearningRepositoryPort {
  private signals: LearningSignalDto[] = [];

  async getEnrollmentDetails(enrollmentId: string): Promise<LearnerEnrollmentDetailsDto> {
    return {
      enrollment: {
        id: enrollmentId,
        organizationId: 'org_mock',
        programId: 'prog_mock',
        contactId: 'cnt_mock',
        status: 'ENROLLED',
        enrolledAt: new Date().toISOString(),
        progressPercent: 0,
        intentScore: 0,
        intentLabel: 'COLD',
        learningStatus: 'NOT_STARTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      program: {
        id: 'prog_mock',
        title: 'Mock Program Title',
        programSlug: 'mock-program',
        description: 'Mock Program Description',
        modules: [
          {
            id: 'mod_1',
            title: 'Module 1',
            orderIndex: 0,
            lessons: [
              {
                id: 'les_1',
                title: 'Lesson 1',
                orderIndex: 0,
                isCompleted: false,
              },
            ],
          },
        ],
      },
    };
  }

  async completeLesson(enrollmentId: string, lessonId: string): Promise<CompleteLessonResponse> {
    return {
      enrollmentId,
      lessonId,
      isCompleted: true,
      progressPercent: 100,
      learningStatus: 'COMPLETED',
      intentScore: 50,
      intentLabel: 'WARM',
      completedAt: new Date().toISOString(),
    };
  }

  async submitReflection(
    enrollmentId: string,
    lessonId: string,
    data: { responseText?: string | null; selectedOptions?: unknown }
  ): Promise<SubmitReflectionResponse> {
    return {
      enrollmentId,
      lessonId,
      responseText: data.responseText ?? null,
      selectedOptions: data.selectedOptions ?? null,
      submittedAt: new Date().toISOString(),
      progressPercent: 100,
      learningStatus: 'COMPLETED',
      intentScore: 85,
      intentLabel: 'HOT',
    };
  }

  async recordEvent(
    enrollmentId: string,
    data: { eventType: LearningEventType; payload?: Record<string, unknown> }
  ): Promise<RecordLearningEventResponse> {
    return {
      enrollmentId,
      progressPercent: 100,
      intentScore: 90,
      intentLabel: 'HOT',
    };
  }

  async listSignals(status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalDto[]> {
    if (status) {
      return this.signals.filter((s) => s.status === status);
    }
    return this.signals;
  }

  async updateSignalStatus(
    signalId: string,
    status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'
  ): Promise<LearningSignalDto> {
    const s = this.signals.find((sig) => sig.id === signalId);
    if (!s) {
      const newSig: LearningSignalDto = {
        id: signalId,
        organizationId: 'org_mock',
        enrollmentId: 'enr_mock',
        contactId: 'cnt_mock',
        reason: 'MOCK_REASON',
        status,
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.signals.push(newSig);
      return newSig;
    }
    s.status = status;
    s.updatedAt = new Date().toISOString();
    return s;
  }
}
