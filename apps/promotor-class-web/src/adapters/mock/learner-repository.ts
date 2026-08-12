import {
  Enrollment,
  Reflection,
  LearningEvent,
  LearningSignal,
  IntegrationEventEnvelope,
} from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';
import { evaluateIntentFromEvents } from '@/modules/signals/rules';

export class MockLearnerRepository {
  async getEnrollments(): Promise<Enrollment[]> {
    return MockStateStore.getState().enrollments;
  }

  async getEnrollmentById(id: string): Promise<Enrollment | undefined> {
    return MockStateStore.getState().enrollments.find(e => e.id === id);
  }

  async getEnrollmentsByContactId(contactId: string): Promise<Enrollment[]> {
    return MockStateStore.getState().enrollments.filter(e => e.contactId === contactId);
  }

  async createEnrollment(contactId: string, programId: string): Promise<Enrollment> {
    const state = MockStateStore.getState();
    const existing = state.enrollments.find(e => e.contactId === contactId && e.programId === programId);
    if (existing) return existing;

    const newEnrollment: Enrollment = {
      id: `enr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizationId: state.organization.id,
      contactId,
      programId,
      status: 'aktif',
      enrolledAt: new Date().toISOString(),
      progressPercent: 0,
      completedLessonIds: [],
      lessonProgress: {},
    };

    // Record canonical learning events: learner.registered & learner.enrolled
    const registeredEvent: LearningEvent = {
      id: `evt_${Date.now()}_reg`,
      organizationId: state.organization.id,
      contactId,
      eventType: 'learner.registered',
      programId,
      enrollmentId: newEnrollment.id,
      payload: {},
      occurredAt: new Date().toISOString(),
    };

    const enrolledEvent: LearningEvent = {
      id: `evt_${Date.now()}_enr`,
      organizationId: state.organization.id,
      contactId,
      eventType: 'learner.enrolled',
      programId,
      enrollmentId: newEnrollment.id,
      payload: {},
      occurredAt: new Date().toISOString(),
    };

    MockStateStore.updateState(curr => ({
      ...curr,
      enrollments: [newEnrollment, ...curr.enrollments],
      learningEvents: [...curr.learningEvents, registeredEvent, enrolledEvent],
      currentLearnerAccess: { contactId },
    }));

    await this.reevaluateSignal(contactId, newEnrollment.id);
    return newEnrollment;
  }

  async completeLesson(enrollmentId: string, lessonId: string, reflectionAnswer: string): Promise<Enrollment> {
    const state = MockStateStore.getState();
    const enr = state.enrollments.find(e => e.id === enrollmentId);
    if (!enr) throw new Error(`Enrollment "${enrollmentId}" tidak ditemukan`);

    // P0 IDEMPOTENCY GUARD: If lesson is already completed, return existing enrollment immediately!
    if (enr.completedLessonIds.includes(lessonId)) {
      return enr;
    }

    const prog = state.programs.find(p => p.id === enr.programId);
    if (!prog) throw new Error(`Program "${enr.programId}" tidak ditemukan`);

    // Find target lesson
    let targetLesson = null;
    let totalLessonsCount = 0;
    for (const mod of prog.modules) {
      totalLessonsCount += mod.lessons.length;
      for (const les of mod.lessons) {
        if (les.id === lessonId) targetLesson = les;
      }
    }

    if (!targetLesson) throw new Error(`Pelajaran "${lessonId}" tidak ditemukan`);

    // Reflection Lock Verification
    if (targetLesson.hasReflection && (!reflectionAnswer || !reflectionAnswer.trim())) {
      throw new Error('Refleksi wajib diisi sebelum menandai pelajaran selesai!');
    }

    const nowIso = new Date().toISOString();
    const newEvents: LearningEvent[] = [];

    // 1. Record reflection in reflections[] collection & reflection.submitted event
    if (targetLesson.hasReflection && reflectionAnswer.trim()) {
      const newReflection: Reflection = {
        id: `refl_${Date.now()}`,
        organizationId: enr.organizationId,
        enrollmentId,
        lessonId,
        contactId: enr.contactId,
        reflectionType: targetLesson.reflectionType || 'long_text',
        answerText: reflectionAnswer.trim(),
        submittedAt: nowIso,
      };

      newEvents.push({
        id: `evt_${Date.now()}_refl`,
        organizationId: enr.organizationId,
        contactId: enr.contactId,
        eventType: 'reflection.submitted',
        programId: enr.programId,
        enrollmentId,
        lessonId,
        payload: { answerText: reflectionAnswer.trim() },
        occurredAt: nowIso,
      });

      MockStateStore.updateState(curr => ({
        ...curr,
        reflections: [newReflection, ...curr.reflections],
      }));
    }

    // 2. Record lesson.completed event
    const lessonCompletedEvent: LearningEvent = {
      id: `evt_${Date.now()}_les`,
      organizationId: enr.organizationId,
      contactId: enr.contactId,
      eventType: 'lesson.completed',
      programId: enr.programId,
      enrollmentId,
      lessonId,
      payload: {},
      occurredAt: nowIso,
    };
    newEvents.push(lessonCompletedEvent);

    // 3. Update Enrollment lesson progress & progressPercent
    const updatedCompletedIds = Array.from(new Set([...enr.completedLessonIds, lessonId]));
    const calcProgress = totalLessonsCount > 0 ? Math.round((updatedCompletedIds.length / totalLessonsCount) * 100) : 100;
    const isProgramCompleted = calcProgress >= 100;

    const existingEvents = state.learningEvents.filter(e => e.enrollmentId === enrollmentId);
    const existingTypes = new Set(existingEvents.map(e => e.eventType));

    // 4. Milestone progress_50 event (idempotent)
    if (calcProgress >= 50 && !existingTypes.has('program.progress_50')) {
      newEvents.push({
        id: `evt_${Date.now()}_prog50`,
        organizationId: enr.organizationId,
        contactId: enr.contactId,
        eventType: 'program.progress_50',
        programId: enr.programId,
        enrollmentId,
        payload: { progressPercent: calcProgress },
        occurredAt: nowIso,
      });
    }

    // 5. Milestone progress_80 event (idempotent)
    if (calcProgress >= 80 && !existingTypes.has('program.progress_80')) {
      newEvents.push({
        id: `evt_${Date.now()}_prog80`,
        organizationId: enr.organizationId,
        contactId: enr.contactId,
        eventType: 'program.progress_80',
        programId: enr.programId,
        enrollmentId,
        payload: { progressPercent: calcProgress },
        occurredAt: nowIso,
      });
    }

    // 6. Program completed event (idempotent)
    if (isProgramCompleted && !existingTypes.has('program.completed')) {
      newEvents.push({
        id: `evt_${Date.now()}_progcomp`,
        organizationId: enr.organizationId,
        contactId: enr.contactId,
        eventType: 'program.completed',
        programId: enr.programId,
        enrollmentId,
        payload: { progressPercent: 100 },
        occurredAt: nowIso,
      });
    }

    // Save updated enrollment & events to store
    MockStateStore.updateState(curr => {
      const enrollments = curr.enrollments.map(e => {
        if (e.id !== enrollmentId) return e;
        return {
          ...e,
          status: isProgramCompleted ? ('selesai' as const) : ('aktif' as const),
          completedAt: isProgramCompleted ? nowIso : e.completedAt,
          progressPercent: calcProgress,
          completedLessonIds: updatedCompletedIds,
          lessonProgress: {
            ...e.lessonProgress,
            [lessonId]: {
              completed: true,
              completedAt: nowIso,
              reflectionAnswer: reflectionAnswer.trim() || undefined,
            },
          },
        };
      });

      return {
        ...curr,
        enrollments,
        learningEvents: [...curr.learningEvents, ...newEvents],
      };
    });

    // Re-evaluate signal from updated event history (scoped to enrollment)
    await this.reevaluateSignal(enr.contactId, enrollmentId);

    const updatedEnr = await this.getEnrollmentById(enrollmentId);
    if (!updatedEnr) throw new Error('Enrollment update failed');
    return updatedEnr;
  }

  async recordCtaClick(enrollmentId: string, lessonId: string, ctaUrl: string): Promise<void> {
    const state = MockStateStore.getState();
    const enr = state.enrollments.find(e => e.id === enrollmentId);
    if (!enr) return;

    // P0 IDEMPOTENCY GUARD: Skip duplicate cta.clicked recording for same lesson & URL
    const existingCtaEvent = state.learningEvents.find(
      e => e.enrollmentId === enrollmentId && e.lessonId === lessonId && e.eventType === 'cta.clicked'
    );

    if (existingCtaEvent) {
      return;
    }

    const ctaClickedEvent: LearningEvent = {
      id: `evt_${Date.now()}_cta`,
      organizationId: enr.organizationId,
      contactId: enr.contactId,
      eventType: 'cta.clicked',
      programId: enr.programId,
      enrollmentId,
      lessonId,
      payload: { ctaUrl },
      occurredAt: new Date().toISOString(),
    };

    MockStateStore.updateState(curr => ({
      ...curr,
      learningEvents: [...curr.learningEvents, ctaClickedEvent],
    }));

    await this.reevaluateSignal(enr.contactId, enrollmentId);
  }

  async reevaluateSignal(contactId: string, enrollmentId: string): Promise<LearningSignal> {
    const state = MockStateStore.getState();

    // P0 SCOPING FIX: Filter events strictly by enrollmentId to avoid cross-enrollment score inflation
    const enrollmentEvents = state.learningEvents.filter(
      e => e.contactId === contactId && e.enrollmentId === enrollmentId
    );

    const latestReflection = state.reflections.find(
      r => r.contactId === contactId && r.enrollmentId === enrollmentId
    );
    const scoreResult = evaluateIntentFromEvents(enrollmentEvents, latestReflection?.answerText);

    const sourceEvent = enrollmentEvents[enrollmentEvents.length - 1];
    const sourceEventId = sourceEvent?.id || `evt_${Date.now()}`;

    const newSignal: LearningSignal = {
      id: `sig_${enrollmentId}_${Date.now()}`,
      organizationId: state.organization.id,
      contactId,
      programId: enrollmentEvents[0]?.programId,
      enrollmentId,
      sourceEventId,
      signalLevel: scoreResult.signalLevel,
      intentScore: scoreResult.intentScore,
      primaryReason: scoreResult.primaryReason,
      rawReflectionQuote: latestReflection?.answerText,
      status: 'ACTIVE',
      evaluatedAt: new Date().toISOString(),
    };

    // P0 OUTBOX IDEMPOTENCY FIX: Check idempotencyKey before enqueuing to integrationOutbox
    const isProgramCompleted = enrollmentEvents.some(e => e.eventType === 'program.completed');
    const ruleId = isProgramCompleted ? 'program_completed' : 'high_intent_milestone';
    const idempotencyKey = `promotorclass:${sourceEventId}:${ruleId}`;

    if (scoreResult.intentScore >= 60 || isProgramCompleted) {
      const existingOutboxItem = state.integrationOutbox.find(item => item.idempotencyKey === idempotencyKey);

      if (!existingOutboxItem) {
        const envelope: IntegrationEventEnvelope = {
          schemaVersion: 1,
          eventId: `env_${Date.now()}`,
          eventType: isProgramCompleted ? 'program.completed' : 'lesson.completed',
          sourceApp: 'PROMOTORCLASS', // Exact uppercase string
          organizationId: state.organization.id,
          contactId,
          occurredAt: new Date().toISOString(),
          subject: {
            programId: enrollmentEvents[0]?.programId,
            enrollmentId,
          },
          payload: {
            intentScore: scoreResult.intentScore,
            signalLevel: scoreResult.signalLevel,
            primaryReason: scoreResult.primaryReason,
          },
        };

        const outboxItem = {
          id: `out_${Date.now()}`,
          idempotencyKey,
          envelope,
          status: 'PENDING' as const,
          attempts: 0,
          createdAt: new Date().toISOString(),
        };

        MockStateStore.updateState(curr => ({
          ...curr,
          learningSignals: [
            newSignal,
            ...curr.learningSignals.filter(s => s.enrollmentId !== enrollmentId),
          ],
          integrationOutbox: [outboxItem, ...curr.integrationOutbox],
        }));
      } else {
        MockStateStore.updateState(curr => ({
          ...curr,
          learningSignals: [
            newSignal,
            ...curr.learningSignals.filter(s => s.enrollmentId !== enrollmentId),
          ],
        }));
      }
    } else {
      MockStateStore.updateState(curr => ({
        ...curr,
        learningSignals: [
          newSignal,
          ...curr.learningSignals.filter(s => s.enrollmentId !== enrollmentId),
        ],
      }));
    }

    return newSignal;
  }
}

export const learnerRepository = new MockLearnerRepository();
