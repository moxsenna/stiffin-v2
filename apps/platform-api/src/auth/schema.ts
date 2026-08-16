/**
 * Canonical Drizzle schema mapping for the Better Auth Drizzle adapter.
 *
 * The adapter resolves a model by the name BA looks up. Our canonical tables
 * are plural (users/sessions/...), and BA's own model names are configured via
 * `user.modelName` etc. so the adapter looks up the plural key. Field names:
 * BA internally queries by the DB column names (user_id), but Drizzle exposes
 * the property names (userId); the `fields` map bridges BA field -> Drizzle
 * property.
 */
import {
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  organizationMembers,
  organizationInvitations,
  authRateLimits,
} from '../db/schema';

export const authSchema = {
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  organization_members: organizationMembers,
  organization_invitations: organizationInvitations,
  auth_rate_limits: authRateLimits,
};

export const MODEL_NAMES = {
  user: 'users',
  session: 'sessions',
  account: 'accounts',
  verification: 'verifications',
  organization: 'organizations',
  member: 'organization_members',
  invitation: 'organization_invitations',
  rateLimit: 'auth_rate_limits',
} as const;

export const FIELD_MAPS = {
  session: {
    userId: 'userId',
    expiresAt: 'expiresAt',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
  },
  account: {
    userId: 'userId',
    accountId: 'accountId',
    providerId: 'providerId',
  },
  verification: {
    identifier: 'identifier',
    value: 'value',
    expiresAt: 'expiresAt',
  },
} as const;
