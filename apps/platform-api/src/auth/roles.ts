/**
 * Single-role policy (frozen). Canonical roles are exactly owner/admin/member.
 * No arrays, no comma-separated multi-role values, no unknown strings.
 */
import { ORGANIZATION_ROLES, OrganizationRole } from '../db/schema';
import { AuthError } from './errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Canonical UUID check — must pass BEFORE any value is used in a PostgreSQL
 * UUID column predicate. Malformed values must never reach the DB.
 */
export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isCanonicalRole(value: string): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}

/**
 * Validates a membership role value. Rejects: "owner,admin", ["owner","admin"],
 * unknown strings, and empty roles.
 */
export function assertSingleRole(role: unknown, context: string): OrganizationRole {
  if (typeof role !== 'string') {
    throw new AuthError('VALIDATION_ERROR', `Role must be a single string in ${context}`);
  }
  const trimmed = role.trim();
  if (trimmed.length === 0) {
    throw new AuthError('VALIDATION_ERROR', `Role must not be empty in ${context}`);
  }
  if (trimmed.includes(',')) {
    throw new AuthError('VALIDATION_ERROR', `Multi-role values are not supported in ${context}`);
  }
  if (!isCanonicalRole(trimmed)) {
    throw new AuthError('VALIDATION_ERROR', `Unknown role "${trimmed}" in ${context}`);
  }
  return trimmed;
}
