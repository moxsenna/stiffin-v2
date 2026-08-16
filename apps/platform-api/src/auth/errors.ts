/**
 * Auth-safe error envelope. Reuses the B1 DomainError for stable codes but
 * adds the auth-specific ORG_CONTEXT_* codes used by the resolver and /api/me.
 *
 * AuthError IS a DomainError; the wider AuthErrorCode is a type-level union.
 * The runtime `code` field on the parent accepts any string, so ORG_CONTEXT_*
 * codes flow through unchanged.
 */
import { DomainError, DomainErrorCode } from '../core/errors';

export type AuthErrorCode =
  | DomainErrorCode
  | 'ORG_CONTEXT_REQUIRED'
  | 'ORG_CONTEXT_INVALID'
  | 'ENTITLEMENT_DENIED';

export class AuthError extends DomainError {
  constructor(code: AuthErrorCode, message: string, details?: Record<string, unknown>) {
    super(code as DomainErrorCode, message, details);
    this.name = 'AuthError';
  }
}

/** Maps an AuthError to the correct HTTP status (frozen semantics). */
export function authErrorStatus(err: AuthError): 401 | 403 | 500 {
  const code = String(err.code);
  if (code === 'ORG_CONTEXT_INVALID' || code === 'ORG_CONTEXT_REQUIRED' || code === 'ENTITLEMENT_DENIED') return 403;
  if (code === 'FORBIDDEN') return 403;
  if (code === 'UNAUTHORIZED') return 401;
  return 500;
}
