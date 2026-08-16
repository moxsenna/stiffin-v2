/**
 * Shared Core soft-delete User operation (frozen B2 policy).
 *
 * Atomically:
 *   1. soft-deletes the canonical users row (deleted_at + updated_at)
 *   2. revokes/deletes ALL sessions for that user
 *
 * inside ONE Drizzle transaction.
 *
 * Does NOT hard-delete the User, does NOT delete the credential Account, and
 * does NOT remove memberships merely because the User is disabled.
 *
 * This is the authoritative layer of the frozen soft-delete policy:
 *   (a) cannot sign in             — createAuth hooks.before on /sign-in/email
 *   (b) cannot create sessions     — databaseHooks.session.create.before
 *   (c) cannot continue old sessions — THIS operation (sessions deleted now)
 */
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, sessions } from '../db/schema';
import { DomainError } from '../core/errors';

export function createPromotorUserService(db: NodePgDatabase) {
  return {
    /**
     * Soft-deletes a Promotor User and immediately revokes all of their
     * sessions in one transaction. Throws NOT_FOUND for unknown users.
     */
    async softDeletePromotorUser(userId: string): Promise<{ userId: string }> {
      const result = await db.transaction(async (tx) => {
        const rows = await tx
          .update(users)
          .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .where(eq(users.id, userId))
          .returning({ id: users.id });
        if (rows.length === 0) {
          throw new DomainError('NOT_FOUND', 'User not found');
        }
        await tx.delete(sessions).where(eq(sessions.userId, userId));
        return rows[0];
      });
      return { userId: result.id };
    },
  };
}

export type PromotorUserService = ReturnType<typeof createPromotorUserService>;
