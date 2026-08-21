import { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppEnv } from '../app';
import { createLearnerSessionService } from '../services/class/learner-session-service';
import { DomainError } from '../core/errors';

export interface LearnerContext {
  organizationId: string;
  contactId: string;
  sessionId: string;
}

export const learnerAuthMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = c.get('db');
  const sessionService = createLearnerSessionService(db);

  // 1. Extract session token from HttpOnly cookie or Authorization: Bearer header
  const cookieToken = getCookie(c, 'promotor_learner_session');
  const authHeader = c.req.header('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  const primaryToken = (bearerToken?.startsWith('lsess_') ? bearerToken : cookieToken) || bearerToken || cookieToken;
  if (!primaryToken) {
    throw new DomainError('UNAUTHORIZED', 'Sesi belajar tidak ditemukan. Silakan masuk kembali.');
  }

  // 2. Validate session in database (active, non-expired, non-revoked)
  let validation = await sessionService.validateSession(primaryToken);
  if (!validation.isValid && cookieToken && bearerToken && primaryToken !== bearerToken) {
    validation = await sessionService.validateSession(bearerToken);
  }
  if (!validation.isValid || !validation.session) {
    throw new DomainError('UNAUTHORIZED', 'Sesi belajar tidak valid atau telah kedaluwarsa');
  }

  // 3. Set learner context on request
  const learnerContext: LearnerContext = {
    organizationId: validation.session.organizationId,
    contactId: validation.session.contactId,
    sessionId: validation.session.id,
  };

  c.set('learnerContext' as any, learnerContext);

  await next();
};
