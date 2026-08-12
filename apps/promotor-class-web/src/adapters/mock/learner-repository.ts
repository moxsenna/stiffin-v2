import { Enrollment, LearningSignal, LearningEvent, IntegrationEventEnvelope } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';
import { evaluateSignalRules } from '../../modules/signals/rules';
import { programRepository } from './program-repository';

export class MockLearnerRepository {
  async getEnrollments(): Promise<Enrollment[]> {
    return MockStateStore.getState().enrollments;
  }

  async getEnrollmentById(id: string): Promise<Enrollment | undefined> {
    return MockStateStore.getState().enrollments.find(e => e.id === id);
  }

  async getEnrollmentByContactAndProgram(contactId: string, programId: string): Promise<Enrollment | undefined> {
    return MockStateStore.getState().enrollments.find(
      e => e.contactId === contactId && e.programId === programId
    );
  }

  async createEnrollment(contactId: string, programId: string): Promise<Enrollment> {
    const existing = await this.getEnrollmentByContactAndProgram(contactId, programId);
    if (existing) return existing;

    const newId = `enr_${Date.now()}`;
    const now = new Date().toISOString();
    const newEnrollment: Enrollment = {
      id: newId,
      contactId,
      programId,
      status: 'aktif',
      progressPercent: 0,
      startedAt: now,
      lastActiveAt: now,
      lessonProgress: {},
    };

    MockStateStore.updateState(state => ({
      ...state,
      enrollments: [newEnrollment, ...state.enrollments],
    }));

    return newEnrollment;
  }

  async completeLesson(
    enrollmentId: string,
    lessonId: string,
    reflectionAnswer?: string
  ): Promise<Enrollment> {
    const enrollment = await this.getEnrollmentById(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');

    const program = await programRepository.getProgramById(enrollment.programId);
    if (!program) throw new Error('Program not found');

    // Find the lesson in program curriculum
    let targetLesson = null;
    let totalLessonsCount = 0;
    for (const mod of program.modules) {
      totalLessonsCount += mod.lessons.length;
      for (const les of mod.lessons) {
        if (les.id === lessonId) {
          targetLesson = les;
        }
      }
    }

    if (!targetLesson) throw new Error('Lesson not found in program');

    // Guardrail: Mandatory reflection locking completion
    if (targetLesson.hasReflection && (!reflectionAnswer || !reflectionAnswer.trim())) {
      throw new Error('Refleksi wajib diisi sebelum menyelesaikan pelajaran!');
    }

    const now = new Date().toISOString();
    const isAlreadyCompleted = enrollment.lessonProgress[lessonId]?.completed;

    const updatedProgress = {
      ...enrollment.lessonProgress,
      [lessonId]: {
        lessonId,
        completed: true,
        completedAt: now,
        reflectionAnswer: reflectionAnswer?.trim(),
      },
    };

    const completedCount = Object.values(updatedProgress).filter(p => p.completed).length;
    const progressPercent = Math.min(100, Math.round((completedCount / (totalLessonsCount || 1)) * 100));
    const isProgramCompleted = progressPercent >= 100;

    const updatedEnrollment: Enrollment = {
      ...enrollment,
      progressPercent,
      status: isProgramCompleted ? 'selesai' : 'aktif',
      completedAt: isProgramCompleted ? (enrollment.completedAt || now) : undefined,
      lastActiveAt: now,
      lessonProgress: updatedProgress,
    };

    // Evaluate Learning Signal
    const signalResult = evaluateSignalRules(
      progressPercent,
      isProgramCompleted,
      !!targetLesson.hasCta,
      reflectionAnswer
    );

    const existingSignal = MockStateStore.getState().learningSignals.find(s => s.enrollmentId === enrollmentId);
    const updatedSignal: LearningSignal = {
      id: existingSignal ? existingSignal.id : `sig_${Date.now()}`,
      contactId: enrollment.contactId,
      enrollmentId,
      programId: enrollment.programId,
      minatStatus: signalResult.minatStatus,
      primaryReason: signalResult.primaryReason,
      rawQuoteSnippet: reflectionAnswer ? reflectionAnswer.substring(0, 80) : undefined,
      intentScoreNumeric: signalResult.intentScoreNumeric,
      createdAt: now,
    };

    // Generate Learning Event if not previously completed
    let newEvents: IntegrationEventEnvelope[] = [];
    if (!isAlreadyCompleted) {
      const learningEvent: LearningEvent = {
        id: `evt_${Date.now()}`,
        eventType: isProgramCompleted ? 'PROGRAM_COMPLETED' : 'LESSON_COMPLETED',
        contactId: enrollment.contactId,
        enrollmentId,
        programId: enrollment.programId,
        payload: { lessonId, progressPercent, reflectionAnswer },
        timestamp: now,
      };

      const envelope: IntegrationEventEnvelope = {
        id: `env_${Date.now()}`,
        eventId: learningEvent.id,
        sourceApp: 'promotor-class',
        targetApp: 'promotor-flow',
        payload: learningEvent,
        status: 'queued',
        attempts: 0,
        createdAt: now,
      };
      newEvents = [envelope];
    }

    MockStateStore.updateState(state => {
      const signalsFiltered = state.learningSignals.filter(s => s.enrollmentId !== enrollmentId);
      return {
        ...state,
        enrollments: state.enrollments.map(e => (e.id === enrollmentId ? updatedEnrollment : e)),
        learningSignals: [updatedSignal, ...signalsFiltered],
        integrationOutbox: [...newEvents, ...state.integrationOutbox],
      };
    });

    return updatedEnrollment;
  }
}

export const learnerRepository = new MockLearnerRepository();
