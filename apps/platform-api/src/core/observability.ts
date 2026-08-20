import type { MiddlewareHandler } from 'hono';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogResult = 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'RETRY';

export interface StructuredLogEntry {
  level?: LogLevel;
  timestamp?: string;
  request_id?: string;
  operation: string;
  result: LogResult;
  duration_ms?: number;
  status_code?: number;
  organization_id?: string | null;
  user_id?: string | null;
  integration_destination?: 'PROMOTORFLOW' | 'PROMOTORCLASS' | null;
  details?: Record<string, unknown>;
  error?: {
    code?: string;
    message: string;
  };
}

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pass(phrase)?$/i,
  /secret/i,
  /token/i,
  /access_?token/i,
  /session_?token/i,
  /cookie/i,
  /set-cookie/i,
  /authorization/i,
  /bearer/i,
  /reflection_?response/i,
  /response_?text/i,
  /reflection_?answer/i,
  /notes/i,
  /private_?notes/i,
  /location_?text/i,
  /database_?url/i,
  /connection_?string/i,
];

/**
 * Redact passwords and credentials from PostgreSQL and HTTP connection strings
 */
export function sanitizeConnectionString(input: string): string {
  if (!input || typeof input !== 'string') return input;
  // Match protocol://user:pass@host:port/db
  return input.replace(
    /((?:postgres|postgresql|http|https):\/\/[^:\s\/]+:)([^@\s\/]+)(@[^\s\/]+)/gi,
    `$1${REDACTED}$3`
  );
}

/**
 * Deep-traverse and redact sensitive keys, tokens, reflection texts, cookies, and connection strings
 */
export function sanitizeForLog<T = unknown>(data: T, depth = 0): T {
  if (depth > 8 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeConnectionString(data) as unknown as T;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLog(item, depth + 1)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

      if (isSensitiveKey) {
        sanitizedObj[key] = REDACTED;
      } else if (typeof value === 'string') {
        sanitizedObj[key] = sanitizeConnectionString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = sanitizeForLog(value, depth + 1);
      } else {
        sanitizedObj[key] = value;
      }
    }
    return sanitizedObj as T;
  }

  return data;
}

/**
 * Format and emit a Cloudflare-native JSON structured log
 */
export function logOperation(entry: StructuredLogEntry): void {
  const timestamp = entry.timestamp || new Date().toISOString();
  const level = entry.level || (entry.result === 'FAILURE' ? 'error' : 'info');

  const sanitizedDetails = entry.details ? (sanitizeForLog(entry.details) as Record<string, unknown>) : undefined;
  const sanitizedError = entry.error
    ? {
        code: entry.error.code,
        message: sanitizeConnectionString(entry.error.message),
      }
    : undefined;

  const payload: Record<string, unknown> = {
    level,
    timestamp,
    operation: entry.operation,
    result: entry.result,
  };

  if (entry.request_id) payload.request_id = entry.request_id;
  if (entry.duration_ms !== undefined) payload.duration_ms = Math.round(entry.duration_ms * 100) / 100;
  if (entry.status_code !== undefined) payload.status_code = entry.status_code;
  if (entry.organization_id) payload.organization_id = entry.organization_id;
  if (entry.user_id) payload.user_id = entry.user_id;
  if (entry.integration_destination) payload.integration_destination = entry.integration_destination;
  if (sanitizedDetails) payload.details = sanitizedDetails;
  if (sanitizedError) payload.error = sanitizedError;

  const jsonString = JSON.stringify(payload);

  if (level === 'error') {
    console.error(jsonString);
  } else if (level === 'warn') {
    console.warn(jsonString);
  } else {
    console.log(jsonString);
  }
}

/**
 * Hono Middleware for structured operational logging with automatic request_id extraction and latency tracking
 */
export function requestLoggerMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = performance.now();
    const requestId =
      c.req.header('cf-ray') ||
      c.req.header('x-request-id') ||
      (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`);

    c.set('requestId' as any, requestId);

    try {
      await next();

      const durationMs = performance.now() - startTime;
      const statusCode = c.res.status;
      const isSuccess = statusCode < 400;

      // Extract auth context if established
      const authCtx = (c.get as any)('authContext');
      const orgId = authCtx?.organization?.organizationId || null;
      const userId = authCtx?.user?.id || null;

      logOperation({
        request_id: requestId,
        operation: `HTTP_${c.req.method}_${c.req.path}`,
        result: isSuccess ? 'SUCCESS' : statusCode < 500 ? 'PARTIAL' : 'FAILURE',
        status_code: statusCode,
        duration_ms: durationMs,
        organization_id: orgId,
        user_id: userId,
        level: isSuccess ? 'info' : statusCode < 500 ? 'warn' : 'error',
      });
    } catch (err: any) {
      const durationMs = performance.now() - startTime;
      const authCtx = (c.get as any)('authContext');
      const orgId = authCtx?.organization?.organizationId || null;
      const userId = authCtx?.user?.id || null;

      logOperation({
        request_id: requestId,
        operation: `HTTP_${c.req.method}_${c.req.path}`,
        result: 'FAILURE',
        status_code: err?.status || 500,
        duration_ms: durationMs,
        organization_id: orgId,
        user_id: userId,
        level: 'error',
        error: {
          code: err?.code || 'INTERNAL_ERROR',
          message: err?.message || 'Unknown server error',
        },
      });

      throw err;
    }
  };
}
