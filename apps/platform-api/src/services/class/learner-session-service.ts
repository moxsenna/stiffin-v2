import * as crypto from 'node:crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DomainError } from '../../core/errors';
import { createLearnerAccessRepository, LearnerAccessRepository } from '../../repositories/learner-access-repository';
import { createLearnerSessionRepository, LearnerSessionRepository } from '../../repositories/learner-session-repository';
import { LearnerSessionRow } from '../../db/schema/learner-sessions';

export interface LearnerSessionService {
  redeemToken(rawAccessToken: string): Promise<{
    sessionToken: string;
    session: LearnerSessionRow;
    contactId: string;
    organizationId: string;
  }>;
  validateSession(rawSessionToken: string): Promise<{
    isValid: boolean;
    session?: LearnerSessionRow;
    reason?: string;
  }>;
  revokeSession(sessionId: string): Promise<void>;
}

export function createLearnerSessionService(
  db: NodePgDatabase,
  dependencies: {
    accessRepo?: LearnerAccessRepository;
    sessionRepo?: LearnerSessionRepository;
    clock?: () => Date;
  } = {}
): LearnerSessionService {
  const accessRepo = dependencies.accessRepo ?? createLearnerAccessRepository(db);
  const sessionRepo = dependencies.sessionRepo ?? createLearnerSessionRepository(db);
  const getNow = dependencies.clock ?? (() => new Date());

  const sha256 = (val: string) => crypto.createHash('sha256').update(val).digest('hex');

  return {
    async redeemToken(rawAccessToken: string) {
      if (!rawAccessToken || typeof rawAccessToken !== 'string' || rawAccessToken.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', 'Token akses tidak valid atau tidak diberikan');
      }

      const now = getNow();
      const tokenHash = sha256(rawAccessToken.trim());

      // Atomic conditional redemption: exactly one concurrent redemption wins
      const tokenRow = await accessRepo.atomicRedeemByHash(tokenHash, now.toISOString());
      if (!tokenRow) {
        throw new DomainError('UNAUTHORIZED', 'Token akses tidak valid, telah kedaluwarsa, atau sudah pernah digunakan');
      }

      // Generate high-entropy 256-bit session token
      const rawSessionToken = 'lsess_' + crypto.randomBytes(32).toString('hex');
      const sessionTokenHash = sha256(rawSessionToken);

      // Session expires in 30 days
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const session = await sessionRepo.createSession({
        organizationId: tokenRow.organizationId,
        contactId: tokenRow.contactId,
        tokenHash: sessionTokenHash,
        expiresAt: expiresAt,
      });

      return {
        sessionToken: rawSessionToken,
        session,
        contactId: tokenRow.contactId,
        organizationId: tokenRow.organizationId,
      };
    },

    async validateSession(rawSessionToken: string) {
      if (!rawSessionToken || typeof rawSessionToken !== 'string' || rawSessionToken.trim().length === 0) {
        return { isValid: false, reason: 'MISSING_TOKEN' };
      }

      const now = getNow();
      const tokenHash = sha256(rawSessionToken.trim());

      const session = await sessionRepo.findActiveSession(tokenHash, now);
      if (!session) {
        return { isValid: false, reason: 'INVALID_OR_EXPIRED' };
      }

      // Record activity
      await sessionRepo.updateLastUsed(session.id, now);

      return {
        isValid: true,
        session,
      };
    },

    async revokeSession(sessionId: string) {
      const now = getNow();
      await sessionRepo.revokeSession(sessionId, now);
    },
  };
}
