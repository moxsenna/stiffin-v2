import { eq, and, gt, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { learnerSessions, LearnerSessionRow, NewLearnerSessionRow } from '../db/schema/learner-sessions';

export interface LearnerSessionRepository {
  createSession(session: NewLearnerSessionRow): Promise<LearnerSessionRow>;
  findActiveSession(tokenHash: string, now?: Date): Promise<LearnerSessionRow | null>;
  updateLastUsed(id: string, now?: Date): Promise<void>;
  revokeSession(id: string, now?: Date): Promise<void>;
}

export function createLearnerSessionRepository(db: NodePgDatabase): LearnerSessionRepository {
  return {
    async createSession(session: NewLearnerSessionRow): Promise<LearnerSessionRow> {
      const [row] = await db.insert(learnerSessions).values(session).returning();
      return row;
    },

    async findActiveSession(tokenHash: string, now: Date = new Date()): Promise<LearnerSessionRow | null> {
      const [row] = await db
        .select()
        .from(learnerSessions)
        .where(
          and(
            eq(learnerSessions.tokenHash, tokenHash),
            gt(learnerSessions.expiresAt, now),
            isNull(learnerSessions.revokedAt)
          )
        )
        .limit(1);

      return row ?? null;
    },

    async updateLastUsed(id: string, now: Date = new Date()): Promise<void> {
      await db
        .update(learnerSessions)
        .set({ lastUsedAt: now })
        .where(eq(learnerSessions.id, id));
    },

    async revokeSession(id: string, now: Date = new Date()): Promise<void> {
      await db
        .update(learnerSessions)
        .set({ revokedAt: now })
        .where(eq(learnerSessions.id, id));
    },
  };
}
