/**
 * Authoritative OrganizationContext resolver.
 *
 * session.activeOrganizationId is a HINT, never authorization proof. The
 * resolver performs a fresh canonical membership read on every request and
 * joins organizations with deleted_at IS NULL.
 *
 * Rules (frozen recon §5):
 * - 0 memberships -> organization null
 * - 1 membership, no hint -> deterministic single-org resolution
 * - >1 memberships, no hint -> organization null (client must select)
 * - stale/removed hint -> fail closed (ORG_CONTEXT_INVALID)
 * - missing entitlement row -> deny-all representation (null)
 * - forged org id in body/query/header -> ignored (never read)
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users, organizations, organizationMembers, productEntitlements, OrganizationRole } from '../db/schema';
import type { AuthContext, AuthenticatedActor, AuthEntitlements } from './types';
import { AuthError } from './errors';

export interface ResolveSessionInput {
  userId: string;
  sessionToken: string;
  expiresAt: Date;
  activeOrganizationId?: string | null;
}

export interface EntitlementsForOrg {
  getForOrg(organizationId: string): Promise<AuthEntitlements | null>;
}

export async function resolveAuthContext(
  db: NodePgDatabase,
  session: ResolveSessionInput,
  entitlements: EntitlementsForOrg
): Promise<AuthContext> {
  // Soft-deleted canonical user must fail closed. Also carry safe canonical
  // user fields (id/name/email) for the authenticated context — never placeholders.
  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (userRows.length === 0 || userRows[0].deletedAt !== null) {
    throw new AuthError('UNAUTHORIZED', 'User is not active');
  }
  const safeUser = { id: userRows[0].id, name: userRows[0].name, email: userRows[0].email };

  let actor: AuthenticatedActor | null = null;
  let organizationId: string | null = null;
  let organizationDetail: { name: string; slug: string } | null = null;

  if (session.activeOrganizationId) {
    // Hint set: resolve ONLY if a live membership exists for a non-deleted org.
    const members = await db
      .select({
        membershipId: organizationMembers.id,
        role: organizationMembers.role,
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(organizationMembers)
      .innerJoin(organizations, and(eq(organizations.id, organizationMembers.organizationId), isNull(organizations.deletedAt)))
      .where(
        and(
          eq(organizationMembers.userId, session.userId),
          eq(organizationMembers.organizationId, session.activeOrganizationId)
        )
      )
      .limit(1);
    if (members.length === 0) {
      throw new AuthError('ORG_CONTEXT_INVALID', 'Selected organization is not valid for this user');
    }
    actor = { userId: session.userId, membershipId: members[0].membershipId, role: members[0].role as OrganizationRole };
    organizationId = members[0].orgId;
    organizationDetail = { name: members[0].orgName, slug: members[0].orgSlug };
  } else {
    // No hint: count active memberships (non-deleted orgs only).
    const memberships = await db
      .select({
        membershipId: organizationMembers.id,
        role: organizationMembers.role,
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
      })
      .from(organizationMembers)
      .innerJoin(organizations, and(eq(organizations.id, organizationMembers.organizationId), isNull(organizations.deletedAt)))
      .where(eq(organizationMembers.userId, session.userId));
    if (memberships.length === 1) {
      actor = { userId: session.userId, membershipId: memberships[0].membershipId, role: memberships[0].role as OrganizationRole };
      organizationId = memberships[0].orgId;
      organizationDetail = { name: memberships[0].orgName, slug: memberships[0].orgSlug };
    } else if (memberships.length > 1) {
      // Ambiguous: no deterministic selection. organization stays null.
      actor = null;
      organizationId = null;
    } else {
      actor = null;
      organizationId = null;
    }
  }

  let orgEntitlements: AuthEntitlements | null = null;
  if (organizationId) {
    orgEntitlements = await entitlements.getForOrg(organizationId);
    // Missing entitlement row -> deny-all representation (null) is already the
    // returned shape; the entitlement middleware (Phase D) will deny.
  }

  return {
    actor,
    organization: organizationId ? { organizationId } : null,
    entitlements: orgEntitlements,
    user: safeUser,
    organizationDetail,
    session: {
      userId: session.userId,
      token: session.sessionToken,
      expiresAt: session.expiresAt,
      activeOrganizationId: session.activeOrganizationId ?? null,
    },
  } satisfies AuthContext;
}

/** Entitlement read through the canonical table. */
export function createEntitlementsForOrg(db: NodePgDatabase): EntitlementsForOrg {
  return {
    async getForOrg(organizationId) {
      const rows = await db
        .select({ promotorClass: productEntitlements.promotorClass, promotorFlow: productEntitlements.promotorFlow })
        .from(productEntitlements)
        .where(eq(productEntitlements.organizationId, organizationId))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}

export const authContextSql = sql;
