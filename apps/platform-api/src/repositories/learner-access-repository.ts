import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { learnerAccessTokens, LearnerAccessTokenRow } from '../db/schema/learner-access-tokens';

export type CreateLearnerTokenInput = {
  organizationId: string;
  contactId: string;
  tokenHash: string;
  expiresAt: string;
};

export interface LearnerAccessRepository {
  createToken(input: CreateLearnerTokenInput): Promise<LearnerAccessTokenRow>;
  findValidByHash(tokenHash: string, evaluationNow?: string): Promise<LearnerAccessTokenRow | null>;
  atomicRedeemByHash(tokenHash: string, evaluationNow?: string): Promise<LearnerAccessTokenRow | null>;
  markRedeemed(id: string, redeemedAt?: string): Promise<LearnerAccessTokenRow | null>;
  revokeTokensForContact(organizationId: string, contactId: string): Promise<void>;
}

export function createLearnerAccessRepository(db: NodePgDatabase): LearnerAccessRepository {
  return {
    async createToken(input: CreateLearnerTokenInput) {
      const [created] = await db
        .insert(learnerAccessTokens)
        .values({
          organizationId: input.organizationId,
          contactId: input.contactId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        })
        .returning();
      return created;
    },

    async findValidByHash(tokenHash: string, evaluationNow?: string) {
      const nowIso = evaluationNow ?? new Date().toISOString();
      const rows = await db
        .select()
        .from(learnerAccessTokens)
        .where(
          and(
            eq(learnerAccessTokens.tokenHash, tokenHash),
            gt(learnerAccessTokens.expiresAt, nowIso)
          )
        );
      return rows[0] ?? null;
    },

    async atomicRedeemByHash(tokenHash: string, evaluationNow?: string) {
      const nowIso = evaluationNow ?? new Date().toISOString();
      const [redeemed] = await db
        .update(learnerAccessTokens)
        .set({ redeemedAt: nowIso })
        .where(
          and(
            eq(learnerAccessTokens.tokenHash, tokenHash),
            gt(learnerAccessTokens.expiresAt, nowIso),
            isNull(learnerAccessTokens.redeemedAt)
          )
        )
        .returning();
      return redeemed ?? null;
    },

    async markRedeemed(id: string, redeemedAt?: string) {
      const nowIso = redeemedAt ?? new Date().toISOString();
      const [updated] = await db
        .update(learnerAccessTokens)
        .set({ redeemedAt: nowIso })
        .where(eq(learnerAccessTokens.id, id))
        .returning();
      return updated ?? null;
    },

    async revokeTokensForContact(organizationId: string, contactId: string) {
      await db
        .delete(learnerAccessTokens)
        .where(
          and(
            eq(learnerAccessTokens.organizationId, organizationId),
            eq(learnerAccessTokens.contactId, contactId)
          )
        );
    },
  };
}
