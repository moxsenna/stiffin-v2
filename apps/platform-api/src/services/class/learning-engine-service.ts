import { eq, and, sql, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DomainError } from '../../core/errors';
import { calculateProgramProgress } from '../../domain/learning/progress-engine';
import { calculateIntentScore } from '../../domain/learning/intent-engine';
import { calculateLearningStatus, CanonicalLearningStatus } from '../../domain/learning/learning-status-engine';
import { validateReflectionSubmission } from '../../domain/learning/reflection-validator';
import { createEnrollmentRepository, EnrollmentRepository } from '../../repositories/enrollment-repository';
import { createProgramRepository, ProgramRepository } from '../../repositories/program-repository';
import { createLessonProgressRepository, LessonProgressRepository } from '../../repositories/lesson-progress-repository';
import { createReflectionResponseRepository, ReflectionResponseRepository } from '../../repositories/reflection-response-repository';
import { createLearningEventRepository, LearningEventRepository } from '../../repositories/learning-event-repository';
import { createLearningSignalRepository, LearningSignalRepository } from '../../repositories/learning-signal-repository';
import { createEntitlementRepository, EntitlementRepository } from '../../repositories/entitlement-repository';
import { createIntegrationOutboxService, IntegrationOutboxService } from '../integration/integration-outbox-service';
import { createLocalPromotorFlowAdapter } from '../../adapters/local-promotor-flow-adapter';
import { EnrollmentRow } from '../../db/schema/enrollments';
import { LessonProgressRow } from '../../db/schema/lesson-progress';
import { ReflectionResponseRow } from '../../db/schema/reflection-responses';
import { LearningSignalRow } from '../../db/schema/learning-signals';
import { contacts } from '../../db/schema/contacts';
import { programs } from '../../db/schema/programs';
import { enrollments } from '../../db/schema/enrollments';
import { lessonProgress } from '../../db/schema/lesson-progress';
import { learningEvents } from '../../db/schema/learning-events';

export interface CompleteLessonInput {
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
  authenticatedContactId?: string;
}

export interface StartLessonInput {
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
  authenticatedContactId?: string;
}

export interface SubmitReflectionInput {
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
  responseText?: string | null;
  selectedOptions?: string[] | null;
  authenticatedContactId?: string;
}

export interface RecordCtaClickInput {
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
  ctaLabel?: string | null;
  authenticatedContactId?: string;
}

