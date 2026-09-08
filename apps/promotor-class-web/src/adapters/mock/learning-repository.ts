import {
  LearnerEnrollmentDetailsDto,
  CompleteLessonResponse,
  SubmitReflectionResponse,
  RecordLearningEventResponse,
  LearningSignalDto,
  LearningEventType,
} from '@promotor/contracts';
import { LearningRepositoryPort } from '@/modules/learning/ports';
import { MockStateStore } from './mock-state-store';

export class MockLearningRepository implements LearningRepositoryPort {
  private signals: LearningSignalDto[] = [];

  async getEnrollmentDetails(enrollmentId: string): Promise<LearnerEnrollmentDetailsDto> {
    const state = MockStateStore.getState();
    const enr = state.enrollments.find((e) => e.id === enrollmentId);
    const prog = state.programs.find((p) => p.id === (enr?.programId || 'prog_7_hari_belajar')) || state.programs[0];

    return {
      enrollment: {
        id: enr?.id || enrollmentId,
        organizationId: enr?.organizationId || state.organization.id,
        programId: enr?.programId || prog?.id || 'prog_7_hari_belajar',
        contactId: enr?.contactId || 'contact_ayu',
        status: (enr?.status as any) || 'aktif',
        enrolledAt: enr?.enrolledAt || new Date().toISOString(),
        progressPercent: enr?.progressPercent ?? 33,
        intentScore: 65,
        intentLabel: 'HOT',
        learningStatus: 'IN_PROGRESS',
        createdAt: enr?.enrolledAt || new Date().toISOString(),
        updatedAt: enr?.enrolledAt || new Date().toISOString(),
      },
      program: {
        id: prog?.id || 'prog_7_hari_belajar',
        title: prog?.title || '7 Hari Mengenal Cara Belajar Anak',
        programSlug: prog?.programSlug || '7-hari-mengenal-stifin',
        description: prog?.description || '',
        modules: (prog?.modules || []).map((m: any, mIdx: number) => ({
          id: m.id,
          title: m.title,
          orderIndex: m.orderIndex ?? m.order ?? mIdx,
          lessons: (m.lessons || []).map((l: any, lIdx: number) => ({
            id: l.id,
            title: l.title,
            orderIndex: l.orderIndex ?? l.order ?? lIdx,
            videoUrl: l.videoYoutubeUrl || l.videoUrl || null,
            videoProvider: 'youtube',
            reflectionType: l.reflectionType || (l.hasReflection ? 'long_text' : null),
            reflectionPrompt: l.reflectionPrompt || null,
            reflectionOptions: null,
            ctaType: l.ctaType || null,
            ctaLabel: l.ctaLabel || null,
            ctaTargetProgramId: null,
            ctaConfig: null,
            isCompleted: enr?.completedLessonIds?.includes(l.id) ?? false,
            lastPositionSeconds: 0,
            completedAt: enr?.lessonProgress?.[l.id]?.completedAt || null,
            reflection: enr?.lessonProgress?.[l.id]?.reflectionAnswer
              ? {
                  responseText: enr.lessonProgress[l.id].reflectionAnswer,
                  selectedOptions: null,
                  submittedAt: enr.lessonProgress[l.id].completedAt || new Date().toISOString(),
                }
              : null,
          })),
        })),
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

  async updateLessonPosition(
    _enrollmentId: string,
    _lessonId: string,
    _positionSeconds: number
  ): Promise<{ ok: boolean }> {
    return { ok: true };
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
