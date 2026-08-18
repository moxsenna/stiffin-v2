import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { lessonProgress, LessonProgressRow, NewLessonProgressRow } from '../db/schema/lesson-progress';

export interface LessonProgressRepository {
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
}

export function createLessonProgressRepository(db: NodePgDatabase): LessonProgressRepository {
  return {
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
  };
}