export interface RecordEventInput {
  organizationId: string;
  enrollmentId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  authenticatedContactId?: string;
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
        isRequired: boolean;
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

export interface LearnerSummaryItem {
  contactId: string;
  enrollmentId: string;
  name: string;
  phone: string;
  programId: string;
  programTitle: string;
  progressPercent: number;
  intentScore: number;
  intentLabel: 'COLD' | 'WARM' | 'HOT';
  learningStatus: CanonicalLearningStatus;
  lastActivityAt: string | null;
  enrolledAt: string;
}

export interface ProgramAnalyticsResult {
  programId: string;
  programTitle: string;
  enrolledCount: number;
  startedCount: number;
  reached50Count: number;
  reached80Count: number;
  completedCount: number;
  ctaClickedCount: number;
  avgProgressPercent: number;
}

export interface LearningEngineService {
  startLesson(input: StartLessonInput): Promise<{
    enrollment: EnrollmentRow;
  }>;
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
  recordCtaClick(input: RecordCtaClickInput): Promise<{
    enrollment: EnrollmentRow;
    signalsCreated: LearningSignalRow[];
  }>;
  recordLearningEvent(input: RecordEventInput): Promise<{
    enrollment: EnrollmentRow;
    signalsCreated: LearningSignalRow[];
  }>;
  getEnrollmentFullDetails(organizationId: string, enrollmentId: string, authenticatedContactId?: string): Promise<EnrollmentFullDetails>;
  listLearners(organizationId: string, options?: { programId?: string; search?: string; limit?: number; offset?: number }): Promise<{ learners: LearnerSummaryItem[]; total: number }>;
  getLearnerDetail(organizationId: string, contactId: string): Promise<Record<string, unknown>>;
  getProgramAnalytics(organizationId: string, programId: string): Promise<ProgramAnalyticsResult>;
  listSignals(organizationId: string, status?: string): Promise<LearningSignalRow[]>;
  updateSignalStatus(organizationId: string, signalId: string, status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalRow | null>;
}

export function createLearningEngineService(
  db: NodePgDatabase,
  dependencies: {
    enrollmentRepo?: EnrollmentRepository;
    programRepo?: ProgramRepository;
    lessonProgressRepo?: LessonProgressRepository;
    reflectionRepo?: ReflectionResponseRepository;
    learningEventRepo?: LearningEventRepository;
    learningSignalRepo?: LearningSignalRepository;
    entitlementRepo?: EntitlementRepository;
    outboxService?: IntegrationOutboxService;
    clock?: () => Date;
  } = {}
): LearningEngineService {
  const enrollmentRepo = dependencies.enrollmentRepo ?? createEnrollmentRepository(db);
  const programRepo = dependencies.programRepo ?? createProgramRepository(db);
  const lessonProgressRepo = dependencies.lessonProgressRepo ?? createLessonProgressRepository(db);
  const reflectionRepo = dependencies.reflectionRepo ?? createReflectionResponseRepository(db);
  const learningEventRepo = dependencies.learningEventRepo ?? createLearningEventRepository(db);
  const learningSignalRepo = dependencies.learningSignalRepo ?? createLearningSignalRepository(db);
  const entitlementRepo = dependencies.entitlementRepo ?? createEntitlementRepository(db);
  const flowAdapter = createLocalPromotorFlowAdapter(db);
  const outboxService = dependencies.outboxService ?? createIntegrationOutboxService(db, { flowAdapter });
  const getNow = dependencies.clock ?? (() => new Date());

  /**
   * Helper: Validates relational graph integrity (§10).
   */
  async function validateEnrollmentAndLesson(
    organizationId: string,
    enrollmentId: string,
    lessonId?: string,
    authenticatedContactId?: string
  ) {
    const enrollment = await enrollmentRepo.getById(organizationId, enrollmentId);
    if (!enrollment) {
      throw new DomainError('NOT_FOUND', 'Pendaftaran belajar tidak ditemukan');
    }

    if (authenticatedContactId && enrollment.contactId !== authenticatedContactId) {
      throw new DomainError('FORBIDDEN', 'Akses ke pendaftaran belajar ditolak');
    }

    const program = await programRepo.findById({ organizationId }, enrollment.programId);
    if (!program) {
      throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
    }

    let targetLesson: any = null;
    const allLessons: Array<{ lessonId: string; isRequired: boolean }> = [];

    if (program.modules) {
      for (const m of program.modules) {
        if (m.lessons) {
          for (const l of m.lessons) {
            allLessons.push({ lessonId: l.id, isRequired: (l as any).isRequired !== false });
            if (lessonId && l.id === lessonId) {
              targetLesson = l;
            }
          }
        }
      }
    }

    if (lessonId && !targetLesson) {
      throw new DomainError('NOT_FOUND', 'Materi tidak ditemukan dalam program ini');
    }

    return { enrollment, program, allLessons, targetLesson };
  }

  /**
   * Internal helper: Recalculates progress, intent score, learning status,
   * evaluates signals and enqueues to durable integration outbox.
   */
  async function syncEnrollmentState(
    organizationId: string,
    enrollmentId: string,
    trigger: {
      eventType: string;
      sourceEventId?: string;
      hasClickedCta?: boolean;
      payload?: Record<string, unknown>;
    }
  ): Promise<{ enrollment: EnrollmentRow; signalsCreated: LearningSignalRow[] }> {
    const now = getNow();
    const nowIso = now.toISOString();

    const { enrollment, program, allLessons } = await validateEnrollmentAndLesson(
      organizationId,
      enrollmentId
    );

    // 1. Fetch completed lessons
    const progressList = await lessonProgressRepo.listByEnrollment(organizationId, enrollmentId);
    const completedLessonIds = new Set<string>(
      progressList.filter((p) => p.isCompleted).map((p) => p.lessonId)
    );

    // 2. Pure Progress Calculation (Required Lessons Only, §8, §9)
    const progressResult = calculateProgramProgress(allLessons, completedLessonIds);

    // 3. Fetch existing learning events
    const events = await learningEventRepo.listByEnrollment(organizationId, enrollmentId);
    const hasCtaClick =
      trigger.hasClickedCta === true ||
      events.some((e) => e.eventType === 'cta.clicked' || e.eventType === 'CTA_CLICKED');

    let prog50Event = events.find((e) => e.eventType === 'program.progress_50');
    let prog80Event = events.find((e) => e.eventType === 'program.progress_80');
    let progCompEvent = events.find((e) => e.eventType === 'program.completed');

    // Milestone 50% event (idempotent, exactly-once)
    if (progressResult.reached50 && !prog50Event) {
      prog50Event = await learningEventRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'program.progress_50',
        payload: { progressPercent: progressResult.progressPercent },
        occurredAt: nowIso,
      });
    }

