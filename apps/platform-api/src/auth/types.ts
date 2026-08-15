/**
 * Auth-specific types. Tenant context (OrganizationContext) stays the frozen
 * B1 minimal shape — it must not become an auth/session DTO.
 */
import type { OrganizationRole } from '../db/schema';

/** Frozen B1 tenant context — never extended. */
export type { OrganizationContext } from '../core/organization-context';

/**
 * The authenticated principal within a resolved organization.
 * Separated from OrganizationContext (tenant) on purpose.
 */
export interface AuthenticatedActor {
  userId: string;
  membershipId: string;
  role: OrganizationRole;
}

export interface AuthEntitlements {
  promotorClass: boolean;
  promotorFlow: boolean;
}

/**
 * The full server-resolved authentication context for a request.
 */
export interface AuthContext {
  actor: AuthenticatedActor | null;
  organization: { organizationId: string } | null;
  entitlements: AuthEntitlements | null;
  /** Safe canonical user fields, server-resolved (never placeholder data). */
  user: {
    id: string;
    name: string;
    email: string;
  };
  /** Safe canonical org display fields when an org is resolved. */
  organizationDetail: { name: string; slug: string } | null;
  session: {
    userId: string;
    token: string;
    expiresAt: Date;
    activeOrganizationId?: string | null;
  };
}

export type { OrganizationRole };
