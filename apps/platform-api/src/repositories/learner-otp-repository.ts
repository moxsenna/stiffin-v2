import { and, desc, eq, gt, gte, isNull, lt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  learnerOtpChallenges,
  type LearnerOtpChallengeRow,
  type NewLearnerOtpChallengeRow,
} from '../db/schema/learner-otp-challenges';

export interface CreateOtpChallengeInput {
  organizationId: string;
  contactId: string;
  phoneE164: string;
  codeHash: string;
  expiresAt: Date;
}

export function createLearnerOtpRepository(db: NodePgDatabase) {
  return {
    async countRecentByPhone(phoneE164: string, since: Date): Promise<number> {
      const rows = await db
        .select({ id: learnerOtpChallenges.id })
        .from(learnerOtpChallenges)
        .where(
          and(
            eq(learnerOtpChallenges.phoneE164, phoneE164),
            gte(learnerOtpChallenges.createdAt, since)
          )
        );
      return rows.length;
    },

    async createChallenge(input: CreateOtpChallengeInput): Promise<LearnerOtpChallengeRow> {
      const payload: NewLearnerOtpChallengeRow = {
        organizationId: input.organizationId,
        contactId: input.contactId,
        phoneE164: input.phoneE164,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
      };
      const rows = await db.insert(learnerOtpChallenges).values(payload).returning();
      return rows[0];
    },

    async findLatestActiveByPhone(phoneE164: string): Promise<LearnerOtpChallengeRow | null> {
      const rows = await db
        .select()
        .from(learnerOtpChallenges)
        .where(
          and(
            eq(learnerOtpChallenges.phoneE164, phoneE164),
            isNull(learnerOtpChallenges.consumedAt)
          )
        )
        .orderBy(desc(learnerOtpChallenges.createdAt))
        .limit(1);
      return rows[0] ?? null;
    },

    async expireActiveByPhone(phoneE164: string, now: Date): Promise<void> {
      await db
        .update(learnerOtpChallenges)
        .set({ consumedAt: now })
        .where(
          and(
            eq(learnerOtpChallenges.phoneE164, phoneE164),
            isNull(learnerOtpChallenges.consumedAt)
          )
        );
    },

    async atomicConsume(
      id: string,
      codeHash: string,
      now: Date
    ): Promise<LearnerOtpChallengeRow | null> {
      const updated = await db
        .update(learnerOtpChallenges)
        .set({ consumedAt: now })
        .where(
          and(
            eq(learnerOtpChallenges.id, id),
            eq(learnerOtpChallenges.codeHash, codeHash),
            isNull(learnerOtpChallenges.consumedAt),
            lt(learnerOtpChallenges.attempts, 5),
            gt(learnerOtpChallenges.expiresAt, now)
          )
        )
        .returning();
      if (updated.length > 0) return updated[0];
      await db
        .update(learnerOtpChallenges)
        .set({ attempts: sql`${learnerOtpChallenges.attempts} + 1` })
        .where(eq(learnerOtpChallenges.id, id));
      return null;
    },
  };
}

export type LearnerOtpRepository = ReturnType<typeof createLearnerOtpRepository>;
