/**
 * Safe, serializable domain error envelope. Never passes raw pg errors
 * to callers or logs (B0.1 security pattern).
 */
export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_YOUTUBE_URL'
  | 'PROGRAM_NOT_PUBLISHED'
  | 'PROGRAM_NOT_COMPLETED'
  | 'CONTENT_DELETE_FORBIDDEN'
  | 'SLOT_UNAVAILABLE'
  | 'PAYMENT_REQUIRED'
  | 'PLAN_LIMIT_REACHED'
  | 'FEATURE_REQUIRES_UPGRADE'
  | 'CONFIGURATION_ERROR'
  | 'PAYMENT_GATEWAY_ERROR'
  | 'INVALID_STATE'
  | 'FEATURE_DISABLED'
  | 'INTERNAL_ERROR'
  | 'LEARNER_NOT_FOUND'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'OTP_RATE_LIMITED'
  | 'OTP_DELIVERY_UNAVAILABLE';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: DomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }

  toSafeObject(): { code: DomainErrorCode; message: string } {
    return { code: this.code, message: this.message };
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return (
    err instanceof DomainError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as any).name === 'DomainError' &&
      typeof (err as any).code === 'string')
  );
}
