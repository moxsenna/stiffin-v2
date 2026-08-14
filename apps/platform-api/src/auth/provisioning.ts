/**
 * Trusted server-side Promotor User provisioning.
 *
 * Public self-signup is OFF (emailAndPassword.disableSignUp: true). The
 * supported BA server path is the internal adapter (createInternalAdapter),
 * which uses Better Auth's own password hashing (@better-auth/utils/password)
 * and Date writes — never hand-written scrypt, never copied BA hash code.
 *
 * The operation provisions, atomically-ish:
 *   1. Better Auth User (users row)
 *   2. credential Account (BA-owned scrypt hash)
 *   3. Shared Core Organization if needed
 *   4. product_entitlements(false,false) in the same transaction as the org
 *   5. owner membership row
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createInternalAdapter } from 'better-auth/db';
import { hashPassword } from '@better-auth/utils/password';
import { eq } from 'drizzle-orm';
import { users, organizations, organizationMembers, productEntitlements } from '../db/schema';
import { authSchema } from './schema';
import { AuthError } from './errors';

export interface ProvisionPromotorUserInput {
  name: string;
  email: string;
  password: string;
  organizationName?: string;
  organizationSlug?: string;
}

export interface ProvisionedPromotorUser {
  userId: string;
  organizationId?: string;
  membershipId?: string;
}

/**
 * Provisions a Promotor User. When organizationName/slug are provided, also
 * creates the Shared Core organization + product_entitlements(false,false) +
 * owner membership in one transaction (B1 invariant).
 *
 * The credential account is written with BA's own hashed password. Uses a
 * single Drizzle transaction for the org+entitlement+membership trio; the
 * user + account writes use the BA internal adapter (which runs its own
 * hooks/transaction handling).
 */
export async function provisionPromotorUser(
  db: NodePgDatabase,
  input: ProvisionPromotorUserInput
): Promise<ProvisionedPromotorUser> {
  // Canonical users.email is UNIQUE; fail closed on duplicates.
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email.trim().toLowerCase())).limit(1);
  if (existing.length > 0) {
    throw new AuthError('CONFLICT', 'A user with this email already exists');
  }

  // Build the BA internal adapter on the same request-scoped db.
  // drizzleAdapter returns the adapter factory; give it the options so it
  // resolves to the DBAdapter the internal adapter expects.
  const adapterFactory = drizzleAdapter(db, { provider: 'pg', schema: authSchema });
  const options = {
    user: { modelName: 'users' },
    session: { modelName: 'sessions' },
    account: { modelName: 'accounts' },
    verification: { modelName: 'verifications' },
    advanced: { database: { generateId: 'uuid' as const } },
  };
  const adapter = adapterFactory(options as never);
  const internalAdapter = createInternalAdapter(adapter, {
    options: options as never,
    logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} } as never,
    hooks: [],
    generateId: (() => crypto.randomUUID()) as never,
  });

  const passwordHash = await hashPassword(input.password);

  // 1 + 2: user + credential account via BA-owned internal adapter.
  const user = await internalAdapter.createUser({
    name: input.name,
    email: input.email.trim().toLowerCase(),
    emailVerified: true,
    image: null,
  });
  await internalAdapter.createAccount({
    userId: user.id,
    accountId: user.id,
    providerId: 'credential',
    password: passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  let organizationId: string | undefined;
  let membershipId: string | undefined;

  if (input.organizationName && input.organizationSlug) {
    const txResult = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({ name: input.organizationName!, slug: input.organizationSlug! })
        .returning();
      await tx.insert(productEntitlements).values({ organizationId: org.id, promotorClass: false, promotorFlow: false });
      const [member] = await tx
        .insert(organizationMembers)
        .values({ organizationId: org.id, userId: user.id, role: 'owner' })
        .returning();
      return { orgId: org.id, memberId: member.id };
    });
    organizationId = txResult.orgId;
    membershipId = txResult.memberId;
  }

  return { userId: user.id, organizationId, membershipId };
}
