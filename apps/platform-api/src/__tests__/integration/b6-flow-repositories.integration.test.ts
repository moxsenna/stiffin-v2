import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { eq } from 'drizzle-orm';
import {
  applyMigrationsAsOwner,
  TEST_DATABASE_URL,
  withIntegrationDb,
  pgErrorCode,
} from './test-env';
import {
  organizations,
  users,
  contacts,
  services,
  bookings,
  nextActions,
  activities,
  contactFlowStates,
  aftercareRecords,
  contactAssessments,
  messageTemplates,
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

const enabled = Boolean(TEST_DATABASE_URL);

describe('B6 — Flow Repositories PostgreSQL Integration Suite', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let contactAId: string;
  let contactBId: string;
  let serviceAId: string;
  let serviceBId: string;

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
        .values({ organizationId: orgAId, name: 'Contact Org A', phoneE164: '+6281111111111' })
        .returning();
      contactAId = cA.id;

      const [cB] = await db
        .insert(contacts)
        .values({ organizationId: orgBId, name: 'Contact Org B', phoneE164: '+6282222222222' })
        .returning();
      contactBId = cB.id;

      // Create Services
      const [sA] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Service A',
          category: 'SESSION',
          priceAmount: 300000,
          depositAmount: 100000,
          durationMinutes: 45,
        })
        .returning();
      serviceAId = sA.id;

      const [sB] = await db
        .insert(services)
        .values({
          organizationId: orgBId,
          name: 'Service B',
          category: 'ASSESSMENT',
          priceAmount: 500000,
          durationMinutes: 60,
        })
        .returning();
      serviceBId = sB.id;
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

        // Valid creation in Tenant A
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

        // Tenant Poisoning: Org B attempting to create booking with Org A contact FAILS
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
          /Active tenant contact is required/,
          'Tenant poisoning on contact must fail closed'
        );

        // Tenant Poisoning: Org A attempting to create booking with Org B service FAILS
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
          /Tenant service is required/,
          'Tenant poisoning on service must fail closed'
        );

        // findById
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

        // updatePayment
        const p = await repo.updatePayment(ctxA, bookingAId, 'PAID');
        assert.strictEqual(p?.paymentStatus, 'PAID');
        const crossP = await repo.updatePayment(ctxB, bookingAId, 'PAID');
        assert.strictEqual(crossP, null);

        // reschedule
        const newStart = new Date(Date.now() + 7200_000).toISOString();
        const resch = await repo.reschedule(ctxA, bookingAId, newStart);
        assert.strictEqual(resch?.startAt, newStart);

        // markCompleted
        const compAt = new Date().toISOString();
        const comp = await repo.markCompleted(ctxA, bookingAId, compAt);
        assert.strictEqual(comp?.status, 'COMPLETED');
        assert.strictEqual(comp?.completedAt, compAt);
      });
    });
  });

  describe('5. NextActionRepository', () => {
    let actionAId: string;

    it('creates next action, validates active tenant contact/booking parents, and maps duplicate idempotency key', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createNextActionRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        const dueAt = new Date().toISOString();
        const idemp = `na-test-${Date.now()}`;

        const na = await repo.create(ctxA, {
          contactId: contactAId,
          actionType: 'CONTACT_LEAD',
          title: 'First call',
          dueAt,
          priority: 80,
          source: 'PROMOTORFLOW',
          idempotencyKey: idemp,
        });
        assert.ok(na.id);
        actionAId = na.id;

        // Duplicate idempotency key in same org throws 23505
        await assert.rejects(
          async () => {
            await repo.create(ctxA, {
              contactId: contactAId,
              actionType: 'CONTACT_LEAD',
              title: 'Second call',
              dueAt,
              priority: 80,
              source: 'PROMOTORFLOW',
              idempotencyKey: idemp,
            });
          },
          (err: unknown) => {
            assert.strictEqual(pgErrorCode(err), '23505');
            return true;
          }
        );

        // Tenant poisoning rejection
        await assert.rejects(async () => {
          await repo.create(ctxB, {
            contactId: contactAId, // Org A contact
            actionType: 'FOLLOW_UP',
            title: 'Poisoned action',
            dueAt,
            priority: 50,
          });
        });
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

  describe('6. ActivityRepository (Append-Only & Trusted Actor)', () => {
    it('appends activities using server-resolved actor, supports null actor for system events, and exposes no update/delete', async () => {
      await withIntegrationDb(async (db) => {
        const repo = createActivityRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        // 1. User event with server-resolved AuthenticatedActor
        const act1 = await repo.append(ctxA, actorA, {
          contactId: contactAId,
          eventType: 'WHATSAPP_SENT',
          metadataJson: { messageId: 'm-123' },
        });
        assert.ok(act1.id);
        assert.strictEqual(act1.actorUserId, userAId);
        assert.strictEqual(act1.eventType, 'WHATSAPP_SENT');

        // 2. System event with actor = null
        const act2 = await repo.append(ctxA, null, {
          contactId: contactAId,
          eventType: 'STAGE_CHANGED',
          metadataJson: { from: 'NEW', to: 'CONTACTED' },
        });
        assert.strictEqual(act2.actorUserId, null);

        // 3. Tenant poisoning rejection (Org B context with Org A contact)
        await assert.rejects(async () => {
          await repo.append(ctxB, actorA, {
            contactId: contactAId,
            eventType: 'CONTACT_UPDATED',
          });
        });

        // 4. listByContact & listByOrg
        const contactActs = await repo.listByContact(ctxA, contactAId);
        assert.ok(contactActs.length >= 2);

        const orgActs = await repo.listByOrg(ctxA);
        assert.ok(orgActs.length >= 2);

        const crossActs = await repo.listByContact(ctxB, contactAId);
        assert.strictEqual(crossActs.length, 0);

        // 5. Verify repository exposes NO update/delete methods
        assert.strictEqual((repo as any).update, undefined);
        assert.strictEqual((repo as any).delete, undefined);
        assert.strictEqual((repo as any).editActivity, undefined);
      });
    });
  });

  describe('7. AftercareRepository', () => {
    it('creates aftercare record, prevents duplicate booking aftercare, and completes record', async () => {
      await withIntegrationDb(async (db) => {
        const bRepo = createBookingRepository(db);
        const acRepo = createAftercareRepository(db);
        const ctxA = { organizationId: orgAId };

        // Create booking for aftercare test
        const bk = await bRepo.create(ctxA, {
          contactId: contactAId,
          serviceId: serviceAId,
          amount: 300000,
          startAt: new Date().toISOString(),
          locationType: 'ONLINE',
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        });

        // Create aftercare record
        const ac = await acRepo.create(ctxA, {
          bookingId: bk.id,
          contactId: contactAId,
          scheduledFor: new Date(Date.now() + 7 * 86400_000).toISOString(),
          status: 'PENDING',
        });
        assert.ok(ac.id);
        assert.strictEqual(ac.status, 'PENDING');

        // Duplicate aftercare on same booking rejected by UNIQUE(org, booking)
        await assert.rejects(async () => {
          await acRepo.create(ctxA, {
            bookingId: bk.id,
            contactId: contactAId,
            scheduledFor: new Date().toISOString(),
          });
        });

        // findByBooking
        const found = await acRepo.findByBooking(ctxA, bk.id);
        assert.strictEqual(found?.id, ac.id);

        // completeRecord
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

  describe('8. AssessmentRepository', () => {
    it('getOrCreate is idempotent and updateStatus records assessment state', async () => {
      await withIntegrationDb(async (db) => {
        const asRepo = createAssessmentRepository(db);
        const ctxA = { organizationId: orgAId };
        const ctxB = { organizationId: orgBId };

        // 1. getOrCreate
        const as1 = await asRepo.getOrCreate(ctxA, contactAId);
        assert.ok(as1);
        assert.strictEqual(as1.status, 'NOT_STARTED');

        // 2. Idempotent
        const as2 = await asRepo.getOrCreate(ctxA, contactAId);
        assert.strictEqual(as2?.id, as1.id);

        // 3. Cross-org contact returns null
        const cross = await asRepo.getOrCreate(ctxB, contactAId);
        assert.strictEqual(cross, null);

        // 4. updateStatus
        const updated = await asRepo.updateStatus(ctxA, contactAId, 'COMPLETED', undefined, undefined, 'Goal met');
        assert.strictEqual(updated?.status, 'COMPLETED');
        assert.strictEqual(updated?.notes, 'Goal met');
        assert.ok(updated?.assessedAt);
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
          const aftercareRepo = createAftercareRepository(tx);

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