    // Milestone 80% event (idempotent, exactly-once)
    if (progressResult.reached80 && !prog80Event) {
      prog80Event = await learningEventRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'program.progress_80',
        payload: { progressPercent: progressResult.progressPercent },
        occurredAt: nowIso,
      });
    }

    // Program completed event (idempotent, exactly-once)
    if (progressResult.isComplete && !progCompEvent) {
      progCompEvent = await learningEventRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'program.completed',
        payload: { progressPercent: 100 },
        occurredAt: nowIso,
      });
    }

    // 4. Pure Canonical Intent Score (§18)
    const intentResult = calculateIntentScore({
      isEnrolled: true,
      hasStarted: progressResult.completedLessonsCount > 0 || enrollment.status === 'STARTED',
      progressPercent: progressResult.progressPercent,
      hasClickedCta: hasCtaClick,
    });

    // 5. Pure Learning Status & Lifecycle (§19)
    const newLifecycleStatus = progressResult.isComplete
      ? 'COMPLETED'
      : enrollment.status === 'ENROLLED' && progressResult.completedLessonsCount > 0
      ? 'STARTED'
      : (enrollment.status as 'ENROLLED' | 'STARTED' | 'COMPLETED' | 'CANCELLED');

    const canonicalLearningStatus = calculateLearningStatus({
      progressPercent: progressResult.progressPercent,
      lifecycleStatus: newLifecycleStatus,
      lastActivityAt: nowIso,
      enrolledAt: enrollment.enrolledAt,
      now,
    });

    const completedAt = progressResult.isComplete
      ? enrollment.completedAt ?? nowIso
      : enrollment.completedAt;

    const startedAt = progressResult.completedLessonsCount > 0
      ? enrollment.startedAt ?? nowIso
      : enrollment.startedAt;

    // 6. Update enrollment
    const updatedEnrollment = await enrollmentRepo.updateProgress(organizationId, enrollmentId, {
      status: newLifecycleStatus,
      progressPercent: progressResult.progressPercent,
      intentScore: intentResult.score,
      intentLabel: intentResult.label,
      learningStatus: canonicalLearningStatus,
      startedAt,
      completedAt,
      lastActivityAt: nowIso,
    });

    if (!updatedEnrollment) {
      throw new DomainError('INTERNAL_ERROR', 'Gagal memperbarui data pendaftaran');
    }

    // 7. Evaluate Signal Creation Triggers (§20, §21)
    const signalsCreated: LearningSignalRow[] = [];
    const existingSignals = await learningSignalRepo.listByContact(organizationId, enrollment.contactId);

    const hasSignalForReason = (r: string) =>
      existingSignals.some((s) => s.enrollmentId === enrollmentId && s.reason === r);

    // Trigger A: Program Completion (Canonical source_event_id -> program.completed event)
    if (progressResult.isComplete && !hasSignalForReason('PROGRAM_COMPLETED')) {
      const sig = await learningSignalRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        programId: program.id,
        sourceEventId: progCompEvent?.id ?? null,
        type: 'PROGRAM_COMPLETED',
        priority: 90,
        reason: 'PROGRAM_COMPLETED',
        recommendedActionType: 'FOLLOW_UP',
        recommendedActionReason: 'Peserta telah menyelesaikan seluruh materi program.',
        status: 'ACTIVE',
        metadata: {
          programId: program.id,
          programTitle: program.title,
          intentScore: intentResult.score,
          intentLabel: intentResult.label,
        },
      });
      signalsCreated.push(sig);
    }

    // Trigger B: High Engagement (80% Milestone - Canonical source_event_id -> program.progress_80 event)
    if (progressResult.reached80 && !hasSignalForReason('MILESTONE_80_PERCENT')) {
      const sig = await learningSignalRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        programId: program.id,
        sourceEventId: prog80Event?.id ?? null,
        type: 'HIGH_LEARNING_INTENT',
        priority: 80,
        reason: 'MILESTONE_80_PERCENT',
        recommendedActionType: 'FOLLOW_UP',
        recommendedActionReason: 'Kemajuan belajar mencapai 80%. Potensi konversi/tindak lanjut tinggi.',
        status: 'ACTIVE',
        metadata: {
          programId: program.id,
          programTitle: program.title,
          progressPercent: progressResult.progressPercent,
        },
      });
      signalsCreated.push(sig);
    }

    // Trigger C: CTA Clicked (Canonical source_event_id -> cta.clicked event)
    if (trigger.eventType === 'cta.clicked' && !hasSignalForReason('CTA_CLICKED')) {
      const sig = await learningSignalRepo.create({
        organizationId,
        enrollmentId,
        contactId: enrollment.contactId,
        programId: program.id,
        sourceEventId: trigger.sourceEventId ?? null,
        type: 'HIGH_INTENT_CTA',
        priority: 95,
        reason: 'CTA_CLICKED',
        recommendedActionType: 'FOLLOW_UP',
        recommendedActionReason: 'Peserta mengklik Call-to-Action pada materi edukasi.',
        status: 'ACTIVE',
        metadata: {
          programId: program.id,
          programTitle: program.title,
          ...(trigger.payload ?? {}),
        },
      });
      signalsCreated.push(sig);
    }

    // 8. Bridge to Flow via Durable Integration Outbox (§22, §23, §24, §25)
    const ent = await entitlementRepo.getForOrg({ organizationId });
    const isFlowEntitled = ent?.promotorFlow === true;

    if (isFlowEntitled && signalsCreated.length > 0) {
      for (const sig of signalsCreated) {
        let actionTitle = `Tindak Lanjut: Aktivitas Belajar ${program.title}`;
        let ruleId = sig.reason.toLowerCase();
        if (sig.reason === 'PROGRAM_COMPLETED') {
          actionTitle = `Follow-up Lulus Program: ${program.title}`;
          ruleId = 'completed';
        } else if (sig.reason === 'CTA_CLICKED') {
          actionTitle = `Follow-up Minat CTA: ${program.title}`;
          ruleId = 'cta_clicked';
        } else if (sig.reason === 'MILESTONE_80_PERCENT') {
          actionTitle = `Follow-up Kemajuan Tinggi (80%): ${program.title}`;
          ruleId = 'progress_80';
        }

        const canonicalSourceEventId = sig.sourceEventId ?? sig.id;
        const idempotencyKey = `promotorclass:${canonicalSourceEventId}:${ruleId}`;

        // Enqueue NextAction in outbox
        await outboxService.enqueue({
          organizationId,
          destination: 'PROMOTORFLOW',
          operation: 'CREATE_NEXT_ACTION',
          idempotencyKey,
          payloadJson: {
            organizationId,
            contactId: enrollment.contactId,
            source: 'PROMOTORCLASS',
            sourceEventId: canonicalSourceEventId,
            sourceSignalId: sig.id,
            actionType: 'FOLLOW_UP',
            title: actionTitle,
            reason: sig.recommendedActionReason ?? `Sinyal otomatis dari PromotorClass (${sig.reason})`,
            dueAt: nowIso,
            context: {
              programId: program.id,
              programTitle: program.title,
              enrollmentId,
              signalType: sig.type,
              intentLabel: intentResult.label.toLowerCase() as 'cold' | 'warm' | 'hot',
            },
            idempotencyKey,
          },
        });

        // Enqueue Activity Projection in outbox (Privacy Isolation: No raw reflection text, §21)
        await outboxService.enqueue({
          organizationId,
          destination: 'PROMOTORFLOW',
          operation: 'APPEND_ACTIVITY',
          idempotencyKey: `act_${idempotencyKey}`,
          payloadJson: {
            organizationId,
            contactId: enrollment.contactId,
            source: 'PROMOTORCLASS',
            sourceEventId: canonicalSourceEventId,
            eventType: 'LEARNING_SIGNAL',
            summary: actionTitle,
            context: {
              signalId: sig.id,
              reason: sig.reason,
              programId: program.id,
              intentLabel: intentResult.label,
            },
            idempotencyKey: `act_${idempotencyKey}`,
          },
        });
      }

      // Immediate outbox dispatch (§21, §22)
      try {
        await outboxService.processPending({ limit: 10, now });
      } catch (err) {
        console.warn('[LearningEngineService] Immediate outbox dispatch deferred to retry queue:', err);
      }
    }

    return { enrollment: updatedEnrollment, signalsCreated };
  }

  return {
    async startLesson(input) {
      const { enrollment } = await validateEnrollmentAndLesson(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        input.authenticatedContactId
      );

      const nowIso = getNow().toISOString();

      if (enrollment.status === 'ENROLLED') {
        await enrollmentRepo.updateProgress(input.organizationId, input.enrollmentId, {
          status: 'STARTED',
          startedAt: nowIso,
          lastActivityAt: nowIso,
        });
      } else {
        await enrollmentRepo.updateProgress(input.organizationId, input.enrollmentId, {
          lastActivityAt: nowIso,
        });
      }

      await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'lesson.started',
        payload: { lessonId: input.lessonId },
        occurredAt: nowIso,
      });

      const updated = (await enrollmentRepo.getById(input.organizationId, input.enrollmentId))!;
      return { enrollment: updated };
    },

    async completeLesson(input) {
      const now = getNow();
      const nowIso = now.toISOString();

      const { enrollment, targetLesson } = await validateEnrollmentAndLesson(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        input.authenticatedContactId
      );

      // Check required reflection constraint (§17)
      if (targetLesson?.reflectionType) {
        const existingReflection = await reflectionRepo.findByLesson(
          input.organizationId,
          input.enrollmentId,
          input.lessonId
        );
        if (!existingReflection) {
          throw new DomainError(
            'VALIDATION_ERROR',
            'Refleksi wajib diisi sebelum menyelesaikan materi ini'
          );
        }
      }

      // 1. Mark lesson progress completed atomically (§11, §13, §35)
      const { progress, isNewlyCompleted } = await lessonProgressRepo.atomicComplete(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        nowIso
      );

      if (!isNewlyCompleted) {
        const { enrollment: syncedEnrollment } = await syncEnrollmentState(
          input.organizationId,
          input.enrollmentId,
          {
            eventType: 'lesson.completed',
            payload: { lessonId: input.lessonId },
          }
        );
        return {
          enrollment: syncedEnrollment,
          progress,
          signalsCreated: [],
        };
      }

      // 2. Emit lesson.completed event (exactly once)
      const event = await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'lesson.completed',
        payload: { lessonId: input.lessonId },
        occurredAt: nowIso,
      });

      // 3. Recalculate progress, milestones & signals
      const { enrollment: updatedEnrollment, signalsCreated } = await syncEnrollmentState(
        input.organizationId,
        input.enrollmentId,
        {
          eventType: 'lesson.completed',
          sourceEventId: event.id,
          payload: { lessonId: input.lessonId },
        }
      );

      return {
        enrollment: updatedEnrollment,
        progress,
        signalsCreated,
      };
    },

    async submitReflection(input) {
      const nowIso = getNow().toISOString();

      const { enrollment, targetLesson } = await validateEnrollmentAndLesson(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        input.authenticatedContactId
      );

      // Validate submission against lesson configuration (§17)
      if (targetLesson?.reflectionType) {
        const validation = validateReflectionSubmission(
          {
            reflectionType: targetLesson.reflectionType,
            reflectionPrompt: targetLesson.reflectionPrompt,
            reflectionOptions: targetLesson.reflectionOptions,
          },
          {
            responseText: input.responseText,
            selectedOptions: input.selectedOptions,
          }
        );

        if (!validation.isValid) {
          throw new DomainError('VALIDATION_ERROR', validation.error || 'Data refleksi tidak valid');
        }
      }

      // Save reflection response
      const reflection = await reflectionRepo.upsert({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
        responseText: input.responseText ?? null,
        selectedOptions: input.selectedOptions ?? null,
      });

      // Mark lesson progress completed atomically (§17)
      const { isNewlyCompleted } = await lessonProgressRepo.atomicComplete(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        nowIso
      );

      // If newly completed, emit canonical lesson.completed event
      if (isNewlyCompleted) {
        await learningEventRepo.create({
          organizationId: input.organizationId,
          enrollmentId: input.enrollmentId,
          contactId: enrollment.contactId,
          eventType: 'lesson.completed',
          payload: { lessonId: input.lessonId },
          occurredAt: nowIso,
        });
      }

      // Emit reflection.submitted event
      const event = await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'reflection.submitted',
        payload: { lessonId: input.lessonId },
        occurredAt: nowIso,
      });

      // Recalculate enrollment state
      const { enrollment: updatedEnrollment, signalsCreated } = await syncEnrollmentState(
        input.organizationId,
        input.enrollmentId,
        {
          eventType: 'reflection.submitted',
          sourceEventId: event.id,
          payload: { lessonId: input.lessonId },
        }
      );

      return {
        enrollment: updatedEnrollment,
        reflection,
        signalsCreated,
      };
    },

    async recordCtaClick(input) {
      const nowIso = getNow().toISOString();

      const { enrollment, targetLesson } = await validateEnrollmentAndLesson(
        input.organizationId,
        input.enrollmentId,
        input.lessonId,
        input.authenticatedContactId
      );

      const event = await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: 'cta.clicked',
        payload: {
          lessonId: input.lessonId,
          ctaLabel: input.ctaLabel ?? targetLesson?.ctaLabel ?? 'CTA Button',
        },
        occurredAt: nowIso,
      });

      const { enrollment: updatedEnrollment, signalsCreated } = await syncEnrollmentState(
        input.organizationId,
        input.enrollmentId,
        {
          eventType: 'cta.clicked',
          sourceEventId: event.id,
          hasClickedCta: true,
          payload: {
            lessonId: input.lessonId,
            ctaLabel: input.ctaLabel ?? targetLesson?.ctaLabel,
          },
        }
      );

      return {
        enrollment: updatedEnrollment,
        signalsCreated,
      };
    },

    async recordLearningEvent(input) {
      const nowIso = getNow().toISOString();

      const { enrollment } = await validateEnrollmentAndLesson(
        input.organizationId,
        input.enrollmentId,
        undefined,
        input.authenticatedContactId
      );

      const event = await learningEventRepo.create({
        organizationId: input.organizationId,
        enrollmentId: input.enrollmentId,
        contactId: enrollment.contactId,
        eventType: input.eventType,
        payload: input.payload ?? {},
        occurredAt: nowIso,
      });

      const hasCta = input.eventType === 'cta.clicked';

      const { enrollment: updatedEnrollment, signalsCreated } = await syncEnrollmentState(
        input.organizationId,
        input.enrollmentId,
        {
          eventType: input.eventType,
          sourceEventId: event.id,
          hasClickedCta: hasCta,
          payload: input.payload,
        }
      );

      return {
        enrollment: updatedEnrollment,
        signalsCreated,
      };
    },

    async getEnrollmentFullDetails(organizationId, enrollmentId, authenticatedContactId) {
      const { enrollment, program } = await validateEnrollmentAndLesson(
        organizationId,
        enrollmentId,
        undefined,
        authenticatedContactId
      );

      const progressList = await lessonProgressRepo.listByEnrollment(organizationId, enrollmentId);
      const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));

      const reflections = await reflectionRepo.listByEnrollment(organizationId, enrollmentId);
      const reflectionMap = new Map(reflections.map((r) => [r.lessonId, r]));

      const modules = (program.modules || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        orderIndex: m.order,
        lessons: (m.lessons || []).map((l: any) => {
          const prog = progressMap.get(l.id);
          const ref = reflectionMap.get(l.id);
          return {
            id: l.id,
            title: l.title,
            orderIndex: l.order,
            isRequired: l.isRequired !== false,
            videoUrl: l.videoUrl ?? null,
            videoProvider: l.videoProvider ?? null,
            reflectionType: l.reflectionType ?? null,
            reflectionPrompt: l.reflectionPrompt ?? null,
            reflectionOptions: l.reflectionOptions ?? null,
            ctaType: l.ctaType ?? null,
            ctaLabel: l.ctaLabel ?? null,
            ctaTargetProgramId: l.ctaTargetProgramId ?? null,
            ctaConfig: l.ctaConfig ?? null,
            isCompleted: prog?.isCompleted ?? false,
            completedAt: prog?.completedAt ? new Date(prog.completedAt).toISOString() : null,
            reflection: ref
              ? {
                  responseText: ref.responseText ?? null,
                  selectedOptions: ref.selectedOptions ?? null,
                  submittedAt: new Date(ref.submittedAt).toISOString(),
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
          modules,
        },
      };
    },

    async listLearners(organizationId, options = {}) {
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;

      const rows = await db
        .select({
          contactId: contacts.id,
          enrollmentId: enrollments.id,
          name: contacts.name,
          phone: contacts.phoneE164,
          programId: programs.id,
          programTitle: programs.title,
          progressPercent: enrollments.progressPercent,
          intentScore: enrollments.intentScore,
          intentLabel: enrollments.intentLabel,
          learningStatus: enrollments.learningStatus,
          lastActivityAt: enrollments.lastActivityAt,
          enrolledAt: enrollments.enrolledAt,
        })
        .from(enrollments)
        .innerJoin(contacts, eq(enrollments.contactId, contacts.id))
        .innerJoin(programs, eq(enrollments.programId, programs.id))
        .where(
          and(
            eq(enrollments.organizationId, organizationId),
            options.programId ? eq(enrollments.programId, options.programId) : undefined
          )
        )
        .orderBy(desc(enrollments.lastActivityAt))
        .limit(limit)
        .offset(offset);

      return {
        learners: rows.map((r) => ({
          contactId: r.contactId,
          enrollmentId: r.enrollmentId,
          name: r.name,
          phone: r.phone,
          programId: r.programId,
          programTitle: r.programTitle,
          progressPercent: r.progressPercent,
          intentScore: r.intentScore,
          intentLabel: r.intentLabel as 'COLD' | 'WARM' | 'HOT',
          learningStatus: r.learningStatus as CanonicalLearningStatus,
          lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt).toISOString() : null,
          enrolledAt: new Date(r.enrolledAt).toISOString(),
        })),
        total: rows.length,
      };
    },

    async getLearnerDetail(organizationId, contactId) {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.organizationId, organizationId), eq(contacts.id, contactId)))
        .limit(1);

      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Kontak learner tidak ditemukan');
      }

      const enrs = await db
        .select({
          enrollment: enrollments,
          program: programs,
        })
        .from(enrollments)
        .innerJoin(programs, eq(enrollments.programId, programs.id))
        .where(and(eq(enrollments.organizationId, organizationId), eq(enrollments.contactId, contactId)));

      const signals = await learningSignalRepo.listByContact(organizationId, contactId);
      const events = await db
        .select()
        .from(learningEvents)
        .where(and(eq(learningEvents.organizationId, organizationId), eq(learningEvents.contactId, contactId)))
        .orderBy(desc(learningEvents.occurredAt));

      return {
        contact,
        enrollments: enrs.map((e) => ({
          ...e.enrollment,
          programTitle: e.program.title,
          programSlug: e.program.slug,
        })),
        signals,
        timeline: events,
      };
    },

    async getProgramAnalytics(organizationId, programId) {
      const [prog] = await db
        .select()
        .from(programs)
        .where(and(eq(programs.organizationId, organizationId), eq(programs.id, programId)))
        .limit(1);

      if (!prog) {
        throw new DomainError('NOT_FOUND', 'Program edukasi tidak ditemukan');
      }

      const enrRows = await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.organizationId, organizationId), eq(enrollments.programId, programId)));

      const enrolledCount = enrRows.length;
      if (enrolledCount === 0) {
        return {
          programId,
          programTitle: prog.title,
          enrolledCount: 0,
          startedCount: 0,
          reached50Count: 0,
          reached80Count: 0,
          completedCount: 0,
          ctaClickedCount: 0,
          avgProgressPercent: 0,
        };
      }

      const startedCount = enrRows.filter((e) => e.status === 'STARTED' || e.progressPercent > 0).length;
      const reached50Count = enrRows.filter((e) => e.progressPercent >= 50).length;
      const reached80Count = enrRows.filter((e) => e.progressPercent >= 80).length;
      const completedCount = enrRows.filter((e) => e.status === 'COMPLETED' || e.progressPercent === 100).length;

      const totalProgress = enrRows.reduce((acc, curr) => acc + curr.progressPercent, 0);
      const avgProgressPercent = Math.round(totalProgress / enrolledCount);

      const events = await db
        .select()
        .from(learningEvents)
        .where(
          and(
            eq(learningEvents.organizationId, organizationId),
            sql`${learningEvents.enrollmentId} IN (SELECT id FROM enrollments WHERE organization_id = ${organizationId} AND program_id = ${programId})`,
            sql`${learningEvents.eventType} IN ('cta.clicked', 'CTA_CLICKED')`
          )
        );

      const ctaClickedCount = events.length;

      return {
        programId,
        programTitle: prog.title,
        enrolledCount,
        startedCount,
        reached50Count,
        reached80Count,
        completedCount,
        ctaClickedCount,
        avgProgressPercent,
      };
    },

    async listSignals(organizationId, status) {
      return learningSignalRepo.list(organizationId, status);
    },

    async updateSignalStatus(organizationId, signalId, status) {
      return learningSignalRepo.updateStatus(organizationId, signalId, status);
    },
  };
}
