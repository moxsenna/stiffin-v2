import { eq, and, sql, gte, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  enrollments,
  programs,
  learningEvents,
  learningSignals,
  productEntitlements,
} from '../../db/schema';
import { createIntegrationOutboxService } from '../integration/integration-outbox-service';
import { logOperation } from '../../core/observability';

export interface InactivitySweepOptions {
  clock?: () => Date;
  batchSize?: number;
  maxPages?: number;
}

export interface InactivitySweepResult {
  scannedCount: number;
  atRiskCount: number;
  emittedEventsCount: number;
  errors: Array<{ enrollmentId: string; error: string }>;
  durationMs: number;
}

export interface InactivitySweepService {
  executeSweep(options?: InactivitySweepOptions): Promise<InactivitySweepResult>;
}

export function createInactivitySweepService(
  db: NodePgDatabase<any>,
  defaultOptions?: InactivitySweepOptions
): InactivitySweepService {
  return {
    async executeSweep(opts?: InactivitySweepOptions): Promise<InactivitySweepResult> {
      const startTime = Date.now();
      const getNow = opts?.clock ?? defaultOptions?.clock ?? (() => new Date());
      const now = getNow();
      const nowIso = now.toISOString();
      const batchSize = opts?.batchSize ?? defaultOptions?.batchSize ?? 100;
      const maxPages = opts?.maxPages ?? defaultOptions?.maxPages ?? 10;

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sevenDaysAgoIso = sevenDaysAgo.toISOString();

      let scannedCount = 0;
      let atRiskCount = 0;
      let emittedEventsCount = 0;
      const errors: Array<{ enrollmentId: string; error: string }> = [];

      const outboxService = createIntegrationOutboxService(db);

      // Bounded pagination sweep across active enrollments
      for (let page = 0; page < maxPages; page++) {
        const offset = page * batchSize;

        // Query active, incomplete enrollments with progress < 50%
        // whose last activity (or enrollment timestamp) is older than 7 days
        const candidateRows = await db
          .select({
            enrollmentId: enrollments.id,
            organizationId: enrollments.organizationId,
            contactId: enrollments.contactId,
            programId: enrollments.programId,
            status: enrollments.status,
            progressPercent: enrollments.progressPercent,
            learningStatus: enrollments.learningStatus,
            lastActivityAt: enrollments.lastActivityAt,
            enrolledAt: enrollments.enrolledAt,
            programTitle: programs.title,
          })
          .from(enrollments)
          .innerJoin(programs, eq(enrollments.programId, programs.id))
          .where(
            and(
              inArray(enrollments.status, ['ENROLLED', 'STARTED']),
              sql`${enrollments.progressPercent} < 50`,
              sql`${enrollments.learningStatus} != 'COMPLETED'`,
              sql`COALESCE(${enrollments.lastActivityAt}, ${enrollments.enrolledAt}) <= ${sevenDaysAgoIso}`
            )
          )
          .limit(batchSize)
          .offset(offset);

        if (candidateRows.length === 0) {
          break;
        }

        scannedCount += candidateRows.length;

        for (const candidate of candidateRows) {
          try {
            const refTimeStr = candidate.lastActivityAt ?? candidate.enrolledAt ?? nowIso;
            const refTime = new Date(refTimeStr).getTime();
            const diffDays = Math.max(7, Math.floor((now.getTime() - refTime) / (1000 * 60 * 60 * 24)));

            // 1. Atomically set learningStatus to AT_RISK if not completed
            await db
              .update(enrollments)
              .set({
                learningStatus: 'AT_RISK',
                updatedAt: nowIso,
              })
              .where(
                and(
                  eq(enrollments.id, candidate.enrollmentId),
                  eq(enrollments.organizationId, candidate.organizationId),
                  inArray(enrollments.status, ['ENROLLED', 'STARTED'])
                )
              );

            atRiskCount++;

            // 2. Check if a learner.inactive event was already emitted during this inactivity episode
            const existingInactiveEvents = await db
              .select({ id: learningEvents.id })
              .from(learningEvents)
              .where(
                and(
                  eq(learningEvents.enrollmentId, candidate.enrollmentId),
                  eq(learningEvents.eventType, 'learner.inactive'),
                  gte(learningEvents.occurredAt, new Date(refTimeStr))
                )
              )
              .limit(1);

            if (existingInactiveEvents.length === 0) {
              // Emit canonical learner.inactive event
              const [insertedEvent] = await db
                .insert(learningEvents)
                .values({
                  organizationId: candidate.organizationId,
                  enrollmentId: candidate.enrollmentId,
                  contactId: candidate.contactId,
                  eventType: 'learner.inactive',
                  payload: {
                    daysInactive: diffDays,
                    progressPercent: candidate.progressPercent,
                    programId: candidate.programId,
                  },
                  occurredAt: now,
                })
                .returning();

              emittedEventsCount++;

              // 3. Create or record learning signal for inactivity
              const [sig] = await db
                .insert(learningSignals)
                .values({
                  organizationId: candidate.organizationId,
                  enrollmentId: candidate.enrollmentId,
                  contactId: candidate.contactId,
                  programId: candidate.programId,
                  sourceEventId: insertedEvent.id,
                  type: 'LEARNER_INACTIVITY',
                  priority: 70,
                  reason: 'LEARNER_INACTIVE',
                  recommendedActionType: 'FOLLOW_UP',
                  recommendedActionReason: `Peserta belum beraktivitas selama ${diffDays} hari pada materi ${candidate.programTitle}.`,
                  status: 'ACTIVE',
                  metadata: {
                    programId: candidate.programId,
                    programTitle: candidate.programTitle,
                    daysInactive: diffDays,
                    progressPercent: candidate.progressPercent,
                  },
                })
                .returning();

              // 4. Bridge to Flow via Integration Outbox if entitled
              const [ent] = await db
                .select()
                .from(productEntitlements)
                .where(eq(productEntitlements.organizationId, candidate.organizationId))
                .limit(1);

              if (ent?.promotorFlow) {
                const actionTitle = `Follow-up Inaktivitas: ${candidate.programTitle}`;
                const ruleId = 'learner_inactive';
                const canonicalSourceEventId = insertedEvent.id;
                const idempotencyKey = `promotorclass:${canonicalSourceEventId}:${ruleId}`;

                // NextAction in outbox
                await outboxService.enqueue({
                  organizationId: candidate.organizationId,
                  destination: 'PROMOTORFLOW',
                  operation: 'CREATE_NEXT_ACTION',
                  idempotencyKey,
                  payloadJson: {
                    organizationId: candidate.organizationId,
                    contactId: candidate.contactId,
                    source: 'PROMOTORCLASS',
                    sourceEventId: canonicalSourceEventId,
                    sourceSignalId: sig.id,
                    actionType: 'FOLLOW_UP',
                    title: actionTitle,
                    reason: sig.recommendedActionReason,
                    dueAt: nowIso,
                    context: {
                      programId: candidate.programId,
                      programTitle: candidate.programTitle,
                      enrollmentId: candidate.enrollmentId,
                      signalType: sig.type,
                      daysInactive: diffDays,
                    },
                    idempotencyKey,
                  },
                });

                // Append Activity in outbox
                await outboxService.enqueue({
                  organizationId: candidate.organizationId,
                  destination: 'PROMOTORFLOW',
                  operation: 'APPEND_ACTIVITY',
                  idempotencyKey: `act_${idempotencyKey}`,
                  payloadJson: {
                    organizationId: candidate.organizationId,
                    contactId: candidate.contactId,
                    source: 'PROMOTORCLASS',
                    sourceEventId: canonicalSourceEventId,
                    eventType: 'LEARNING_SIGNAL',
                    summary: actionTitle,
                    context: {
                      signalId: sig.id,
                      reason: sig.reason,
                      programId: candidate.programId,
                      daysInactive: diffDays,
                    },
                    idempotencyKey: `act_${idempotencyKey}`,
                  },
                });
              }
            }
          } catch (err: any) {
            errors.push({
              enrollmentId: candidate.enrollmentId,
              error: err?.message || String(err),
            });
          }
        }

        if (candidateRows.length < batchSize) {
          break;
        }
      }

      // Process pending outbox queue
      try {
        await outboxService.processPending({ limit: 20, now });
      } catch (err: any) {
        logOperation({
          level: 'warn',
          operation: 'INACTIVITY_SWEEP_OUTBOX_DISPATCH',
          result: 'FAILURE',
          error: {
            code: 'OUTBOX_DISPATCH_DEFERRED',
            message: err?.message || 'Outbox dispatch deferred',
          },
        });
      }

      const durationMs = Date.now() - startTime;

      logOperation({
        operation: 'INACTIVITY_SWEEP_EXECUTION',
        result: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
        duration_ms: durationMs,
        details: {
          scannedCount,
          atRiskCount,
          emittedEventsCount,
          errorCount: errors.length,
        },
      });

      return {
        scannedCount,
        atRiskCount,
        emittedEventsCount,
        errors,
        durationMs,
      };
    },
  };
}
