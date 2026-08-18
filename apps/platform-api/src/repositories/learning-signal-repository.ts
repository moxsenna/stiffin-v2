import { eq, and, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { learningSignals, LearningSignalRow, NewLearningSignalRow } from '../db/schema/learning-signals';

export interface CreateLearningSignalInput {
  organizationId: string;
  enrollmentId: string;
  contactId: string;
  reason: string;
  status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  metadata?: Record<string, unknown>;
}

export interface LearningSignalRepository {
  create(input: CreateLearningSignalInput): Promise<LearningSignalRow>;
  listByOrg(organizationId: string, status?: string): Promise<LearningSignalRow[]>;
  listByContact(organizationId: string, contactId: string): Promise<LearningSignalRow[]>;
  updateStatus(organizationId: string, signalId: string, status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED'): Promise<LearningSignalRow | null>;
}

export function createLearningSignalRepository(db: NodePgDatabase): LearningSignalRepository {
  return {
    async create(input) {
      const now = new Date();
      const rows = await db
        .insert(learningSignals)
        .values({
          organizationId: input.organizationId,
          enrollmentId: input.enrollmentId,
          contactId: input.contactId,
          reason: input.reason,
          status: input.status ?? 'ACTIVE',
          metadata: input.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return rows[0];
    },

    async listByOrg(organizationId, status) {
      const conds = [eq(learningSignals.organizationId, organizationId)];
      if (status) {
        conds.push(eq(learningSignals.status, status));
      }
      return await db
        .select()
        .from(learningSignals)
        .where(and(...conds))
        .orderBy(desc(learningSignals.createdAt));
    },

    async listByContact(organizationId, contactId) {
      return await db
        .select()
        .from(learningSignals)
        .where(
          and(
            eq(learningSignals.organizationId, organizationId),
            eq(learningSignals.contactId, contactId)
          )
        )
        .orderBy(desc(learningSignals.createdAt));
    },

    async updateStatus(organizationId, signalId, status) {
      const rows = await db
        .update(learningSignals)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(learningSignals.organizationId, organizationId),
            eq(learningSignals.id, signalId)
          )
        )
        .returning();

      return rows[0] ?? null;
    },
  };
}
