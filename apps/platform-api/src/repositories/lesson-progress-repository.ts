import { eq, and, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { lessonProgress, LessonProgressRow, NewLessonProgressRow } from '../db/schema/lesson-progress';

export interface LessonProgressRepository {
  findByLesson(
    organizationId: string,
    enrollmentId: string,
    lessonId: string
  ): Promise<LessonProgressRow | null>;
  findByEnrollmentAndLesson(
    organizationId: string,
    enrollmentId: string,
    lessonId: string
  ): Promise<LessonProgressRow | null>;
  listByEnrollment(organizationId: string, enrollmentId: string): Promise<LessonProgressRow[]>;
  upsertProgress(
    organizationId: string,
    enrollmentId: string,
    lessonId: string,
    isCompleted: boolean,
    completedAt?: string | null
  ): Promise<LessonProgressRow>;
  atomicComplete(
    organizationId: string,
    enrollmentId: string,
    lessonId: string,
    completedAt?: string | null
  ): Promise<{ progress: LessonProgressRow; isNewlyCompleted: boolean }>;
}

export function createLessonProgressRepository(db: NodePgDatabase): LessonProgressRepository {
  return {
    async findByLesson(organizationId, enrollmentId, lessonId) {
      return this.findByEnrollmentAndLesson(organizationId, enrollmentId, lessonId);
    },

    async findByEnrollmentAndLesson(organizationId, enrollmentId, lessonId) {
      const rows = await db
        .select()
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.organizationId, organizationId),
            eq(lessonProgress.enrollmentId, enrollmentId),
            eq(lessonProgress.lessonId, lessonId)
          )
        );
      return rows[0] ?? null;
    },

    async listByEnrollment(organizationId, enrollmentId) {
      return await db
        .select()
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.organizationId, organizationId),
            eq(lessonProgress.enrollmentId, enrollmentId)
          )
        );
    },

    async upsertProgress(organizationId, enrollmentId, lessonId, isCompleted, completedAt) {
      const now = new Date();
      const rows = await db
        .insert(lessonProgress)
        .values({
          organizationId,
          enrollmentId,
          lessonId,
          isCompleted,
          completedAt: completedAt ? new Date(completedAt) : isCompleted ? now : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.enrollmentId, lessonProgress.lessonId],
          set: {
            isCompleted,
            completedAt: completedAt ? new Date(completedAt) : isCompleted ? now : null,
            updatedAt: now,
          },
        })
        .returning();

      return rows[0];
    },

    async atomicComplete(organizationId, enrollmentId, lessonId, completedAt) {
      const now = new Date();
      const dateVal = completedAt ? new Date(completedAt) : now;

      // Atomic insert or conditional update
      const res = await db.execute(sql`
        INSERT INTO lesson_progress (organization_id, enrollment_id, lesson_id, is_completed, completed_at, updated_at)
        VALUES (${organizationId}, ${enrollmentId}, ${lessonId}, true, ${dateVal}, ${now})
        ON CONFLICT (enrollment_id, lesson_id)
        DO UPDATE SET
          is_completed = true,
          completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at),
          updated_at = EXCLUDED.updated_at
        RETURNING
          id,
          organization_id AS "organizationId",
          enrollment_id AS "enrollmentId",
          lesson_id AS "lessonId",
          is_completed AS "isCompleted",
          completed_at AS "completedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt",
          (xmax = 0 OR lesson_progress.is_completed = false) AS "isNewlyCompleted"
      `);

      const row = res.rows[0] as any;
      return {
        progress: row as LessonProgressRow,
        isNewlyCompleted: Boolean(row.isNewlyCompleted),
      };
    },
  };
}
