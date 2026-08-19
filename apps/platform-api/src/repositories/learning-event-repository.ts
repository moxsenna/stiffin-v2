import { eq, and, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  learningEvents,
  LearningEventRow,
  NewLearningEventRow,
  CanonicalLearningEventType,
} from '../db/schema/learning-events';

export interface CreateLearningEventInput {
  organizationId: string;
  enrollmentId: string;
  contactId: string;
  eventType: CanonicalLearningEventType | (string & {});
  payload?: Record<string, unknown>;
  occurredAt?: string | null;
}

export interface LearningEventRepository {
  create(input: CreateLearningEventInput): Promise<LearningEventRow>;
  listByEnrollment(organizationId: string, enrollmentId: string): Promise<LearningEventRow[]>;
  listByContact(organizationId: string, contactId: string): Promise<LearningEventRow[]>;
}

export function createLearningEventRepository(db: NodePgDatabase): LearningEventRepository {
  return {
    async create(input) {
      const now = input.occurredAt ? new Date(input.occurredAt) : new Date();
      const rows = await db
        .insert(learningEvents)
        .values({
          organizationId: input.organizationId,
          enrollmentId: input.enrollmentId,
          contactId: input.contactId,
          eventType: input.eventType,
          payload: input.payload ?? {},
          occurredAt: now,
        })
        .onConflictDoNothing()
        .returning();

      if (rows[0]) {
        return rows[0];
      }

      const existingList = await db
        .select()
        .from(learningEvents)
        .where(
          and(
            eq(learningEvents.organizationId, input.organizationId),
            eq(learningEvents.enrollmentId, input.enrollmentId),
            eq(learningEvents.eventType, input.eventType)
          )
        )
        .orderBy(desc(learningEvents.occurredAt));

      if (input.payload && typeof input.payload === 'object' && 'lessonId' in input.payload && input.payload.lessonId) {
        const matched = existingList.find(
          (e) => (e.payload as any)?.lessonId === (input.payload as any).lessonId
        );
        if (matched) return matched;
      }

      return existingList[0];
    },

    async listByEnrollment(organizationId, enrollmentId) {
      return await db
        .select()
        .from(learningEvents)
        .where(
          and(
            eq(learningEvents.organizationId, organizationId),
            eq(learningEvents.enrollmentId, enrollmentId)
          )
        )
        .orderBy(desc(learningEvents.occurredAt));
    },

    async listByContact(organizationId, contactId) {
      return await db
        .select()
        .from(learningEvents)
        .where(
          and(
            eq(learningEvents.organizationId, organizationId),
            eq(learningEvents.contactId, contactId)
          )
        )
        .orderBy(desc(learningEvents.occurredAt));
    },
  };
}
