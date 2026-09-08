import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { learnerLessonNotes, LearnerLessonNoteRow } from '../db/schema/learner-lesson-notes';

export interface LearnerLessonNoteRepository {
  findByEnrollmentAndLesson(
    organizationId: string,
    enrollmentId: string,
    lessonId: string
  ): Promise<LearnerLessonNoteRow | null>;
  upsert(
    organizationId: string,
    enrollmentId: string,
    lessonId: string,
    body: string
  ): Promise<LearnerLessonNoteRow>;
}

export function createLearnerLessonNoteRepository(db: NodePgDatabase): LearnerLessonNoteRepository {
  return {
    async findByEnrollmentAndLesson(organizationId: string, enrollmentId: string, lessonId: string) {
      const rows = await db
        .select()
        .from(learnerLessonNotes)
        .where(
          and(
            eq(learnerLessonNotes.organizationId, organizationId),
            eq(learnerLessonNotes.enrollmentId, enrollmentId),
            eq(learnerLessonNotes.lessonId, lessonId)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async upsert(organizationId: string, enrollmentId: string, lessonId: string, body: string) {
      const now = new Date();
      const rows = await db
        .insert(learnerLessonNotes)
        .values({
          organizationId,
          enrollmentId,
          lessonId,
          body,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [learnerLessonNotes.enrollmentId, learnerLessonNotes.lessonId],
          set: { body, updatedAt: now },
        })
        .returning();
      return rows[0];
    },
  };
}
