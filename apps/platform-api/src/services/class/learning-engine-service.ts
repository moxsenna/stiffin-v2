import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DomainError } from '../../core/errors';
import { calculateProgramProgress } from '../../domain/learning/progress-engine';
import { calculateIntentScore } from '../../domain/learning/intent-engine';
import { createEnrollmentRepository, EnrollmentRepository } from '../../repositories/enrollment-repository';
import { createProgramRepository, ProgramRepository } from '../../repositories/program-repository';
import { createLessonProgressRepository, LessonProgressRepository } from '../../repositories/lesson-progress-repository';
import { createReflectionResponseRepository, ReflectionResponseRepository } from '../../repositories/reflection-response-repository';
import { createLearningEventRepository, LearningEventRepository } from '../../repositories/learning-event-repository';
import { createLearningSignalRepository, LearningSignalRepository } from '../../repositories/learning-signal-repository';
import { createEntitlementRepository, EntitlementRepository } from '../../repositories/entitlement-repository';
import { createNextActionRepository, NextActionRepository } from '../../repositories/next-action-repository';
import { createActivityRepository, ActivityRepository } from '../../repositories/activity-repository';
import { EnrollmentRow } from '../../db/schema/enrollments';
import { LessonProgressRow } from '../../db/schema/lesson-progress';
import { ReflectionResponseRow } from '../../db/schema/reflection-responses';
import { LearningSignalRow } from '../../db/schema/learning-signals';

export interface CompleteLessonInput {
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
}

export interface SubmitReflectionInput {
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
  responseText?: string | null;
  selectedOptions?: unknown | null;
}

export interface RecordEventInput {
  organizationId: string;
  enrollmentId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}

export interface EnrollmentFullDetails {
  enrollment: EnrollmentRow;
  program: {
    id: string;
    title: string;
    programSlug: string;
    description: string | null;
    modules: Array<{
      id: string;
      title: string;
      orderIndex: number;
      lessons: Array<{
        id: string;
        title: string;
        orderIndex: number;
        videoUrl: string | null;
        videoProvider: string | null;
        reflectionType: string | null;
        reflectionPrompt: string | null;
        reflectionOptions: unknown | null;
        ctaType: string | null;
        ctaLabel: string | null;
        ctaTargetProgramId: string | null;
        ctaConfig: unknown | null;
        isCompleted: boolean;
        completedAt: string | null;
        reflection?: {
          responseText: string | null;
          selectedOptions: unknown | null;
          submittedAt: string;
        } | null;
      }>;
    }>;
  };
}

