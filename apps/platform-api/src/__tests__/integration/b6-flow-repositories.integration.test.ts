import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
} from './test-env';
import {
  organizations,
  users,
  contacts,
  services,
  bookings,
} from '../../db/schema';
import {
  createServiceRepository,
  createContactFlowRepository,
  createBookingRepository,
  createNextActionRepository,
  createActivityRepository,
  createAftercareRepository,
  createAssessmentRepository,
  createTemplateRepository,
} from '../../repositories';
import type { AuthenticatedActor } from '../../auth/types';
import { DomainError, isDomainError } from '../../core/errors';

const enabled = Boolean(TEST_DATABASE_URL);

describe('B6 — Flow Repositories PostgreSQL Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let contactAId: string;
  let contactA2Id: string;
  let contactBId: string;
  let serviceAId: string;
  let serviceAInactiveId: string;
  let serviceBId: string;
  let bookingContactAId: string;
  let bookingContactA2Id: string;
  let bookingOrgBId: string;

  const actorA: AuthenticatedActor = {
    userId: '',
    membershipId: 'mem-a',
    role: 'owner',
  };

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      // Create Tenant A
      const [orgA] = await db
        .insert(organizations)
        .values({ name: 'Tenant A Flow', slug: `org-a-repo-${Date.now()}` })
        .returning();
      orgAId = orgA.id;

      // Create Tenant B
      const [orgB] = await db
        .insert(organizations)
        .values({ name: 'Tenant B Flow', slug: `org-b-repo-${Date.now()}` })
        .returning();
      orgBId = orgB.id;

      // Create Users
      const [uA] = await db
        .insert(users)
        .values({ name: 'User A', email: `user-a-${Date.now()}@example.com` })
        .returning();
      userAId = uA.id;
      actorA.userId = userAId;

      const [uB] = await db
        .insert(users)
        .values({ name: 'User B', email: `user-b-${Date.now()}@example.com` })
        .returning();
      userBId = uB.id;

      // Create Contacts
      const [cA] = await db
        .insert(contacts)
        .values({ organizationId: orgAId, name: 'Contact Org A 1', phoneE164: '+6281111111111' })
        .returning();
      contactAId = cA.id;

      const [cA2] = await db
        .insert(contacts)
        .values({ organizationId: orgAId, name: 'Contact Org A 2', phoneE164: '+6281111111112' })
        .returning();
      contactA2Id = cA2.id;

      const [cB] = await db
        .insert(contacts)
        .values({ organizationId: orgBId, name: 'Contact Org B', phoneE164: '+6282222222222' })
        .returning();
      contactBId = cB.id;

      // Create Active Service in Org A
      const [sA] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Active Service A',
          category: 'SESSION',
          priceAmount: 300000,
          depositAmount: 100000,
          durationMinutes: 45,
          isActive: true,
        })
        .returning();
      serviceAId = sA.id;

      // Create Inactive Service in Org A
      const [sAInact] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Inactive Service A',
          category: 'SESSION',
          priceAmount: 200000,
          durationMinutes: 30,
          isActive: false,
        })
        .returning();
      serviceAInactiveId = sAInact.id;

      // Create Service in Org B
      const [sB] = await db
        .insert(services)
        .values({
          organizationId: orgBId,
          name: 'Active Service B',
          category: 'ASSESSMENT',
          priceAmount: 500000,
          durationMinutes: 60,
          isActive: true,
        })
        .returning();
      serviceBId = sB.id;

      // Pre-seed test bookings
      const bRepo = createBookingRepository(db);

      const b1 = await bRepo.create({ organizationId: orgAId }, {
        contactId: contactAId,
        serviceId: serviceAId,
        amount: 300000,
        startAt: new Date().toISOString(),
        locationType: 'ONLINE',
        status: 'CONFIRMED',
      });
      bookingContactAId = b1.id;

      const b2 = await bRepo.create({ organizationId: orgAId }, {
        contactId: contactA2Id,
        serviceId: serviceAId,
        amount: 300000,
        startAt: new Date().toISOString(),
        locationType: 'ONLINE',
        status: 'CONFIRMED',
      });
      bookingContactA2Id = b2.id;

      const b3 = await bRepo.create({ organizationId: orgBId }, {
        contactId: contactBId,
        serviceId: serviceBId,
        amount: 500000,
        startAt: new Date().toISOString(),
        locationType: 'ONLINE',
        status: 'CONFIRMED',
      });
      bookingOrgBId = b3.id;
    });
  });

  describe('1. Global Repository Rules & Context Guards', () => {
    it('all repositories require valid OrganizationContext (fail closed on missing context)', async () => {
      await withIntegrationDb(async (db) => {
        const sRepo = createServiceRepository(db);
        const cfRepo = createContactFlowRepository(db);
        const bRepo = createBookingRepository(db);
        const naRepo = createNextActionRepository(db);
        const aRepo = createActivityRepository(db);
        const acRepo = createAftercareRepository(db);
        const asRepo = createAssessmentRepository(db);
        const tRepo = createTemplateRepository(db);

        const invalidCtx = { organizationId: '' };

        await assert.rejects(async () => sRepo.listActive(invalidCtx as any));
        await assert.rejects(async () => cfRepo.getOrCreate(invalidCtx as any, contactAId));
        await assert.rejects(async () => bRepo.listByOrg(invalidCtx as any));
        await assert.rejects(async () => naRepo.countPending(invalidCtx as any));
        await assert.rejects(async () => aRepo.listByOrg(invalidCtx as any));
        await assert.rejects(async () => acRepo.listByOrg(invalidCtx as any));
        await assert.rejects(async () => asRepo.getOrCreate(invalidCtx as any, contactAId));
        await assert.rejects(async () => tRepo.listActive(invalidCtx as any));
      });
    });
  });

  describe('2. ServiceRepository', () => {
    it('creates, lists active, lists by IDs, finds by ID, and updates service strictly in-tenant', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createServiceRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        // Create
        const created = await repo.create(ctxA, {
          name: 'Personal Training',
          description: '1-on-1 PT',
          category: 'SESSION',
          priceAmount: 400000,
          depositAmount: 150000,
          durationMinutes: 60,
          isActive: true,
        });
        assert.ok(created.id);
        assert.strictEqual(created.organizationId, orgAId);
        assert.strictEqual(created.depositAmount, 150000);

        // findById
        const found = await repo.findById(ctxA, created.id);
        assert.strictEqual(found?.name, 'Personal Training');

        // Cross-tenant read returns null
        const crossFound = await repo.findById(ctxB, created.id);
        assert.strictEqual(crossFound, null);

        // listActive
        const listA = await repo.listActive(ctxA);
        assert.ok(listA.some((s) => s.id === created.id));
        const listB = await repo.listActive(ctxB);
        assert.ok(!listB.some((s) => s.id === created.id));

        // listByIds
        const byIds = await repo.listByIds(ctxA, [created.id, serviceAId]);
        assert.strictEqual(byIds.length, 2);
        const crossByIds = await repo.listByIds(ctxB, [created.id]);
        assert.strictEqual(crossByIds.length, 0);

        // update
        const updated = await repo.update(ctxA, created.id, { priceAmount: 450000, isActive: false });
        assert.strictEqual(updated?.priceAmount, 450000);
        assert.strictEqual(updated?.isActive, false);

        // Cross-tenant update returns null
        const crossUpdated = await repo.update(ctxB, created.id, { priceAmount: 999999 });
        assert.strictEqual(crossUpdated, null);
      });
    });
  });

  describe('3. ContactFlowRepository', () => {
    it('getOrCreate lazily provisions active tenant contact, is idempotent, and rejects deleted/cross-org contacts', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createContactFlowRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        // 1. First getOrCreate creates default row
        const row1 = await repo.getOrCreate(ctxA, contactAId);
        assert.ok(row1);
        assert.strictEqual(row1.stage, 'NEW');
        assert.strictEqual(row1.classification, 'PROSPECT');
        assert.strictEqual(row1.interest, null);

        // 2. Second getOrCreate is idempotent
        const row2 = await repo.getOrCreate(ctxA, contactAId);
        assert.strictEqual(row2?.id, row1.id);

        // 3. Cross-org contact fails closed (returns null)
        const crossRow = await repo.getOrCreate(ctxB, contactAId);
        assert.strictEqual(crossRow, null);

        // 4. Deleted contact fails closed (returns null)
        const [deletedContact] = await db
          .insert(contacts)
          .values({
            organizationId: orgAId,
            name: 'Soft Deleted Contact',
            phoneE164: '+6289999999999',
            deletedAt: new Date().toISOString(),
          })
          .returning();

        const deletedRow = await repo.getOrCreate(ctxA, deletedContact.id);
        assert.strictEqual(deletedRow, null);
      });
    });

    it('updateLifecycleState promotes to CLIENT and preserves CLIENT across subsequent updates (no demotion)', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createContactFlowRepository(db);
        const ctxA = { organizationId: orgAId };

        // Ensure state exists
        await repo.getOrCreate(ctxA, contactAId);

        // Update stage to CONTACTED without promotion
        const s1 = await repo.updateLifecycleState(ctxA, contactAId, { stage: 'CONTACTED' });
        assert.strictEqual(s1?.stage, 'CONTACTED');
        assert.strictEqual(s1?.classification, 'PROSPECT');

        // Promote to CLIENT on COMPLETED stage
        const s2 = await repo.updateLifecycleState(ctxA, contactAId, { stage: 'COMPLETED', promoteToClient: true });
        assert.strictEqual(s2?.stage, 'COMPLETED');
        assert.strictEqual(s2?.classification, 'CLIENT');

        // Later stage movement (e.g. COMPLETED -> FOLLOW_UP) preserves CLIENT
        const s3 = await repo.updateLifecycleState(ctxA, contactAId, { stage: 'FOLLOW_UP' });
        assert.strictEqual(s3?.stage, 'FOLLOW_UP');
        assert.strictEqual(s3?.classification, 'CLIENT'); // Sticky CLIENT!

        // LOST requires lost_reason
        const s4 = await repo.updateLifecycleState(ctxA, contactAId, { stage: 'LOST', lostReason: 'Price too high' });
        assert.strictEqual(s4?.stage, 'LOST');
        assert.strictEqual(s4?.lostReason, 'Price too high');
        assert.strictEqual(s4?.classification, 'CLIENT');
      });
    });

    it('updateProfile updates sourceChannel, notes, interest, and findById joins active contact', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createContactFlowRepository(db);
        const ctxA = { organizationId: orgAId };

        const updated = await repo.updateProfile(ctxA, contactAId, {
          sourceChannel: 'Instagram Ads',
          notes: 'Interested in morning sessions',
          interest: 'Strength Coaching',
        });
        assert.strictEqual(updated?.sourceChannel, 'Instagram Ads');
        assert.strictEqual(updated?.notes, 'Interested in morning sessions');
        assert.strictEqual(updated?.interest, 'Strength Coaching');

        const found = await repo.findById(ctxA, contactAId);
        assert.strictEqual(found?.interest, 'Strength Coaching');

        // findById returns null for other tenant
        const crossFound = await repo.findById({ organizationId: orgBId }, contactAId);
        assert.strictEqual(crossFound, null);
      });
    });
  });

  describe('4. BookingRepository & Tenant Poisoning Prevention', () => {
    let bookingAId: string;

    it('creates booking with snapshot amount, verifies active tenant contact/service, and enforces org scoping', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createBookingRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        const startAt = new Date().toISOString();
        const endAt = new Date(Date.now() + 3600_000).toISOString();

        // 1. Valid creation in Tenant A against ACTIVE service
        const b = await repo.create(
          ctxA,
          {
            contactId: contactAId,
            serviceId: serviceAId,
            amount: 300000,
            startAt,
            endAt,
            locationType: 'HOME_VISIT',
            status: 'PENDING',
          },
          `bk-idemp-${Date.now()}`
        );
        assert.ok(b.id);
        assert.strictEqual(b.amount, 300000);
        bookingAId = b.id;

        // 2. Booking against INACTIVE service fails closed (DomainError NOT_FOUND)
        await assert.rejects(
          async () => {
            await repo.create(ctxA, {
              contactId: contactAId,
              serviceId: serviceAInactiveId, // Inactive service!
              amount: 200000,
              startAt,
              locationType: 'ON_SITE',
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'New booking against inactive service must fail closed'
        );

        // 3. Tenant Poisoning: Org B attempting to create booking with Org A contact FAILS
        await assert.rejects(
          async () => {
            await repo.create(ctxB, {
              contactId: contactAId, // Org A contact!
              serviceId: serviceBId,
              amount: 500000,
              startAt,
              locationType: 'ONLINE',
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'Tenant poisoning on contact must fail closed'
        );

        // 4. Tenant Poisoning: Org A attempting to create booking with Org B service FAILS
        await assert.rejects(
          async () => {
            await repo.create(ctxA, {
              contactId: contactAId,
              serviceId: serviceBId, // Org B service!
              amount: 500000,
              startAt,
              locationType: 'ONLINE',
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'Tenant poisoning on service must fail closed'
        );

        // 5. findById
        const found = await repo.findById(ctxA, bookingAId);
        assert.strictEqual(found?.id, bookingAId);
        const crossFound = await repo.findById(ctxB, bookingAId);
        assert.strictEqual(crossFound, null);
      });
    });

    it('lockById executes SELECT ... FOR UPDATE within transaction', async () => {
      await withIntegrationDb(async (db) => {
        await db.transaction(async (tx) => {
          const repo = createBookingRepository(tx);
          const ctxA = { organizationId: orgAId };

          const locked = await repo.lockById(ctxA, bookingAId);
          assert.ok(locked);
          assert.strictEqual(locked.id, bookingAId);

          const crossLocked = await repo.lockById({ organizationId: orgBId }, bookingAId);
          assert.strictEqual(crossLocked, null);
        });
      });
    });

    it('updateStatus, updatePayment, reschedule, and markCompleted work in tenant and return null across tenants', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createBookingRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        // updateStatus (exact signature: ctx, id, status — no phantom cancellationReason)
        const s = await repo.updateStatus(ctxA, bookingAId, 'CONFIRMED');
        assert.strictEqual(s?.status, 'CONFIRMED');
        const crossS = await repo.updateStatus(ctxB, bookingAId, 'CONFIRMED');
        assert.strictEqual(crossS, null);

        // updatePayment
        const p = await repo.updatePayment(ctxA, bookingAId, 'PAID');
        assert.strictEqual(p?.paymentStatus, 'PAID');
        const crossP = await repo.updatePayment(ctxB, bookingAId, 'PAID');
        assert.strictEqual(crossP, null);

        // reschedule
        const newStart = new Date(Date.now() + 7200_000).toISOString();
        const resch = await repo.reschedule(ctxA, bookingAId, newStart);
        assert.ok(resch?.startAt);
        assert.strictEqual(new Date(resch.startAt).getTime(), new Date(newStart).getTime());

        // markCompleted
        const compAt = new Date().toISOString();
        const comp = await repo.markCompleted(ctxA, bookingAId, compAt);
        assert.strictEqual(comp?.status, 'COMPLETED');
        assert.ok(comp?.completedAt);
        assert.strictEqual(new Date(comp.completedAt).getTime(), new Date(compAt).getTime());
      });
    });
  });

  describe('5. NextActionRepository & Relational Consistency', () => {
    let actionAId: string;

    it('creates next action, validates active tenant contact/booking parents, and enforces same-contact booking relational consistency', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createNextActionRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        const dueAt = new Date().toISOString();
        const idemp = `na-test-${Date.now()}`;

        // 1. Valid action linked to matching Contact A booking
        const na = await repo.create(ctxA, {
          contactId: contactAId,
          bookingId: bookingContactAId,
          actionType: 'CONTACT_LEAD',
          title: 'First call',
          dueAt,
          priority: 80,
          source: 'PROMOTORFLOW',
          idempotencyKey: idemp,
        });
        assert.ok(na.id);
        assert.strictEqual(na.contactId, contactAId);
        assert.strictEqual(na.bookingId, bookingContactAId);
        actionAId = na.id;

        // 2. Same-org Cross-contact Relational Poisoning rejection: Contact A + Booking Contact A2 -> NOT_FOUND
        await assert.rejects(
          async () => {
            await repo.create(ctxA, {
              contactId: contactAId,
              bookingId: bookingContactA2Id, // Belongs to contactA2, not contactA!
              actionType: 'CONTACT_LEAD',
              title: 'Cross-contact poisoned action',
              dueAt,
              priority: 80,
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err), 'Must be DomainError');
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'Same-org cross-contact booking reference in NextAction must fail closed with NOT_FOUND'
        );

        // 3. Exact constraint mapping: duplicate idempotency key on same org+source -> DomainError CONFLICT
        await assert.rejects(
          async () => {
            await repo.create(ctxA, {
              contactId: contactAId,
              bookingId: bookingContactAId,
              actionType: 'CONTACT_LEAD',
              title: 'Duplicate idempotency action',
              dueAt,
              priority: 80,
              source: 'PROMOTORFLOW',
              idempotencyKey: idemp,
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err), 'Must be DomainError');
            assert.strictEqual(err.code, 'CONFLICT');
            return true;
          },
          'next_actions_org_source_idempotency_unique must map to CONFLICT'
        );

        // 4. Cross-org tenant poisoning rejection
        await assert.rejects(
          async () => {
            await repo.create(ctxB, {
              contactId: contactAId, // Org A contact
              actionType: 'FOLLOW_UP',
              title: 'Poisoned action',
              dueAt,
              priority: 50,
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });

    it('listPendingDueBy, listPendingUpcoming, countPending, and state mutations', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createNextActionRepository(db);
        const ctxA = { organizationId: orgAId };

        const count = await repo.countPending(ctxA);
        assert.ok(count >= 1);

        const dueList = await repo.listPendingDueBy(ctxA, new Date(Date.now() + 60_000).toISOString());
        assert.ok(dueList.some((a) => a.id === actionAId));

        // complete
        const completed = await repo.complete(ctxA, actionAId, new Date().toISOString());
        assert.strictEqual(completed?.status, 'COMPLETED');
        assert.ok(completed?.completedAt);

        // resolve to CANCELLED
        const resolved = await repo.resolve(ctxA, actionAId, 'CANCELLED');
        assert.strictEqual(resolved?.status, 'CANCELLED');
        assert.strictEqual(resolved?.completedAt, null);
      });
    });
  });

  describe('6. ActivityRepository (Append-Only, Trusted Actor & Relational Consistency)', () => {
    it('appends activities using server-resolved actor, enforces booking ↔ contact consistency, and exposes no update/delete', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createActivityRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        // 1. User event with server-resolved AuthenticatedActor & matching booking
        const act1 = await repo.append(ctxA, actorA, {
          contactId: contactAId,
          bookingId: bookingContactAId,
          eventType: 'WHATSAPP_SENT',
          metadataJson: { messageId: 'm-123' },
        });
        assert.ok(act1.id);
        assert.strictEqual(act1.actorUserId, userAId);
        assert.strictEqual(act1.eventType, 'WHATSAPP_SENT');
        assert.strictEqual(act1.bookingId, bookingContactAId);

        // 2. Same-org Cross-contact Relational Poisoning rejection: Contact A + Booking Contact A2 -> NOT_FOUND
        await assert.rejects(
          async () => {
            await repo.append(ctxA, actorA, {
              contactId: contactAId,
              bookingId: bookingContactA2Id, // Belongs to Contact A2!
              eventType: 'CALL_LOGGED',
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err), 'Must be DomainError');
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'Same-org cross-contact booking in Activity must fail closed with NOT_FOUND'
        );

        // 3. System event with actor = null
        const act2 = await repo.append(ctxA, null, {
          contactId: contactAId,
          eventType: 'STAGE_CHANGED',
          metadataJson: { from: 'NEW', to: 'CONTACTED' },
        });
        assert.strictEqual(act2.actorUserId, null);

        // 4. Cross-tenant poisoning rejection (Org B context with Org A contact)
        await assert.rejects(
          async () => {
            await repo.append(ctxB, actorA, {
              contactId: contactAId,
              eventType: 'CONTACT_UPDATED',
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          }
        );

        // 5. listByContact & listByOrg
        const contactActs = await repo.listByContact(ctxA, contactAId);
        assert.ok(contactActs.length >= 2);

        const orgActs = await repo.listByOrg(ctxA);
        assert.ok(orgActs.length >= 2);

        const crossActs = await repo.listByContact(ctxB, contactAId);
        assert.strictEqual(crossActs.length, 0);

        // 6. Verify repository exposes NO update/delete methods
        assert.strictEqual((repo as any).update, undefined);
        assert.strictEqual((repo as any).delete, undefined);
        assert.strictEqual((repo as any).editActivity, undefined);
      });
    });
  });

  describe('7. AftercareRepository (Relational Consistency & Exact Constraint Mapping)', () => {
    it('creates aftercare record, enforces same-contact booking consistency, and maps duplicate booking aftercare to CONFLICT', async () => {
      await withIntegrationDb(async (db) => {
        const bRepo = createBookingRepository(db);
        const acRepo = createAftercareRepository(db);
        const ctxA = { organizationId: orgAId };

        // Create completed booking for aftercare test on Contact A
        const bk = await bRepo.create(ctxA, {
          contactId: contactAId,
          serviceId: serviceAId,
          amount: 300000,
          startAt: new Date().toISOString(),
          locationType: 'ONLINE',
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        });

        // 1. Same-org Cross-contact Relational Poisoning rejection: Contact A2 + Booking Contact A -> NOT_FOUND
        await assert.rejects(
          async () => {
            await acRepo.create(ctxA, {
              bookingId: bk.id, // Belongs to Contact A!
              contactId: contactA2Id, // Passed Contact A2!
              scheduledFor: new Date(Date.now() + 7 * 86400_000).toISOString(),
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err), 'Must be DomainError');
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'Same-org cross-contact booking in Aftercare must fail closed with NOT_FOUND'
        );

        // 2. Valid creation with matching Contact A + Booking Contact A
        const ac = await acRepo.create(ctxA, {
          bookingId: bk.id,
          contactId: contactAId,
          scheduledFor: new Date(Date.now() + 7 * 86400_000).toISOString(),
          status: 'PENDING',
        });
        assert.ok(ac.id);
        assert.strictEqual(ac.status, 'PENDING');
        assert.strictEqual(ac.bookingId, bk.id);
        assert.strictEqual(ac.contactId, contactAId);

        // 3. Exact constraint mapping: duplicate aftercare on same booking maps to DomainError CONFLICT
        await assert.rejects(
          async () => {
            await acRepo.create(ctxA, {
              bookingId: bk.id,
              contactId: contactAId,
              scheduledFor: new Date().toISOString(),
            });
          },
          (err: unknown) => {
            assert.ok(isDomainError(err), 'Must be DomainError');
            assert.strictEqual(err.code, 'CONFLICT');
            return true;
          },
          'aftercare_records_org_booking_unique must map to CONFLICT'
        );

        // 4. findByBooking
        const found = await acRepo.findByBooking(ctxA, bk.id);
        assert.strictEqual(found?.id, ac.id);

        // 5. completeRecord
        const recAt = new Date().toISOString();
        const completed = await acRepo.completeRecord(ctxA, bk.id, {
          outcome: 'INTERESTED_NEXT_SESSION',
          outcomeNotes: 'Wants to continue next month',
          recordedAt: recAt,
        });
        assert.strictEqual(completed?.status, 'COMPLETED');
        assert.strictEqual(completed?.outcome, 'INTERESTED_NEXT_SESSION');
        assert.strictEqual(completed?.outcomeNotes, 'Wants to continue next month');
      });
    });
  });

  describe('8. AssessmentRepository (Atomic Precedence & Relational Consistency)', () => {
    it('enforces sourceBooking parent validation (same tenant AND same contact)', async () => {
      await withIntegrationDb(async (db) => {
        const asRepo = createAssessmentRepository(db);
        const ctxA = { organizationId: orgAId };

        await asRepo.getOrCreate(ctxA, contactAId);

        // 1. Cross-org booking rejected
        await assert.rejects(
          async () => {
            await asRepo.updateStatus(ctxA, contactAId, 'SCHEDULED', bookingOrgBId);
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'Cross-org source booking must fail closed'
        );

        // 2. Same org but mismatched contact booking rejected
        await assert.rejects(
          async () => {
            await asRepo.updateStatus(ctxA, contactAId, 'SCHEDULED', bookingContactA2Id);
          },
          (err: unknown) => {
            assert.ok(isDomainError(err));
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          },
          'Mismatched contact source booking must fail closed'
        );

        // 3. Same org + matching contact booking accepted
        const valid = await asRepo.updateStatus(ctxA, contactAId, 'SCHEDULED', bookingContactAId);
        assert.ok(valid);
        assert.strictEqual(valid.status, 'SCHEDULED');
        assert.strictEqual(valid.sourceBookingId, bookingContactAId);
      });
    });

    it('enforces canonical assessment precedence matrix (COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED)', async () => {
      await withIntegrationDb(async (db) => {
        const asRepo = createAssessmentRepository(db);
        const ctxA = { organizationId: orgAId };

        // Fresh contact for full precedence lifecycle
        const [cTest] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Precedence Contact', phoneE164: '+6281199998888' })
          .returning();

        // 1. Initial state -> NOT_STARTED
        const initial = await asRepo.getOrCreate(ctxA, cTest.id);
        assert.strictEqual(initial?.status, 'NOT_STARTED');

        // 2. NOT_STARTED -> CANCELLED (allowed)
        const step1 = await asRepo.updateStatus(ctxA, cTest.id, 'CANCELLED');
        assert.strictEqual(step1?.status, 'CANCELLED');

        // 3. CANCELLED -> NOT_STARTED (must NOT downgrade -> stays CANCELLED)
        const step2 = await asRepo.updateStatus(ctxA, cTest.id, 'NOT_STARTED');
        assert.strictEqual(step2?.status, 'CANCELLED');

        // 4. CANCELLED -> SCHEDULED (allowed)
        const step3 = await asRepo.updateStatus(ctxA, cTest.id, 'SCHEDULED');
        assert.strictEqual(step3?.status, 'SCHEDULED');

        // 5. SCHEDULED -> CANCELLED (must NOT downgrade -> stays SCHEDULED)
        const step4 = await asRepo.updateStatus(ctxA, cTest.id, 'CANCELLED');
        assert.strictEqual(step4?.status, 'SCHEDULED');

        // 6. SCHEDULED -> NOT_STARTED (must NOT downgrade -> stays SCHEDULED)
        const step5 = await asRepo.updateStatus(ctxA, cTest.id, 'NOT_STARTED');
        assert.strictEqual(step5?.status, 'SCHEDULED');

        // 7. SCHEDULED -> COMPLETED (allowed)
        const step6 = await asRepo.updateStatus(ctxA, cTest.id, 'COMPLETED', undefined, undefined, 'Passed assessment');
        assert.strictEqual(step6?.status, 'COMPLETED');
        assert.strictEqual(step6?.notes, 'Passed assessment');
        assert.ok(step6?.assessedAt);

        // 8. COMPLETED -> SCHEDULED (must NOT downgrade -> stays COMPLETED)
        const step7 = await asRepo.updateStatus(ctxA, cTest.id, 'SCHEDULED');
        assert.strictEqual(step7?.status, 'COMPLETED');

        // 9. COMPLETED -> CANCELLED (must NOT downgrade -> stays COMPLETED)
        const step8 = await asRepo.updateStatus(ctxA, cTest.id, 'CANCELLED');
        assert.strictEqual(step8?.status, 'COMPLETED');

        // 10. COMPLETED -> NOT_STARTED (must NOT downgrade -> stays COMPLETED)
        const step9 = await asRepo.updateStatus(ctxA, cTest.id, 'NOT_STARTED');
        assert.strictEqual(step9?.status, 'COMPLETED');
      });
    });

    it('proves concurrent atomic precedence: simultaneous COMPLETED and SCHEDULED writes always resolve to COMPLETED', async () => {
      await withIntegrationDb(async (db) => {
        const asRepo = createAssessmentRepository(db);
        const ctxA = { organizationId: orgAId };

        // Run 5 separate concurrent race rounds on fresh contacts
        for (let round = 0; round < 5; round++) {
          const [cRace] = await db
            .insert(contacts)
            .values({
              organizationId: orgAId,
              name: `Race Contact ${round}`,
              phoneE164: `+628120000000${round}`,
            })
            .returning();

          await asRepo.getOrCreate(ctxA, cRace.id);

          // Fire simultaneous concurrent writers: SCHEDULED, COMPLETED, CANCELLED, NOT_STARTED
          const concurrentWrites = [
            asRepo.updateStatus(ctxA, cRace.id, 'SCHEDULED'),
            asRepo.updateStatus(ctxA, cRace.id, 'COMPLETED', undefined, undefined, `Completed round ${round}`),
            asRepo.updateStatus(ctxA, cRace.id, 'CANCELLED'),
            asRepo.updateStatus(ctxA, cRace.id, 'SCHEDULED'),
            asRepo.updateStatus(ctxA, cRace.id, 'NOT_STARTED'),
          ];

          await Promise.all(concurrentWrites);

          // Read back final state from database
          const finalState = await asRepo.findById(ctxA, cRace.id);
          assert.strictEqual(
            finalState?.status,
            'COMPLETED',
            `Round ${round}: Concurrency race failed: expected COMPLETED but got ${finalState?.status}`
          );
          assert.ok(finalState?.assessedAt, `Round ${round}: assessedAt must be populated on COMPLETED`);
        }
      });
    });
  });

  describe('9. TemplateRepository', () => {
    it('manages message templates with organization scoping', async () => {
      await withIntegrationDb(async (db) => {
        const tRepo = createTemplateRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        const t = await tRepo.create(ctxA, {
          title: 'Booking Confirmation',
          category: 'CONFIRM_BOOKING',
          templateText: 'Your session on {{date}} is confirmed!',
          isActive: true,
        });
        assert.ok(t.id);

        const list = await tRepo.listActive(ctxA, 'CONFIRM_BOOKING');
        assert.ok(list.some((item) => item.id === t.id));

        const crossList = await tRepo.listActive(ctxB, 'CONFIRM_BOOKING');
        assert.ok(!crossList.some((item) => item.id === t.id));

        const updated = await tRepo.update(ctxA, t.id, { isActive: false });
        assert.strictEqual(updated?.isActive, false);
      });
    });
  });

  describe('10. Multi-Repository Transaction Composition', () => {
    it('constructs all repositories inside db.transaction(tx => ...) and commits atomically', async () => {
      await withIntegrationDb(async (db) => {
        const ctxA = { organizationId: orgAId };

        await db.transaction(async (tx) => {
          const bookingRepo = createBookingRepository(tx);
          const flowRepo = createContactFlowRepository(tx);
          const actionRepo = createNextActionRepository(tx);
          const activityRepo = createActivityRepository(tx);

          // 1. Create booking in tx
          const bk = await bookingRepo.create(ctxA, {
            contactId: contactAId,
            serviceId: serviceAId,
            amount: 300000,
            startAt: new Date().toISOString(),
            locationType: 'HOME_VISIT',
            status: 'PENDING',
          });
          assert.ok(bk.id);

          // 2. Update lifecycle in same tx
          const flow = await flowRepo.updateLifecycleState(ctxA, contactAId, { stage: 'BOOKED' });
          assert.strictEqual(flow?.stage, 'BOOKED');

          // 3. Create action linked to booking in same tx
          const act = await actionRepo.create(ctxA, {
            contactId: contactAId,
            bookingId: bk.id,
            actionType: 'CONFIRM_BOOKING',
            title: 'Confirm home visit',
            dueAt: new Date().toISOString(),
            priority: 90,
          });
          assert.ok(act.id);

          // 4. Append activity in same tx
          const activity = await activityRepo.append(ctxA, actorA, {
            contactId: contactAId,
            bookingId: bk.id,
            eventType: 'BOOKING_CREATED',
            metadataJson: { bookingId: bk.id },
          });
          assert.ok(activity.id);
        });

        // Verify committed state
        const flowAfter = await createContactFlowRepository(db).findById(ctxA, contactAId);
        assert.strictEqual(flowAfter?.stage, 'BOOKED');
      });
    });
  });
});
