/**
 * Phase D — authorization middlewares.
 *
 * Canonical chain: authenticated session → fresh membership → OrganizationContext
 * → product entitlement → role/domain permission.
 *
 * Never trust organizationId/role/entitlement from body, query, or headers.
 */
import { createMiddleware } from 'hono/factory';
import type { MiddlewareHandler } from 'hono';
import type { AuthContext, AuthEntitlements } from './types';
import type { OrganizationRole } from '../db/schema';
import { AuthError } from './errors';

export type AuthzVariables = { authContext: AuthContext | null };

type AuthzEnv = { Variables: AuthzVariables };

function requireContext(c: { get: (k: 'authContext') => AuthContext | null }): AuthContext {
  const ctx = c.get('authContext');
  if (!ctx) {
    throw new AuthError('UNAUTHORIZED', 'Authentication required');
  }
  return ctx;
}

/**
 * Requires a resolved organization + actor (fresh membership). Missing/ambiguous
 * org → 403 ORG_CONTEXT_REQUIRED; stale/invalid hint → 403 ORG_CONTEXT_INVALID.
 */
export function requireOrganization(): MiddlewareHandler<AuthzEnv> {
  return createMiddleware<AuthzEnv>(async (c, next) => {
    const ctx = requireContext(c);
    if (!ctx.actor || !ctx.organization) {
      throw new AuthError('ORG_CONTEXT_REQUIRED', 'An active organization context is required');
    }
    await next();
  });
}

/**
 * Requires the product entitlement. Missing entitlement row or false value → deny.
 */
export function requireEntitlement(product: keyof AuthEntitlements): MiddlewareHandler<AuthzEnv> {
  return createMiddleware<AuthzEnv>(async (c, next) => {
    const ctx = requireContext(c);
    if (!ctx.entitlements) {
      throw new AuthError('ENTITLEMENT_DENIED', 'Product entitlement is not provisioned');
    }
    if (!ctx.entitlements[product]) {
      throw new AuthError('ENTITLEMENT_DENIED', 'Product is not entitled for this organization');
    }
    await next();
  });
}

/**
 * Requires one of the given canonical single roles. Role is always the
 * server-resolved canonical role — never browser input.
 */
export function requireRole(roles: OrganizationRole[]): MiddlewareHandler<AuthzEnv> {
  return createMiddleware<AuthzEnv>(async (c, next) => {
    const ctx = requireContext(c);
    if (!ctx.actor) {
      throw new AuthError('FORBIDDEN', 'Role check requires an active organization context');
    }
    if (!roles.includes(ctx.actor.role)) {
      throw new AuthError('FORBIDDEN', 'Insufficient role');
    }
    await next();
  });
}
