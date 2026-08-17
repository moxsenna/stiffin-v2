import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql } from 'drizzle-orm';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb, withRuntimeSql, withOwnerSql, pgErrorCode } from './test-env';
import { createOrganizationRepository } from '../../repositories/organization-repository';
import { createContactRepository } from '../../repositories/contact-repository';
import { createMembershipRepository } from '../../repositories/membership-repository';
import { createEntitlementRepository } from '../../repositories/entitlement-repository';
import { createOrganizationService } from '../../services/organization-service';
import { createContactService } from '../../services/contact-service';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { ContactSchema } from '@promotor/contracts';
import {
  organizations,
  contacts,
  organizationMembers,
  productEntitlements,
  users,
} from '../../db/schema';
import { eq, count } from 'drizzle-orm';

const enabled = Boolean(TEST_DATABASE_URL);

/** Asserts a Drizzle statement rejects with a specific PostgreSQL error code. */
async function rejectsWithCode<T>(fn: () => Promise<T>, code: string | string[], message: string): Promise<void> {
  await assert.rejects(
    fn,
    (err: unknown) => {
      const actualCode = pgErrorCode(err);
      if (Array.isArray(code)) {
        assert.ok(actualCode && code.includes(actualCode), `${message}: expected one of [${code.join(', ')}], got ${actualCode}`);
      } else {
        assert.strictEqual(actualCode, code, message);
      }
      return true;
    },
    message
  );
}

