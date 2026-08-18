import { eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { reflectionResponses, ReflectionResponseRow } from '../db/schema/reflection-responses';

export interface SaveReflectionInput {
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
  responseText?: string | null;
  selectedOptions?: unknown | null;
}

export interface ReflectionResponseRepository {
  findByLesson(
    organizationId: string,
    enrollmentId: string,
    lessonId: string
  ): Promise<ReflectionResponseRow | null>;
  findByEnrollmentAndLesson(
    organizationId: string,
    enrollmentId: string,
    lessonId: string
  ): Promise<ReflectionResponseRow | null>;
  listByEnrollment(organizationId: string, enrollmentId: string): Promise<ReflectionResponseRow[]>;
  saveResponse(input: SaveReflectionInput): Promise<ReflectionResponseRow>;
  upsert(input: SaveReflectionInput): Promise<ReflectionResponseRow>;
}

export function createReflectionResponseRepository(db: NodePgDatabase): ReflectionResponseRepository {
  return {
    async findByLesson(organizationId, enrollmentId, lessonId) {
      return this.findByEnrollmentAndLesson(organizationId, enrollmentId, lessonId);
    },

    async upsert(input) {
      return this.saveResponse(input);
    },

    async findByEnrollmentAndLesson(organizationId, enrollmentId, lessonId) {
      const rows = await db
        .select()
        .from(reflectionResponses)
        .where(
          and(
            eq(reflectionResponses.organizationId, organizationId),
            eq(reflectionResponses.enrollmentId, enrollmentId),
            eq(reflectionResponses.lessonId, lessonId)
          )
        );
      return rows[0] ?? null;
    },

    async listByEnrollment(organizationId, enrollmentId) {
      return await db
        .select()
        .from(reflectionResponses)
        .where(
          and(
            eq(reflectionResponses.organizationId, organizationId),
            eq(reflectionResponses.enrollmentId, enrollmentId)
          )
        );
    },

    async saveResponse(input) {
      const now = new Date();
      const rows = await db
        .insert(reflectionResponses)
        .values({
          organizationId: input.organizationId,
          enrollmentId: input.enrollmentId,
          lessonId: input.lessonId,
          responseText: input.responseText ?? null,
          selectedOptions: input.selectedOptions ?? null,
          submittedAt: now,
        })
        .onConflictDoUpdate({
          target: [reflectionResponses.enrollmentId, reflectionResponses.lessonId],
          set: {
            responseText: input.responseText ?? null,
            selectedOptions: input.selectedOptions ?? null,
            submittedAt: now,
          },
        })
        .returning();

      return rows[0];
    },
  };
}