export interface LearningEngineService {
  completeLesson(input: CompleteLessonInput): Promise<{
    enrollment: EnrollmentRow;
    progress: LessonProgressRow;
    signalsCreated: LearningSignalRow[];
  }>;
  submitReflection(input: SubmitReflectionInput): Promise<{
    enrollment: EnrollmentRow;
    reflection: ReflectionResponseRow;
    signalsCreated: LearningSignalRow[];
  }>;
  recordLearningEvent(input: RecordEventInput): Promise<{
    enrollment: EnrollmentRow;
    signalsCreated: LearningSignalRow[];
  }>;
  getEnrollmentFullDetails(organizationId: string, enrollmentId: string): Promise<EnrollmentFullDetails>;
  listSignals(organizationId: string, status?: string): Promise<LearningSignalRow[]>;
  updateSignalStatus(organizationId: string, signalId: string, status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalRow | null>;
}

export function createLearningEngineService(db: NodePgDatabase): LearningEngineService {
  const enrollmentRepo = createEnrollmentRepository(db);
  const programRepo = createProgramRepository(db);
  const lessonProgressRepo = createLessonProgressRepository(db);
  const reflectionRepo = createReflectionResponseRepository(db);
  const learningEventRepo = createLearningEventRepository(db);
  const learningSignalRepo = createLearningSignalRepository(db);
  const entitlementRepo = createEntitlementRepository(db);
  const nextActionRepo = createNextActionRepository(db);
  const activityRepo = createActivityRepository(db);

  /**
   * Internal helper to recalculate progress, intent score, update enrollment,
   * emit signals and sync to Flow if entitled.
   */
  async function syncEnrollmentState(
    organizationId: string,
    enrollmentId: string,
    triggerContext: { reason: string; eventType: string; payload?: Record<string, unknown> }
  ): Promise<{ enrollment: EnrollmentRow; signalsCreated: LearningSignalRow[] }> {
    const now = new Date();
    const nowIso = now.toISOString();

    const enrollment = await enrollmentRepo.getById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new DomainError('NOT_FOUND', 'Pendaftaran belajar tidak ditemukan');
    }

    const program = await programRepo.findById({ organizationId }, enrollment.programId);
    if (!program) {
      throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
    }

    // 1. Collect all lesson IDs across modules in this program
    const allLessonIds: string[] = [];
    if (program.modules) {
      for (const m of program.modules) {
        if (m.lessons) {
          for (const l of m.lessons) {
            allLessonIds.push(l.id);
          }
        }
      }
    }

    // 2. Fetch all completed lesson IDs for this enrollment
    const progressList = await lessonProgressRepo.listByEnrollment(organizationId, enrollmentId);
    const completedLessonIds = new Set<string>(
      progressList.filter((p) => p.isCompleted).map((p) => p.lessonId)
    );

    // 3. Calculate pure progress
    const progressResult = calculateProgramProgress(allLessonIds, completedLessonIds);

    // 4. Fetch reflections count & CTA clicks for intent scoring
    const reflections = await reflectionRepo.listByEnrollment(organizationId, enrollmentId);
    const events = await learningEventRepo.listByEnrollment(organizationId, enrollmentId);
    const ctaClicksCount = events.filter((e) => e.eventType === 'CTA_CLICKED').length;

    // 5. Calculate pure intent score
    const intentResult = calculateIntentScore({
      progressPercent: progressResult.progressPercent,
      submittedReflectionsCount: reflections.length,
      ctaClicksCount,
      lastActivityAt: nowIso,
      now,
    });

    // 6. Update enrollment
    const newStatus: 'ENROLLED' | 'STARTED' | 'COMPLETED' | 'CANCELLED' = progressResult.isComplete
      ? 'COMPLETED'
      : enrollment.status === 'ENROLLED' && progressResult.progressPercent > 0
      ? 'STARTED'
      : (enrollment.status as 'ENROLLED' | 'STARTED' | 'COMPLETED' | 'CANCELLED');

    const completedAt = progressResult.isComplete
      ? enrollment.completedAt ?? nowIso
      : enrollment.completedAt;

    const startedAt = progressResult.progressPercent > 0
      ? enrollment.startedAt ?? nowIso
      : enrollment.startedAt;

    const updatedEnrollment = await enrollmentRepo.updateProgress(organizationId, enrollmentId, {
      status: newStatus,
      progressPercent: progressResult.progressPercent,
      intentScore: intentResult.score,
      intentLabel: intentResult.label,
      learningStatus: progressResult.learningStatus,
      startedAt,
      completedAt,
      lastActivityAt: nowIso,
    });

    if (!updatedEnrollment) {
      throw new DomainError('INTERNAL_ERROR', 'Gagal memperbarui status belajar');
    }

    // 7. Evaluate Signal Creation Triggers
    const signalsCreated: LearningSignalRow[] = [];
    const existingSignals = await learningSignalRepo.listByContact(organizationId, enrollment.contactId);

    const hasSignalForReason = (r: string) =>
      existingSignals.some((s) => s.enrollmentId === enrollmentId && s.reason === r);

    // Trigger A: Program Completion (100%)
    if (progressResult.isComplete && !hasSignalForReason('PROGRAM_COMPLETED')) {
      const sig = await learningSignalRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        reason: 'PROGRAM_COMPLETED',
        metadata: {
          programId: program.id,
          programTitle: program.title,
          intentScore: intentResult.score,
          intentLabel: intentResult.label,
        },
      });
      signalsCreated.push(sig);
    }

    // Trigger B: High Engagement / Milestone 80%
    if (progressResult.reached80 && !hasSignalForReason('MILESTONE_80_PERCENT')) {
      const sig = await learningSignalRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        reason: 'MILESTONE_80_PERCENT',
        metadata: {
          programId: program.id,
          programTitle: program.title,
          progressPercent: progressResult.progressPercent,
        },
      });
      signalsCreated.push(sig);
    }

    // Trigger C: CTA Clicked
    if (triggerContext.eventType === 'CTA_CLICKED') {
      const sig = await learningSignalRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        reason: 'CTA_CLICKED',
        metadata: {
          programId: program.id,
          programTitle: program.title,
          ...(triggerContext.payload ?? {}),
        },
      });
      signalsCreated.push(sig);
    }

    // 8. Bridge newly created signals to Flow if entitled
    const ent = await entitlementRepo.getForOrg({ organizationId });
    const isFlowEntitled = ent?.promotorFlow === true;
    if (isFlowEntitled && signalsCreated.length > 0) {
      for (const sig of signalsCreated) {
        let actionTitle = `Tindak Lanjut: Aktivitas Belajar ${program.title}`;
        let actionType = 'FOLLOW_UP';

        if (sig.reason === 'PROGRAM_COMPLETED') {
          actionTitle = `Follow-up Lulus Program: ${program.title}`;
        } else if (sig.reason === 'CTA_CLICKED') {
          actionTitle = `Follow-up Minat CTA: ${program.title}`;
        } else if (sig.reason === 'MILESTONE_80_PERCENT') {
          actionTitle = `Follow-up Kemajuan Tinggi (80%): ${program.title}`;
        }

        try {
          await nextActionRepo.create(
            { organizationId },
            {
              contactId: enrollment.contactId,
              actionType,
              title: actionTitle,
              description: `Sinyal otomatis dari PromotorClass (${sig.reason})`,
              dueAt: nowIso,
              priority: intentResult.label === 'HOT' ? 90 : 60,
              source: 'PROMOTORCLASS',
              idempotencyKey: `signal_${sig.id}`,
            }
          );

          await activityRepo.append(
            { organizationId },
            null,
            {
              contactId: enrollment.contactId,
              eventType: 'CLASS_SIGNAL',
              metadataJson: {
                signalId: sig.id,
                reason: sig.reason,
                programId: program.id,
                intentLabel: intentResult.label,
              },
            }
          );
        } catch (err) {
          // Idempotency or transient error handled without rolling back learning progress
          console.warn('[LearningEngineService] Flow signal bridge skipped:', err);
        }
      }
    }

    return { enrollment: updatedEnrollment, signalsCreated };
  }

  return {
    async completeLesson(input) {
      const nowIso = new Date().toISOString();

      // 1. Mark lesson progress completed
      const progress = await lessonProgressRepo.upsertProgress(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        true,
        nowIso
      );

      // 2. Record learning event
      const enrollment = await enrollmentRepo.getById(input.organizationId, input.enrollmentId);
      if (!enrollment) {
        throw new DomainError('NOT_FOUND', 'Pendaftaran belajar tidak ditemukan');
      }

      await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'LESSON_COMPLETED',
        payload: { lessonId: input.lessonId },
        occurredAt: nowIso,
      });

      // 3. Recalculate and sync
      const { enrollment: updatedEnrollment, signalsCreated } = await syncEnrollmentState(
        input.organizationId,
        input.enrollmentId,
        { reason: 'LESSON_COMPLETED', eventType: 'LESSON_COMPLETED', payload: { lessonId: input.lessonId } }
      );

      return {
        enrollment: updatedEnrollment,
        progress,
        signalsCreated,
      };
    },

    async submitReflection(input) {
      const nowIso = new Date().toISOString();

      // 1. Save reflection response
      const reflection = await reflectionRepo.saveResponse({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
        responseText: input.responseText,
        selectedOptions: input.selectedOptions,
      });

      // 2. Also ensure lesson is marked complete upon reflection submission
      await lessonProgressRepo.upsertProgress(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        true,
        nowIso
      );

      // 3. Record learning event
      const enrollment = await enrollmentRepo.getById(input.organizationId, input.enrollmentId);
      if (!enrollment) {
        throw new DomainError('NOT_FOUND', 'Pendaftaran belajar tidak ditemukan');
      }

      await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'REFLECTION_SUBMITTED',
        payload: { lessonId: input.lessonId },
        occurredAt: nowIso,
      });

      // 4. Recalculate and sync
      const { enrollment: updatedEnrollment, signalsCreated } = await syncEnrollmentState(
        input.organizationId,
        input.enrollmentId,
        { reason: 'REFLECTION_SUBMITTED', eventType: 'REFLECTION_SUBMITTED', payload: { lessonId: input.lessonId } }
      );

      return {
        enrollment: updatedEnrollment,
        reflection,
        signalsCreated,
      };
    },

    async recordLearningEvent(input) {
      const nowIso = new Date().toISOString();

      const enrollment = await enrollmentRepo.getById(input.organizationId, input.enrollmentId);
      if (!enrollment) {
        throw new DomainError('NOT_FOUND', 'Pendaftaran belajar tidak ditemukan');
      }

      await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: input.eventType,
        payload: input.payload ?? {},
        occurredAt: nowIso,
      });

      const { enrollment: updatedEnrollment, signalsCreated } = await syncEnrollmentState(
        input.organizationId,
        input.enrollmentId,
        { reason: input.eventType, eventType: input.eventType, payload: input.payload }
      );

      return {
        enrollment: updatedEnrollment,
        signalsCreated,
      };
    },

    async getEnrollmentFullDetails(organizationId, enrollmentId) {
      const enrollment = await enrollmentRepo.getById(organizationId, enrollmentId);
      if (!enrollment) {
        throw new DomainError('NOT_FOUND', 'Pendaftaran belajar tidak ditemukan');
      }

      const program = await programRepo.findById({ organizationId }, enrollment.programId);
      if (!program) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      const progressList = await lessonProgressRepo.listByEnrollment(organizationId, enrollmentId);
      const progressMap = new Map<string, LessonProgressRow>(progressList.map((p) => [p.lessonId, p]));

      const reflectionList = await reflectionRepo.listByEnrollment(organizationId, enrollmentId);
      const reflectionMap = new Map<string, ReflectionResponseRow>(reflectionList.map((r) => [r.lessonId, r]));

      const modulesFormatted = (program.modules ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        orderIndex: m.order,
        lessons: (m.lessons ?? []).map((l) => {
          const prog = progressMap.get(l.id);
          const ref = reflectionMap.get(l.id);

          return {
            id: l.id,
            title: l.title,
            orderIndex: l.order,
            videoUrl: l.videoYoutubeUrl ?? null,
            videoProvider: l.videoProvider ?? null,
            reflectionType: l.reflectionType ?? null,
            reflectionPrompt: l.reflectionPrompt ?? null,
            reflectionOptions: l.reflectionOptions ?? null,
            ctaType: l.ctaType ?? null,
            ctaLabel: l.ctaLabel ?? null,
            ctaTargetProgramId: l.ctaTargetProgramId ?? null,
            ctaConfig: l.ctaConfig ?? null,
            isCompleted: prog?.isCompleted ?? false,
            completedAt: prog?.completedAt ? prog.completedAt.toISOString() : null,
            reflection: ref
              ? {
                  responseText: ref.responseText,
                  selectedOptions: ref.selectedOptions,
                  submittedAt: ref.submittedAt.toISOString(),
                }
              : null,
          };
        }),
      }));

      return {
        enrollment,
        program: {
          id: program.id,
          title: program.title,
          programSlug: program.programSlug,
          description: program.description ?? null,
          modules: modulesFormatted,
        },
      };
    },

    async listSignals(organizationId, status) {
      return await learningSignalRepo.listByOrg(organizationId, status);
    },

    async updateSignalStatus(organizationId, signalId, status) {
      return await learningSignalRepo.updateStatus(organizationId, signalId, status);
    },
  };
}