describe('B1 — Shared Core PostgreSQL integration', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  before(async () => {
    await applyMigrationsAsOwner();
  });

  it('schema: all five B1 tables exist', async () => {
    await withIntegrationDb(async (db) => {
      for (const table of ['organizations', 'users', 'organization_members', 'contacts', 'product_entitlements']) {
        const res = await db.execute(sql`SELECT to_regclass(${`public.${table}`}) AS t`);
        assert.ok((res.rows[0] as { t: string }).t, `${table} must exist`);
      }
    });
  });

  it('contact contract: DB rejects NULL phone_e164 (frozen contract requires phone)', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Null Phone Org', slug: `nullphone-${Date.now()}` });
      await rejectsWithCode(
        async () => {
          await db.insert(contacts).values({ organizationId: org.id, name: 'No Phone', phoneE164: null as unknown as string });
        },
        '23502',
        'phone_e164 must be NOT NULL'
      );
    });
  });

  it('contact contract: service rejects missing phoneRaw', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Svc Phone Org', slug: `svcphone-${Date.now()}` });
      const service = createContactService(db);
      await assert.rejects(
        async () => {
          await service.matchOrCreateContact({
            context: { organizationId: org.id },
            name: 'Tanpa Nomor',
            // @ts-expect-error phoneRaw missing by design
            phoneRaw: undefined,
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.strictEqual((err as { code?: string }).code, 'VALIDATION_ERROR');
          return true;
        },
        'missing phoneRaw must raise VALIDATION_ERROR'
      );
    });
  });

  it('contact contract: every B1 contact satisfies frozen ContactSchema', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Schema Org', slug: `schema-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
      const row = await contactRepo.matchOrCreate({
        context: { organizationId: org.id },
        name: 'Ayu',
        phoneRaw: '081298887777',
        email: 'Ayu@Example.com',
      });
      const parsed = ContactSchema.safeParse({
        id: row.id,
        organizationId: row.organizationId,
        name: row.name,
        phoneE164: row.phoneE164,
        createdAt: row.createdAt,
      });
      assert.ok(parsed.success, 'B1 contact row must satisfy the frozen ContactSchema');
    });
  });

  it('email fallback: case-insensitive normalized email matches same contact', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Email Org', slug: `email-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
      const first = await contactRepo.matchOrCreate({
        context: { organizationId: org.id },
        name: 'Ayu',
        phoneRaw: '081299990001',
        email: 'Ayu@Example.com',
      });
      const second = await contactRepo.matchOrCreate({
        context: { organizationId: org.id },
        name: 'Ayu Lain',
        phoneRaw: '081299990002',
        email: 'ayu@example.com',
      });
      assert.strictEqual(first.id, second.id, 'normalized-email fallback must reuse canonical contact_id');
    });
  });

  it('tenant: same phone may exist in two organizations (policy: allowed)', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const a = await orgRepo.create({ name: 'Org A', slug: `org-a-${Date.now()}` });
      const b = await orgRepo.create({ name: 'Org B', slug: `org-b-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);

      const ca = await contactRepo.matchOrCreate({ context: { organizationId: a.id }, name: 'Ayu', phoneRaw: '081212345678' });
      const cb = await contactRepo.matchOrCreate({ context: { organizationId: b.id }, name: 'Ayu', phoneRaw: '081212345678' });

      assert.notStrictEqual(ca.id, cb.id, 'same phone in different orgs must yield distinct contacts');
    });
  });

  it('contact identity: duplicate phone in same org reuses the same contact_id', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Dup Org', slug: `dup-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);

      const first = await contactRepo.matchOrCreate({ context: { organizationId: org.id }, name: 'Budi', phoneRaw: '628123456780' });
      const second = await contactRepo.matchOrCreate({ context: { organizationId: org.id }, name: 'Budi Renamed', phoneRaw: '+62 812-3456-780' });
      assert.strictEqual(first.id, second.id, 'one person = one contact_id per organization');
    });
  });

  it('soft-delete: active queries hide deleted contact, matchOrCreate restores same contact_id', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Restore Org', slug: `restore-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
      const ctx = { organizationId: org.id };

      const created = await contactRepo.matchOrCreate({ context: ctx, name: 'Citra', phoneRaw: '081234567890' });
      await contactRepo.softDelete(ctx, created.id);

      // Active queries must not expose the deleted contact.
      assert.strictEqual(await contactRepo.findById(ctx, created.id), null, 'findById must be active-only');
      assert.strictEqual(await contactRepo.findByPhone(ctx, '+6281234567890'), null, 'findByPhone must be active-only');
      assert.strictEqual(
        await contactRepo.updateIdentity(ctx, created.id, { name: 'HACKED' }),
        null,
        'updateIdentity must not touch deleted contacts'
      );

      // matchOrCreate restores the canonical contact_id.
      const restored = await contactRepo.matchOrCreate({ context: ctx, name: 'Citra Baru', phoneRaw: '0812 3456 7890' });
      assert.strictEqual(restored.id, created.id, 'restore must preserve canonical contact_id');
      assert.strictEqual(restored.deletedAt, null);
    });
  });

  it('constraint: invalid phone_e164 is rejected by the DB CHECK', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Phone Check Org', slug: `phonechk-${Date.now()}` });
      await assert.rejects(async () => {
        await db.insert(contacts).values({ organizationId: org.id, name: 'Bad Phone', phoneE164: '0812-not-e164' });
      });
    });
  });

  it('constraint: invalid organization slug is rejected by the DB CHECK', async () => {
    await withIntegrationDb(async (db) => {
      await assert.rejects(async () => {
        await db.insert(organizations).values({ name: 'Bad Slug', slug: 'BAD SLUG!' });
      });
    });
  });

  it('constraint: role CHECK rejects unknown roles', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Role Org', slug: `role-${Date.now()}` });
      const [user] = await db
        .insert(users)
        .values({ name: 'Test User', email: `role-${Date.now()}@example.com` })
        .returning();
      await assert.rejects(async () => {
        await db.insert(organizationMembers).values({ organizationId: org.id, userId: user.id, role: 'superadmin' });
      });
    });
  });

  it('membership: unique (organization_id, user_id)', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Membership Org', slug: `member-${Date.now()}` });
      const [user] = await db
        .insert(users)
        .values({ name: 'Owner User', email: `member-${Date.now()}@example.com` })
        .returning();
      const repo = createMembershipRepository(db);
      const ctx = { organizationId: org.id };

      await repo.addMember({ context: ctx, userId: user.id, role: 'owner' });
      await assert.rejects(async () => {
        await repo.addMember({ context: ctx, userId: user.id, role: 'admin' });
      });
    });
  });

  it('users stub: email is required and unique (B2 compatibility)', async () => {
    await withIntegrationDb(async (db) => {
      // NOT NULL is enforced at the DB level; bypass the type system with raw SQL.
      await rejectsWithCode(
        async () => {
          await db.execute(sql`INSERT INTO users (name) VALUES ('No Email')`);
        },
        '23502',
        'users.email must be NOT NULL'
      );
      const email = `unique-${Date.now()}@example.com`;
      await db.insert(users).values({ name: 'First', email });
      await rejectsWithCode(
        async () => {
          await db.insert(users).values({ name: 'Second', email });
        },
        '23505',
        'users.email must be unique'
      );
    });
  });

  it('tenant isolation: org B context cannot read org A contact', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const a = await orgRepo.create({ name: 'Iso A', slug: `iso-a-${Date.now()}` });
      const b = await orgRepo.create({ name: 'Iso B', slug: `iso-b-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);

      const ca = await contactRepo.matchOrCreate({ context: { organizationId: a.id }, name: 'Dina', phoneRaw: '081298765432' });

      const crossRead = await contactRepo.findById({ organizationId: b.id }, ca.id);
      assert.strictEqual(crossRead, null, 'org B must not read org A contact');

      await contactRepo.softDelete({ organizationId: b.id }, ca.id);
      const stillThere = await contactRepo.findById({ organizationId: a.id }, ca.id);
      assert.ok(stillThere, 'org B soft-delete must not affect org A contact');
    });
  });

  it('tenant isolation: org B context cannot update org A contact', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const a = await orgRepo.create({ name: 'Upd A', slug: `upd-a-${Date.now()}` });
      const b = await orgRepo.create({ name: 'Upd B', slug: `upd-b-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);

      const ca = await contactRepo.matchOrCreate({ context: { organizationId: a.id }, name: 'Eka', phoneRaw: '081299887766' });
      const crossUpdate = await contactRepo.updateIdentity({ organizationId: b.id }, ca.id, { name: 'HACKED' });
      assert.strictEqual(crossUpdate, null, 'org B update must affect 0 rows');

      const pristine = await contactRepo.findById({ organizationId: a.id }, ca.id);
      assert.strictEqual(pristine?.name, 'Eka', 'org A contact must remain untouched');
    });
  });

  it('entitlements: canonical org creation provisions false/false in one transaction', async () => {
    await withIntegrationDb(async (db) => {
      const service = createOrganizationService(db);
      const org = await service.createOrganization({ name: 'Provisioned Org', slug: `provisioned-${Date.now()}` });
      const entRepo = createEntitlementRepository(db);
      const row = await entRepo.getForOrg({ organizationId: org.id });
      assert.ok(row, 'organization creation must provision an entitlement row');
      assert.strictEqual(row.promotorClass, false);
      assert.strictEqual(row.promotorFlow, false);
    });
  });

  it('entitlements: deny-all when row missing, 1:1 unique when present', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Ent Org', slug: `ent-${Date.now()}` });
      const entRepo = createEntitlementRepository(db);
      const ctx = { organizationId: org.id };

      const none = await entRepo.getForOrg(ctx);
      assert.strictEqual(none, null, 'raw repository path has no row until provisioned — service layer treats missing as deny-all');

      const classOnly = await entRepo.upsert({ context: ctx, promotorClass: true, promotorFlow: false });
      assert.deepStrictEqual(
        { promotorClass: classOnly.promotorClass, promotorFlow: classOnly.promotorFlow },
        { promotorClass: true, promotorFlow: false }
      );

      const switched = await entRepo.upsert({ context: ctx, promotorClass: false, promotorFlow: true });
      assert.strictEqual(switched.promotorClass, false);
      assert.strictEqual(switched.promotorFlow, true);

      await rejectsWithCode(
        async () => {
          await db.insert(productEntitlements).values({ organizationId: org.id, promotorClass: true, promotorFlow: true });
        },
        '23505',
        'second entitlement row per org must violate unique constraint'
      );
    });
  });

  it('FK behavior: hard delete organization WITH contact is RESTRICTed', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'FK Restrict Org', slug: `fk-restrict-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone, normalizeEmail);
      await contactRepo.matchOrCreate({ context: { organizationId: org.id }, name: 'Kept', phoneRaw: '081211112222' });
      await rejectsWithCode(
        async () => {
          await db.delete(organizations).where(eq(organizations.id, org.id));
        },
        ['23503', '23001'],
        'hard delete org with contact must be rejected (RESTRICT)'
      );
    });
  });

  it('FK behavior: hard delete organization WITHOUT contacts cascades memberships + entitlements', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'FK Cascade Org', slug: `fk-cascade-${Date.now()}` });
      const [user] = await db
        .insert(users)
        .values({ name: 'Cascade User', email: `cascade-${Date.now()}@example.com` })
        .returning();
      const memberRepo = createMembershipRepository(db);
      await memberRepo.addMember({ context: { organizationId: org.id }, userId: user.id, role: 'owner' });
      await db.insert(productEntitlements).values({ organizationId: org.id, promotorClass: true, promotorFlow: false });

      await db.delete(organizations).where(eq(organizations.id, org.id));

      const members = await db
        .select({ c: count() })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, org.id));
      assert.strictEqual(Number(members[0].c), 0, 'memberships must cascade on org hard delete');

      const entitlements = await db
        .select({ c: count() })
        .from(productEntitlements)
        .where(eq(productEntitlements.organizationId, org.id));
      assert.strictEqual(Number(entitlements[0].c), 0, 'entitlements must cascade on org hard delete');
    });
  });

  it('FK behavior: hard delete user cascades organization_members', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'FK User Org', slug: `fk-user-${Date.now()}` });
      const [user] = await db
        .insert(users)
        .values({ name: 'Doomed User', email: `doomed-${Date.now()}@example.com` })
        .returning();
      const memberRepo = createMembershipRepository(db);
      await memberRepo.addMember({ context: { organizationId: org.id }, userId: user.id, role: 'member' });

      await db.delete(users).where(eq(users.id, user.id));

      const members = await db
        .select({ c: count() })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, user.id));
      assert.strictEqual(Number(members[0].c), 0, 'memberships must cascade on user hard delete');
    });
  });

  it('least privilege: promotor_runtime cannot execute DDL (CREATE TABLE)', async () => {
    await withRuntimeSql(async (client) => {
      await assert.rejects(async () => {
        await client.query(`CREATE TABLE b1_should_fail (id uuid PRIMARY KEY)`);
      });
    });
  });

  it('least privilege: promotor_runtime can perform intended CRUD', async () => {
    await withRuntimeSql(async (client) => {
      const insert = await client.query(
        `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
        ['Runtime Org', `runtime-${Date.now()}`]
      );
      const id = insert.rows[0].id;
      const read = await client.query(`SELECT name FROM organizations WHERE id = $1`, [id]);
      assert.strictEqual(read.rows[0].name, 'Runtime Org');
      const update = await client.query(`UPDATE organizations SET name = $1 WHERE id = $2 RETURNING name`, ['Runtime Org 2', id]);
      assert.strictEqual(update.rows[0].name, 'Runtime Org 2');
      await client.query(`DELETE FROM organizations WHERE id = $1`, [id]);
    });
  });

  it('migration reproducibility: journal contains the B1 migration', async () => {
    await withOwnerSql(async (client) => {
      const res = await client.query(`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`);
      assert.ok(res.rows.length >= 1, 'at least one applied migration expected');
    });
  });
});
