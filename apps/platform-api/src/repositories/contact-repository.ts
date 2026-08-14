import { eq, and, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { contacts, ContactRow, NewContactRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';

export interface MatchOrCreateContactInput {
  context: OrganizationContext;
  name: string;
  /** Raw phone input — normalized via platform-core before persistence. */
  phoneRaw?: string;
  email?: string;
}

export interface ContactRepository {
  matchOrCreate(input: MatchOrCreateContactInput): Promise<ContactRow>;
  findByPhone(context: OrganizationContext, phoneE164: string): Promise<ContactRow | null>;
  findById(context: OrganizationContext, id: string): Promise<ContactRow | null>;
  listActive(context: OrganizationContext): Promise<ContactRow[]>;
  softDelete(context: OrganizationContext, id: string): Promise<void>;
  restore(context: OrganizationContext, id: string): Promise<ContactRow | null>;
  updateIdentity(
    context: OrganizationContext,
    id: string,
    patch: { name?: string; email?: string | null }
  ): Promise<ContactRow | null>;
}

/**
 * Contact repository. Every method is organization-scoped: the WHERE clause
 * always includes organization_id from the server-resolved context, so tenant
 * data can never leak across organizations.
 *
 * Phone normalization happens BEFORE persistence (service layer), so the DB
 * uniqueness constraint always operates on the canonical E.164 value.
 */
export function createContactRepository(
  db: NodePgDatabase,
  normalizePhoneFn: (raw: string) => string
): ContactRepository {
  return {
    async matchOrCreate(input) {
      if (!isOrganizationContext(input.context)) {
        throw new Error('Tenant context is required');
      }
      const name = input.name.trim();
      if (!name) throw new Error('Contact name cannot be empty');

      const phoneE164 = input.phoneRaw ? normalizePhoneFn(input.phoneRaw) : null;
      const email = input.email?.trim() || null;

      return db.transaction(async (tx) => {
        // 1. Match existing (INCLUDING soft-deleted — phone stays reserved).
        if (phoneE164) {
          const existing = await tx
            .select()
            .from(contacts)
            .where(
              and(eq(contacts.organizationId, input.context.organizationId), eq(contacts.phoneE164, phoneE164))
            )
            .limit(1);
          if (existing[0]) {
            // Restore soft-deleted contact, preserving canonical contact_id.
            if (existing[0].deletedAt) {
              const restored = await tx
                .update(contacts)
                .set({ deletedAt: null, updatedAt: new Date().toISOString() })
                .where(eq(contacts.id, existing[0].id))
                .returning();
              return restored[0];
            }
            return existing[0];
          }
        }

        // 2. Email fallback match (active rows only).
        if (email) {
          const byEmail = await tx
            .select()
            .from(contacts)
            .where(
              and(
                eq(contacts.organizationId, input.context.organizationId),
                eq(contacts.email, email),
                isNull(contacts.deletedAt)
              )
            )
            .limit(1);
          if (byEmail[0]) return byEmail[0];
        }

        // 3. Insert with ON CONFLICT DO NOTHING; the DB unique index is the
        //    final duplicate protection under concurrent requests.
        const row: NewContactRow = {
          organizationId: input.context.organizationId,
          name,
          phoneE164,
          email,
        };
        let inserted: ContactRow[];
        if (phoneE164) {
          inserted = await tx
            .insert(contacts)
            .values(row)
            .onConflictDoNothing({
              target: [contacts.organizationId, contacts.phoneE164],
              where: sql`${contacts.phoneE164} IS NOT NULL`,
            })
            .returning();
        } else {
          inserted = await tx.insert(contacts).values(row).returning();
        }
        if (inserted[0]) return inserted[0];

        // 4. Lost the race — re-select the winner (only possible when phone exists).
        if (!phoneE164) {
          throw new Error('Contact insert failed unexpectedly');
        }
        const winner = await tx
          .select()
          .from(contacts)
          .where(
            and(eq(contacts.organizationId, input.context.organizationId), eq(contacts.phoneE164, phoneE164))
          )
          .limit(1);
        if (!winner[0]) {
          throw new Error('Contact insert failed unexpectedly');
        }
        return winner[0];
      });
    },

    async findByPhone(context, phoneE164) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.organizationId, context.organizationId), eq(contacts.phoneE164, phoneE164)))
        .limit(1);
      return rows[0] ?? null;
    },

    async findById(context, id) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .select()
        .from(contacts)
        .where(
          and(eq(contacts.organizationId, context.organizationId), eq(contacts.id, id), isNull(contacts.deletedAt))
        )
        .limit(1);
      return rows[0] ?? null;
    },

    async listActive(context) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      return db
        .select()
        .from(contacts)
        .where(and(eq(contacts.organizationId, context.organizationId), isNull(contacts.deletedAt)))
        .orderBy(contacts.createdAt);
    },

    async softDelete(context, id) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      await db
        .update(contacts)
        .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .where(and(eq(contacts.organizationId, context.organizationId), eq(contacts.id, id)));
    },

    async restore(context, id) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      const rows = await db
        .update(contacts)
        .set({ deletedAt: null, updatedAt: new Date().toISOString() })
        .where(and(eq(contacts.organizationId, context.organizationId), eq(contacts.id, id)))
        .returning();
      return rows[0] ?? null;
    },

    async updateIdentity(context, id, patch) {
      if (!isOrganizationContext(context)) {
        throw new Error('Tenant context is required');
      }
      const set: Record<string, string | null> = { updatedAt: new Date().toISOString() };
      if (patch.name !== undefined) {
        const name = patch.name.trim();
        if (!name) throw new Error('Contact name cannot be empty');
        set.name = name;
      }
      if (patch.email !== undefined) set.email = patch.email?.trim() || null;
      const rows = await db
        .update(contacts)
        .set(set)
        .where(and(eq(contacts.organizationId, context.organizationId), eq(contacts.id, id)))
        .returning();
      return rows[0] ?? null;
    },
  };
}
