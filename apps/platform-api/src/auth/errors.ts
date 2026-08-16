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
  | 'ORG_CONTEXT_INVALID';

export class AuthError extends DomainError {
  constructor(code: AuthErrorCode, message: string, details?: Record<string, unknown>) {
    super(code as DomainErrorCode, message, details);
    this.name = 'AuthError';
  }
}
