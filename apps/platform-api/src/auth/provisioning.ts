/**
 * Trusted server-side Promotor User provisioning.
 *
 * Public self-signup is OFF (emailAndPassword.disableSignUp: true). The
 * supported BA server path is the internal adapter (createInternalAdapter),
 * which uses Better Auth's own password hashing (@better-auth/utils/password)
 * and Date writes — never hand-written scrypt, never copied BA hash code.
 *
 * All-or-nothing semantics: when an organization is requested, the operation
 * produces User + credential Account + Organization + product_entitlements
 * (false,false) + owner Membership inside ONE Drizzle transaction. Any failure
 * rolls back everything — no orphaned User/Account.
 *
 * Organization creation reuses the canonical Shared Core primitive
 * (createOrganizationInTx) so Shared Core owns org lifecycle + entitlement
 * provisioning (frozen recon §3).
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createInternalAdapter } from 'better-auth/db';
import { hashPassword } from '@better-auth/utils/password';
import { eq } from 'drizzle-orm';
import { users, organizationMembers } from '../db/schema';
import { authSchema } from './schema';
import { AuthError } from './errors';
import { createOrganizationInTx } from '../services/organization-service';
import { isUniqueViolation } from '../db/pg-errors';

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
 * owner membership in the same transaction (B1 invariant).
 *
 * The credential account is written with BA's own hashed password. The whole
 * operation (user + account + org + entitlement + membership) runs in ONE
 * Drizzle transaction; a failure rolls everything back.
 */
export async function provisionPromotorUser(
  db: NodePgDatabase,
  input: ProvisionPromotorUserInput
): Promise<ProvisionedPromotorUser> {
  const email = input.email.trim().toLowerCase();

  // Canonical users.email is UNIQUE; fail closed on duplicates.
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new AuthError('CONFLICT', 'A user with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const adapterFactory = drizzleAdapter(tx, { provider: 'pg', schema: authSchema });
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

    const user = await internalAdapter.createUser({
      name: input.name,
      email,
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
      let org;
      try {
        org = await createOrganizationInTx(tx, {
          name: input.organizationName,
          slug: input.organizationSlug,
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          // Canonical CONFLICT semantics — the tx rolls back user+account too.
          throw new AuthError('CONFLICT', `Organization slug already exists: "${input.organizationSlug}"`);
        }
        throw err;
      }
      const [member] = await tx
        .insert(organizationMembers)
        .values({ organizationId: org.id, userId: user.id, role: 'owner' })
        .returning();
      organizationId = org.id;
      membershipId = member.id;
    }

    return { userId: user.id, organizationId, membershipId };
  });
}
