/**
 * Runtime-safe PostgreSQL error classifier.
 *
 * drizzle-orm >=0.41 wraps the original pg error in DrizzleQueryError, moving
 * the SQLSTATE code (23505, 23503, 23502, ...) to error.cause.code. Runtime
 * application code that translates DB constraint errors must read both levels
 * without exposing raw DB details.
 */
export function getPostgresErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const code = (err as { code?: unknown }).code;
  if (typeof code === 'string') return code;
  const cause = (err as { cause?: { code?: unknown } }).cause;
  const causeCode = cause?.code;
  return typeof causeCode === 'string' ? causeCode : undefined;
}

/** True when the underlying PostgreSQL error is a unique-violation (23505). */
export function isUniqueViolation(err: unknown): boolean {
  return getPostgresErrorCode(err) === '23505';
}
