import { eq, and, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { learningSignals, LearningSignalRow, NewLearningSignalRow } from '../db/schema/learning-signals';

export interface CreateLearningSignalInput {
  organizationId: string;
  enrollmentId?: string | null;
  contactId: string;
  programId?: string | null;
  sourceEventId?: string | null;
  type?: string;
  priority?: number;
  reason: string;
  recommendedActionType?: string | null;
  recommendedActionReason?: string | null;
  status?: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  metadata?: Record<string, unknown>;
}

export interface LearningSignalRepository {
  create(input: CreateLearningSignalInput): Promise<LearningSignalRow>;
  list(organizationId: string, status?: string): Promise<LearningSignalRow[]>;
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
          enrollmentId: input.enrollmentId ?? null,
          contactId: input.contactId,
          programId: input.programId ?? null,
          sourceEventId: input.sourceEventId ?? null,
          type: input.type ?? 'HIGH_LEARNING_INTENT',
          priority: input.priority ?? 50,
          reason: input.reason,
          recommendedActionType: input.recommendedActionType ?? null,
          recommendedActionReason: input.recommendedActionReason ?? null,
          status: input.status ?? 'ACTIVE',
          metadata: input.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();

      if (rows[0]) {
        return rows[0];
      }

      const existingList = await db
        .select()
        .from(learningSignals)
        .where(
          and(
            eq(learningSignals.organizationId, input.organizationId),
            input.enrollmentId ? eq(learningSignals.enrollmentId, input.enrollmentId) : eq(learningSignals.contactId, input.contactId),
            eq(learningSignals.reason, input.reason)
          )
        )
        .orderBy(desc(learningSignals.createdAt));

      return existingList[0];
    },

    async list(organizationId, status) {
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

    async listByOrg(organizationId, status) {
      return this.list(organizationId, status);
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
          resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
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
