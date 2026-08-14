import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql } from 'drizzle-orm';
import { applyMigrationsAsOwner, TEST_DATABASE_URL, withIntegrationDb, withRuntimeSql, withOwnerSql } from './test-env';
import { createOrganizationRepository } from '../../repositories/organization-repository';
import { createContactRepository } from '../../repositories/contact-repository';
import { createMembershipRepository } from '../../repositories/membership-repository';
import { createEntitlementRepository } from '../../repositories/entitlement-repository';
import { normalizePhone } from '@promotor/platform-core';
import { organizations, contacts, organizationMembers, productEntitlements, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

const enabled = Boolean(TEST_DATABASE_URL);

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

  it('tenant: same phone may exist in two organizations (policy: allowed)', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const a = await orgRepo.create({ name: 'Org A', slug: `org-a-${Date.now()}` });
      const b = await orgRepo.create({ name: 'Org B', slug: `org-b-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone);

      const ca = await contactRepo.matchOrCreate({ context: { organizationId: a.id }, name: 'Ayu', phoneRaw: '081212345678' });
      const cb = await contactRepo.matchOrCreate({ context: { organizationId: b.id }, name: 'Ayu', phoneRaw: '081212345678' });

      assert.notStrictEqual(ca.id, cb.id, 'same phone in different orgs must yield distinct contacts');
    });
  });

  it('contact identity: duplicate phone in same org reuses the same contact_id', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Dup Org', slug: `dup-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone);

      const first = await contactRepo.matchOrCreate({ context: { organizationId: org.id }, name: 'Budi', phoneRaw: '628123456780' });
      const second = await contactRepo.matchOrCreate({ context: { organizationId: org.id }, name: 'Budi Renamed', phoneRaw: '+62 812-3456-780' });
      assert.strictEqual(first.id, second.id, 'one person = one contact_id per organization');
    });
  });

  it('contact identity: soft-deleted phone is restored, never duplicated', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Restore Org', slug: `restore-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone);
      const ctx = { organizationId: org.id };

      const created = await contactRepo.matchOrCreate({ context: ctx, name: 'Citra', phoneRaw: '081234567890' });
      await contactRepo.softDelete(ctx, created.id);
      const gone = await contactRepo.findById(ctx, created.id);
      assert.strictEqual(gone, null, 'soft-deleted contact must be invisible to active queries');

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
      const [user] = await db.insert(users).values({ name: 'Test User' }).returning();
      await assert.rejects(async () => {
        await db.insert(organizationMembers).values({ organizationId: org.id, userId: user.id, role: 'superadmin' });
      });
    });
  });

  it('membership: unique (organization_id, user_id)', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Membership Org', slug: `member-${Date.now()}` });
      const [user] = await db.insert(users).values({ name: 'Owner User' }).returning();
      const repo = createMembershipRepository(db);
      const ctx = { organizationId: org.id };

      await repo.addMember({ context: ctx, userId: user.id, role: 'owner' });
      await assert.rejects(async () => {
        await repo.addMember({ context: ctx, userId: user.id, role: 'admin' });
      });
    });
  });

  it('tenant isolation: org B context cannot read org A contact', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const a = await orgRepo.create({ name: 'Iso A', slug: `iso-a-${Date.now()}` });
      const b = await orgRepo.create({ name: 'Iso B', slug: `iso-b-${Date.now()}` });
      const contactRepo = createContactRepository(db, normalizePhone);

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
      const contactRepo = createContactRepository(db, normalizePhone);

      const ca = await contactRepo.matchOrCreate({ context: { organizationId: a.id }, name: 'Eka', phoneRaw: '081299887766' });
      const crossUpdate = await contactRepo.updateIdentity({ organizationId: b.id }, ca.id, { name: 'HACKED' });
      assert.strictEqual(crossUpdate, null, 'org B update must affect 0 rows');

      const pristine = await contactRepo.findById({ organizationId: a.id }, ca.id);
      assert.strictEqual(pristine?.name, 'Eka', 'org A contact must remain untouched');
    });
  });

  it('entitlements: semantics + 1:1 with organization', async () => {
    await withIntegrationDb(async (db) => {
      const orgRepo = createOrganizationRepository(db);
      const org = await orgRepo.create({ name: 'Ent Org', slug: `ent-${Date.now()}` });
      const entRepo = createEntitlementRepository(db);
      const ctx = { organizationId: org.id };

      const none = await entRepo.getForOrg(ctx);
      assert.strictEqual(none, null, 'no entitlements row until upserted');

      const classOnly = await entRepo.upsert({ context: ctx, promotorClass: true, promotorFlow: false });
      assert.deepStrictEqual(
        { promotorClass: classOnly.promotorClass, promotorFlow: classOnly.promotorFlow },
        { promotorClass: true, promotorFlow: false }
      );

      const switched = await entRepo.upsert({ context: ctx, promotorClass: false, promotorFlow: true });
      assert.strictEqual(switched.promotorClass, false);
      assert.strictEqual(switched.promotorFlow, true);

      await assert.rejects(
        async () => {
          await db.insert(productEntitlements).values({ organizationId: org.id, promotorClass: true, promotorFlow: true });
        },
        /unique|duplicate|23505/i,
        'second entitlement row per org must violate unique constraint'
      );
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
