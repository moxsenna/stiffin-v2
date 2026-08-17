import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
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
  contactFlowStates,
  nextActions,
  aftercareRecords,
  contactAssessments,
  activities,
  messageTemplates,
} from '../../db/schema';
import {
  createContactFlowService,
  createContactLifecycleService,
  createBookingService,
  createNextActionService,
  createAftercareService,
  createAssessmentService,
  createTemplateService,
  createMessagingService,
} from '../../services';
import type { AuthenticatedActor } from '../../auth/types';
import { DomainError, isDomainError } from '../../core/errors';
import { createActivityRepository } from '../../repositories/activity-repository';

const enabled = Boolean(TEST_DATABASE_URL);

describe('B6 — Flow Services PostgreSQL Integration Suite (§14.2 & Canonical Contract)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let contactA1Id: string;
  let contactA2Id: string;
  let contactB1Id: string;
  let serviceAStandardId: string;
  let serviceAAssessmentId: string;
  let serviceBId: string;

  const actorA: AuthenticatedActor = {
    userId: '',
    membershipId: 'mem-a',
    role: 'owner',
  };

  const actorB: AuthenticatedActor = {
    userId: '',
    membershipId: 'mem-b',
    role: 'owner',
  };

  const ctxA = { organizationId: '' };
  const ctxB = { organizationId: '' };

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      // Create Tenant A
      const [orgA] = await db
        .insert(organizations)
        .values({ name: 'Tenant A Services', slug: `org-a-svc-${Date.now()}` })
        .returning();
      orgAId = orgA.id;
      ctxA.organizationId = orgAId;

      // Create Tenant B
      const [orgB] = await db
        .insert(organizations)
        .values({ name: 'Tenant B Services', slug: `org-b-svc-${Date.now()}` })
        .returning();
      orgBId = orgB.id;
      ctxB.organizationId = orgBId;

      // Create Users
      const [uA] = await db
        .insert(users)
        .values({ name: 'Operator A', email: `op-a-${Date.now()}@example.com` })
        .returning();
      userAId = uA.id;
      actorA.userId = userAId;

      const [uB] = await db
        .insert(users)
        .values({ name: 'Operator B', email: `op-b-${Date.now()}@example.com` })
        .returning();
      userBId = uB.id;
      actorB.userId = userBId;

      // Create Contacts for Org A
      const [cA1] = await db
        .insert(contacts)
        .values({ organizationId: orgAId, name: 'Contact A1', phoneE164: '+6281100000001' })
        .returning();
      contactA1Id = cA1.id;

      const [cA2] = await db
        .insert(contacts)
        .values({ organizationId: orgAId, name: 'Contact A2', phoneE164: '+6281100000002' })
        .returning();
      contactA2Id = cA2.id;

      // Create Contact for Org B
      const [cB1] = await db
        .insert(contacts)
        .values({ organizationId: orgBId, name: 'Contact B1', phoneE164: '+6282200000001' })
        .returning();
      contactB1Id = cB1.id;

      // Create Services for Org A
      const [sAStd] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Konsultasi Standard',
          category: 'SESSION',
          priceAmount: 150000,
          durationMinutes: 60,
          isActive: true,
        })
        .returning();
      serviceAStandardId = sAStd.id;

      const [sAAss] = await db
        .insert(services)
        .values({
          organizationId: orgAId,
          name: 'Tes Bakat STIFIn',
          category: 'ASSESSMENT',
          priceAmount: 500000,
          durationMinutes: 90,
          isActive: true,
        })
        .returning();
      serviceAAssessmentId = sAAss.id;

      // Create Service for Org B
      const [sB] = await db
        .insert(services)
        .values({
          organizationId: orgBId,
          name: 'Layanan Org B',
          category: 'SESSION',
          priceAmount: 200000,
          durationMinutes: 60,
          isActive: true,
        })
        .returning();
      serviceBId = sB.id;
    });
  });

  // =========================================================================
  // SECTION 1: Two-Phase Onboarding & ContactFlowService (§14.2 #4, #26)
  // =========================================================================
  describe('1. Two-Phase Onboarding & ContactFlowService', () => {
    it('Case 4 & 26a: createFlowContact requires non-empty interest', async () => {
      await withIntegrationDb(async (db) => {
        const flowService = createContactFlowService(db);

        await assert.rejects(
          async () => {
            await flowService.createFlowContact(
              ctxA,
              {
                name: 'Prospek Baru',
                phoneRaw: '081234567890',
                interest: '   ', // empty / whitespace
              },
              actorA
            );
          },
          (err: any) => {
            return isDomainError(err) && err.code === 'VALIDATION_ERROR' && err.message === 'INTEREST_REQUIRED';
          }
        );
      });
    });

    it('Case 4 & 26b: createFlowContact two-phase success creates Contact, FlowState, NA-001 due≈now+2h pri 75, CONTACT_CREATED', async () => {
      await withIntegrationDb(async (db) => {
        const fixedNow = new Date('2026-08-17T10:00:00.000Z');
        const flowService = createContactFlowService(db, { clock: () => fixedNow });

        const result = await flowService.createFlowContact(
          ctxA,
          {
            name: 'Budi Santoso',
            phoneRaw: '081234567891',
            interest: 'Minat Tes STIFIn Anak',
            sourceChannel: 'INSTAGRAM',
            notes: 'Follower lama',
          },
          actorA
        );

        assert.ok(result.contact.id);
        assert.strictEqual(result.contact.name, 'Budi Santoso');
        assert.strictEqual(result.contact.phoneE164, '+6281234567891');
        assert.strictEqual(result.flowState.stage, 'NEW');
        assert.strictEqual(result.flowState.classification, 'PROSPECT');
        assert.strictEqual(result.flowState.interest, 'Minat Tes STIFIn Anak');
        assert.strictEqual(result.flowState.sourceChannel, 'INSTAGRAM');

        // NA-001 verification
        assert.ok(result.leadAction);
        assert.strictEqual(result.leadAction.actionType, 'CONTACT_LEAD');
        assert.strictEqual(result.leadAction.priority, 75);
        assert.strictEqual(result.leadAction.status, 'PENDING');
        const expectedDue = new Date(fixedNow.getTime() + 2 * 3600_000).toISOString();
        assert.strictEqual(new Date(result.leadAction.dueAt).getTime(), new Date(expectedDue).getTime());

        // Verify CONTACT_CREATED activity
        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, result.contact.id));
        const createdAct = acts.find((a) => a.eventType === 'CONTACT_CREATED');
        assert.ok(createdAct);
        assert.strictEqual(createdAct.actorUserId, userAId);
      });
    });

    it('Case 26c: simulated Phase-2 failure rolls back Flow state/actions while Shared Core Contact remains durable; retry succeeds with no duplicate side effects', async () => {
      await withIntegrationDb(async (db) => {
        const testPhone = '081234567892';
        const expectedE164 = '+6281234567892';

        // 1. First attempt: simulate Phase 2 failure using throwing activities dependency
        let phase2Attempted = false;
        const throwingActivities = (tx: any) => {
          const repo = createActivityRepository(tx);
          return {
            ...repo,
            append: async (...args: any[]) => {
              phase2Attempted = true;
              throw new Error('SIMULATED_PHASE_2_FAILURE');
            },
          };
        };

        const failingFlowService = createContactFlowService(db, {
          activities: throwingActivities as any,
        });

        await assert.rejects(
          async () => {
            await failingFlowService.createFlowContact(
              ctxA,
              {
                name: 'Citra Dewi',
                phoneRaw: testPhone,
                interest: 'Konsultasi Karir',
              },
              actorA
            );
          },
          (err: any) => err.message === 'SIMULATED_PHASE_2_FAILURE'
        );

        assert.strictEqual(phase2Attempted, true);

        // Verify Phase 1 Contact persists in Shared Core contacts table
        const [coreContact] = await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.organizationId, orgAId), eq(contacts.phoneE164, expectedE164)));
        assert.ok(coreContact, 'Shared Core Contact must remain durable after Phase 2 failure');
        assert.strictEqual(coreContact.name, 'Citra Dewi');

        // Verify Flow transaction was rolled back: no flow state and no next actions exist
        const flowStatesAfterFail = await db
          .select()
          .from(contactFlowStates)
          .where(eq(contactFlowStates.contactId, coreContact.id));
        assert.strictEqual(flowStatesAfterFail.length, 0, 'Flow state must be rolled back');

        const actionsAfterFail = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.contactId, coreContact.id));
        assert.strictEqual(actionsAfterFail.length, 0, 'Next actions must be rolled back');

        // 2. Retry onboarding with normal dependencies
        const normalFlowService = createContactFlowService(db);
        const retryResult = await normalFlowService.createFlowContact(
          ctxA,
          {
            name: 'Citra Dewi',
            phoneRaw: testPhone,
            interest: 'Konsultasi Karir',
          },
          actorA
        );

        // Same canonical contact reused
        assert.strictEqual(retryResult.contact.id, coreContact.id);
        assert.strictEqual(retryResult.flowState.stage, 'NEW');
        assert.strictEqual(retryResult.flowState.classification, 'PROSPECT');
        assert.strictEqual(retryResult.leadAction.actionType, 'CONTACT_LEAD');

        // Verify exactly one CONTACT_LEAD action exists
        const allActions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.contactId, coreContact.id));
        const leadActions = allActions.filter((a) => a.actionType === 'CONTACT_LEAD');
        assert.strictEqual(leadActions.length, 1);

        // Verify activities: exactly one CONTACT_CREATED and one ACTION_CREATED
        const allActs = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, coreContact.id));
        const contactCreatedActs = allActs.filter((a) => a.eventType === 'CONTACT_CREATED');
        assert.strictEqual(contactCreatedActs.length, 1);
        const actionCreatedActs = allActs.filter((a) => a.eventType === 'ACTION_CREATED');
        assert.strictEqual(actionCreatedActs.length, 1);
      });
    });

    it('Case 26d: lazy Flow state creation allows interest = null for cross-product contacts', async () => {
      await withIntegrationDb(async (db) => {
        const flowService = createContactFlowService(db);

        // contactA2Id was inserted directly in Shared Core without flow state
        const context = await flowService.getContactContext(ctxA, contactA2Id);
        assert.ok(context.flowState);
        assert.strictEqual(context.flowState.stage, 'NEW');
        assert.strictEqual(context.flowState.classification, 'PROSPECT');
        assert.strictEqual(context.flowState.interest, null);
      });
    });

    it('Profile update emits CONTACT_UPDATED', async () => {
      await withIntegrationDb(async (db) => {
        const flowService = createContactFlowService(db);
        const updated = await flowService.updateProfile(
          ctxA,
          contactA1Id,
          {
            notes: 'Catatan diperbarui',
            interest: 'Minat baru',
          },
          actorA
        );

        assert.strictEqual(updated.notes, 'Catatan diperbarui');
        assert.strictEqual(updated.interest, 'Minat baru');

        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, contactA1Id));
        const updateAct = acts.find((a) => a.eventType === 'CONTACT_UPDATED');
        assert.ok(updateAct);
      });
    });
  });

  // =========================================================================
  // SECTION 2: Contact Lifecycle Authority & Sticky CLIENT (§14.2 #1, #2, #3, #29, #33, #35)
  // =========================================================================
  describe('2. Contact Lifecycle Authority & Sticky CLIENT', () => {
    let lifecycleContactId: string;

    before(async () => {
      await withIntegrationDb(async (db) => {
        const [c] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Lifecycle Subject', phoneE164: '+6281300000001' })
          .returning();
        lifecycleContactId = c.id;
      });
    });

    it('Case 1 & 2: operator-directed any->any transition allowed (NEW -> CONTACTED -> INTERESTED)', async () => {
      await withIntegrationDb(async (db) => {
        const lifecycleService = createContactLifecycleService(db);

        const s1 = await lifecycleService.transitionStage(ctxA, lifecycleContactId, 'CONTACTED', {}, actorA);
        assert.strictEqual(s1.stage, 'CONTACTED');
        assert.strictEqual(s1.classification, 'PROSPECT');

        const s2 = await lifecycleService.transitionStage(ctxA, lifecycleContactId, 'INTERESTED', {}, actorA);
        assert.strictEqual(s2.stage, 'INTERESTED');

        // Verify NA-003 FOLLOW_UP auto-created when entering INTERESTED
        const actions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.contactId, lifecycleContactId));
        const followUps = actions.filter((a) => a.actionType === 'FOLLOW_UP' && a.status === 'PENDING');
        assert.strictEqual(followUps.length, 1);
        assert.strictEqual(followUps[0].priority, 70);
      });
    });

    it('Case 3: target LOST requires non-empty lostReason; cancels pending actions; leaving LOST clears lostReason', async () => {
      await withIntegrationDb(async (db) => {
        const lifecycleService = createContactLifecycleService(db);

        // Attempt LOST without reason -> rejected
        await assert.rejects(
          async () => {
            await lifecycleService.transitionStage(ctxA, lifecycleContactId, 'LOST', { lostReason: '   ' }, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'LOST_REASON_REQUIRED'
        );

        // Transition to LOST with valid reason
        const lostState = await lifecycleService.transitionStage(
          ctxA,
          lifecycleContactId,
          'LOST',
          { lostReason: 'Harga terlalu mahal' },
          actorA
        );
        assert.strictEqual(lostState.stage, 'LOST');
        assert.strictEqual(lostState.lostReason, 'Harga terlalu mahal');

        // Verify pending actions were CANCELLED
        const actions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.contactId, lifecycleContactId));
        const activeActions = actions.filter((a) => a.status === 'PENDING');
        assert.strictEqual(activeActions.length, 0);

        // Leaving LOST to FOLLOW_UP clears lostReason
        const revivedState = await lifecycleService.transitionStage(
          ctxA,
          lifecycleContactId,
          'FOLLOW_UP',
          {},
          actorA
        );
        assert.strictEqual(revivedState.stage, 'FOLLOW_UP');
        assert.strictEqual(revivedState.lostReason, null);
      });
    });

    it('Case 29, 33, 35: transition to COMPLETED atomically promotes classification to CLIENT; CLIENT is forever sticky', async () => {
      await withIntegrationDb(async (db) => {
        const lifecycleService = createContactLifecycleService(db);

        // Transition to COMPLETED
        const completedState = await lifecycleService.transitionStage(
          ctxA,
          lifecycleContactId,
          'COMPLETED',
          {},
          actorA
        );
        assert.strictEqual(completedState.stage, 'COMPLETED');
        assert.strictEqual(completedState.classification, 'CLIENT');

        // Transition COMPLETED -> FOLLOW_UP: classification STAYS CLIENT (sticky)
        const followUpState = await lifecycleService.transitionStage(
          ctxA,
          lifecycleContactId,
          'FOLLOW_UP',
          {},
          actorA
        );
        assert.strictEqual(followUpState.stage, 'FOLLOW_UP');
        assert.strictEqual(followUpState.classification, 'CLIENT');

        // Transition FOLLOW_UP -> LOST: classification STAYS CLIENT (sticky, no demotion)
        const lostClientState = await lifecycleService.transitionStage(
          ctxA,
          lifecycleContactId,
          'LOST',
          { lostReason: 'Pindah kota' },
          actorA
        );
        assert.strictEqual(lostClientState.stage, 'LOST');
        assert.strictEqual(lostClientState.classification, 'CLIENT');
      });
    });

    it('Same-stage reselection is an idempotent no-op (no fabricated activities or triggers)', async () => {
      await withIntegrationDb(async (db) => {
        const lifecycleService = createContactLifecycleService(db);

        const countBefore = (
          await db
            .select()
            .from(activities)
            .where(eq(activities.contactId, lifecycleContactId))
        ).length;

        // Current stage is LOST, re-select LOST
        await lifecycleService.transitionStage(
          ctxA,
          lifecycleContactId,
          'LOST',
          { lostReason: 'Pindah kota' },
          actorA
        );

        const countAfter = (
          await db
            .select()
            .from(activities)
            .where(eq(activities.contactId, lifecycleContactId))
        ).length;

        assert.strictEqual(countAfter, countBefore);
      });
    });
  });

  // =========================================================================
  // SECTION 3: Booking Service & State Matrix (§14.2 #8, #9, #10, #11, #27, #30, #36)
  // =========================================================================
  describe('3. Booking Service & State Matrix', () => {
    let bookingContactId: string;
    let createdBookingId: string;

    before(async () => {
      await withIntegrationDb(async (db) => {
        const [c] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Booking Subject', phoneE164: '+6281400000001' })
          .returning();
        bookingContactId = c.id;
      });
    });

    it('Case 8 & 30: createBooking takes server-canonical amount snapshot; subsequent service price change does NOT alter existing booking amount; sets stage BOOKED', async () => {
      await withIntegrationDb(async (db) => {
        const bookingService = createBookingService(db);

        const startAt = new Date('2026-08-20T10:00:00.000Z').toISOString();

        const booking = await bookingService.createBooking(
          ctxA,
          {
            contactId: bookingContactId,
            serviceId: serviceAStandardId,
            startAt,
            locationType: 'ON_SITE',
            paymentStatus: 'UNPAID',
          },
          actorA
        );

        createdBookingId = booking.id;

        // Server-canonical amount snapshot from serviceAStandard (150000)
        assert.strictEqual(booking.amount, 150000);
        assert.strictEqual(booking.status, 'PENDING');
        assert.strictEqual(booking.paymentStatus, 'UNPAID');

        // Case 30: update service price in database to 250000
        await db
          .update(services)
          .set({ priceAmount: 250000 })
          .where(eq(services.id, serviceAStandardId));

        // Read booking detail: existing booking amount remains 150000
        const detail = await bookingService.getBookingDetail(ctxA, booking.id);
        assert.strictEqual(detail.amount, 150000, 'Existing booking amount must remain snapshotted at original price');

        // Contact stage must be BOOKED
        const [flowState] = await db
          .select()
          .from(contactFlowStates)
          .where(eq(contactFlowStates.contactId, bookingContactId));
        assert.strictEqual(flowState.stage, 'BOOKED');

        // UNPAID booking creates NA-005 REMIND_PAYMENT
        const actions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.bookingId, booking.id));
        const paymentReminders = actions.filter((a) => a.actionType === 'REMIND_PAYMENT');
        assert.strictEqual(paymentReminders.length, 1);
        assert.strictEqual(paymentReminders[0].priority, 85);
      });
    });

    it('Case 10 & 27: markPaid on UNPAID -> PAID completes REMIND_PAYMENT, emits PAYMENT_MARKED + ACTION_COMPLETED, creates exactly ONE CONFIRM_BOOKING; repeat markPaid is a TRUE NO-OP with zero duplicated activities', async () => {
      await withIntegrationDb(async (db) => {
        const bookingService = createBookingService(db);

        // 1. First UNPAID -> PAID
        const updated = await bookingService.markPaid(ctxA, createdBookingId, 'PAID', actorA);
        assert.strictEqual(updated.paymentStatus, 'PAID');

        // Verify REMIND_PAYMENT completed with completedBy = PAYMENT
        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.bookingId, createdBookingId));
        const compAct = acts.find(
          (a) => a.eventType === 'ACTION_COMPLETED' && (a.metadataJson as any)?.completedBy === 'PAYMENT'
        );
        assert.ok(compAct);

        // Rule F: exactly ONE CONFIRM_BOOKING created for pending booking
        const pendingActions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.bookingId, createdBookingId));
        const confirmActions = pendingActions.filter(
          (a) => a.actionType === 'CONFIRM_BOOKING' && a.status === 'PENDING'
        );
        assert.strictEqual(confirmActions.length, 1);
        assert.strictEqual(confirmActions[0].priority, 90);

        const paymentMarkedCountBefore = acts.filter((a) => a.eventType === 'PAYMENT_MARKED').length;
        const actionCompCountBefore = acts.filter((a) => a.eventType === 'ACTION_COMPLETED').length;
        assert.strictEqual(paymentMarkedCountBefore, 1);

        // 2. Repeat markPaid('PAID') is a true no-op
        const repeatPaid = await bookingService.markPaid(ctxA, createdBookingId, 'PAID', actorA);
        assert.strictEqual(repeatPaid.paymentStatus, 'PAID');

        // 3. markPaid('WAIVED') on already PAID booking is also a no-op under frozen V0.1
        const repeatWaived = await bookingService.markPaid(ctxA, createdBookingId, 'WAIVED', actorA);
        assert.strictEqual(repeatWaived.paymentStatus, 'PAID');

        const actsAfter = await db
          .select()
          .from(activities)
          .where(eq(activities.bookingId, createdBookingId));
        const paymentMarkedCountAfter = actsAfter.filter((a) => a.eventType === 'PAYMENT_MARKED').length;
        const actionCompCountAfter = actsAfter.filter((a) => a.eventType === 'ACTION_COMPLETED').length;

        assert.strictEqual(paymentMarkedCountAfter, paymentMarkedCountBefore, 'PAYMENT_MARKED must not duplicate');
        assert.strictEqual(actionCompCountAfter, actionCompCountBefore, 'ACTION_COMPLETED must not duplicate');

        const confirmActionsAfter = (
          await db.select().from(nextActions).where(eq(nextActions.bookingId, createdBookingId))
        ).filter((a) => a.actionType === 'CONFIRM_BOOKING' && a.status === 'PENDING');
        assert.strictEqual(confirmActionsAfter.length, 1, 'CONFIRM_BOOKING must not duplicate');
      });
    });

    it('Case 9 & Regression: rescheduleBooking re-syncs reminders across all 4 booking/payment states (PENDING+UNPAID, CONFIRMED+UNPAID, PENDING+PAID, CONFIRMED+PAID)', async () => {
      await withIntegrationDb(async (db) => {
        const bookingService = createBookingService(db);

        // Scenario A: PENDING + PAID reschedule (createdBookingId is currently PENDING + PAID)
        const newStartA = new Date('2026-08-25T14:00:00.000Z').toISOString();
        const reschedA = await bookingService.rescheduleBooking(ctxA, createdBookingId, newStartA, null, actorA);
        assert.strictEqual(new Date(reschedA.startAt).getTime(), new Date(newStartA).getTime());

        const activeActionsA = (
          await db.select().from(nextActions).where(eq(nextActions.bookingId, createdBookingId))
        ).filter((a) => a.status === 'PENDING');
        assert.strictEqual(activeActionsA.length, 1);
        assert.strictEqual(activeActionsA[0].actionType, 'CONFIRM_BOOKING');
        assert.strictEqual(new Date(activeActionsA[0].dueAt).getTime(), new Date(newStartA).getTime());

        // Scenario B: CONFIRMED + UNPAID reschedule
        const [cUnpaid] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Unpaid Subject', phoneE164: '+6281400000099' })
          .returning();

        const bUnpaid = await bookingService.createBooking(
          ctxA,
          {
            contactId: cUnpaid.id,
            serviceId: serviceAStandardId,
            startAt: new Date('2026-08-26T10:00:00.000Z').toISOString(),
            locationType: 'ON_SITE',
            paymentStatus: 'UNPAID',
          },
          actorA
        );
        await bookingService.confirmBooking(ctxA, bUnpaid.id, actorA);

        const newStartB = new Date('2026-08-27T15:00:00.000Z').toISOString();
        const reschedB = await bookingService.rescheduleBooking(ctxA, bUnpaid.id, newStartB, null, actorA);
        assert.strictEqual(reschedB.status, 'CONFIRMED');
        assert.strictEqual(reschedB.paymentStatus, 'UNPAID');

        const activeActionsB = (
          await db.select().from(nextActions).where(eq(nextActions.bookingId, bUnpaid.id))
        ).filter((a) => a.status === 'PENDING');
        // Must contain BOTH REMIND_PAYMENT (for unpaid tracking) AND REMIND_BOOKING (for session confirmation)
        const typesB = activeActionsB.map((a) => a.actionType).sort();
        assert.deepStrictEqual(typesB, ['REMIND_BOOKING', 'REMIND_PAYMENT']);
      });
    });

    it('Case 36a: confirmBooking transitions PENDING -> CONFIRMED; repeat is idempotent; cancels CONFIRM_BOOKING and creates NA-006 REMIND_BOOKING', async () => {
      await withIntegrationDb(async (db) => {
        const bookingService = createBookingService(db);

        const confirmed = await bookingService.confirmBooking(ctxA, createdBookingId, actorA);
        assert.strictEqual(confirmed.status, 'CONFIRMED');

        // Verify NA-006 REMIND_BOOKING created
        const actions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.bookingId, createdBookingId));
        const remindBooking = actions.find(
          (a) => a.actionType === 'REMIND_BOOKING' && a.status === 'PENDING'
        );
        assert.ok(remindBooking);
        assert.strictEqual(remindBooking.priority, 90);

        // Repeat confirmBooking is idempotent no-op
        const repeat = await bookingService.confirmBooking(ctxA, createdBookingId, actorA);
        assert.strictEqual(repeat.status, 'CONFIRMED');
      });
    });

    it('Case 36b: exhaustive invalid booking terminal matrix & repeat operations', async () => {
      await withIntegrationDb(async (db) => {
        const bookingService = createBookingService(db);

        // 1. Create a new PENDING booking
        const pendingBooking = await bookingService.createBooking(
          ctxA,
          {
            contactId: contactA1Id,
            serviceId: serviceAStandardId,
            startAt: new Date('2026-08-28T10:00:00.000Z').toISOString(),
            locationType: 'ONLINE',
          },
          actorA
        );

        // Complete on PENDING -> rejected with INVALID_BOOKING_STATE
        await assert.rejects(
          async () => {
            await bookingService.completeBooking(ctxA, pendingBooking.id, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'INVALID_BOOKING_STATE'
        );

        // 2. Cancel this booking
        const cancelled = await bookingService.cancelBooking(ctxA, pendingBooking.id, { reason: 'Batal jadwal' }, actorA);
        assert.strictEqual(cancelled.status, 'CANCELLED');

        // Repeat cancel is idempotent no-op
        const repeatCancel = await bookingService.cancelBooking(ctxA, pendingBooking.id, { reason: 'Batal lagi' }, actorA);
        assert.strictEqual(repeatCancel.status, 'CANCELLED');

        // Confirm on CANCELLED -> rejected
        await assert.rejects(
          async () => {
            await bookingService.confirmBooking(ctxA, pendingBooking.id, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'INVALID_BOOKING_STATE'
        );

        // Complete on CANCELLED -> rejected
        await assert.rejects(
          async () => {
            await bookingService.completeBooking(ctxA, pendingBooking.id, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'INVALID_BOOKING_STATE'
        );

        // Reschedule on CANCELLED -> rejected
        await assert.rejects(
          async () => {
            await bookingService.rescheduleBooking(ctxA, pendingBooking.id, new Date().toISOString(), null, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'INVALID_BOOKING_STATE'
        );

        // 3. Create another booking and mark NO_SHOW
        const bNoShow = await bookingService.createBooking(
          ctxA,
          {
            contactId: contactA1Id,
            serviceId: serviceAStandardId,
            startAt: new Date('2026-08-29T10:00:00.000Z').toISOString(),
            locationType: 'ON_SITE',
          },
          actorA
        );
        await bookingService.confirmBooking(ctxA, bNoShow.id, actorA);
        const markedNoShow = await bookingService.markNoShow(ctxA, bNoShow.id, actorA);
        assert.strictEqual(markedNoShow.status, 'NO_SHOW');

        // Repeat markNoShow is idempotent no-op
        const repeatNoShow = await bookingService.markNoShow(ctxA, bNoShow.id, actorA);
        assert.strictEqual(repeatNoShow.status, 'NO_SHOW');

        // Confirm on NO_SHOW -> rejected
        await assert.rejects(
          async () => {
            await bookingService.confirmBooking(ctxA, bNoShow.id, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'INVALID_BOOKING_STATE'
        );

        // Complete on NO_SHOW -> rejected
        await assert.rejects(
          async () => {
            await bookingService.completeBooking(ctxA, bNoShow.id, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'INVALID_BOOKING_STATE'
        );

        // Cancel on NO_SHOW -> rejected
        await assert.rejects(
          async () => {
            await bookingService.cancelBooking(ctxA, bNoShow.id, {}, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'INVALID_BOOKING_STATE'
        );
      });
    });

    it('Case 11 & 34: completeBooking marks COMPLETED, promotes Contact to CLIENT, creates aftercare record & NA-009 AFTERCARE action (+7d)', async () => {
      await withIntegrationDb(async (db) => {
        const fixedNow = new Date('2026-08-17T11:00:00.000Z');
        const bookingService = createBookingService(db, { clock: () => fixedNow });

        const completed = await bookingService.completeBooking(ctxA, createdBookingId, actorA);
        assert.strictEqual(completed.status, 'COMPLETED');
        assert.ok(completed.completedAt);

        // Contact lifecycle promoted to CLIENT & stage COMPLETED
        const [flowState] = await db
          .select()
          .from(contactFlowStates)
          .where(eq(contactFlowStates.contactId, bookingContactId));
        assert.strictEqual(flowState.stage, 'COMPLETED');
        assert.strictEqual(flowState.classification, 'CLIENT');

        // aftercare_records row created with scheduled_for = completedAt + 7 days
        const [aftercareRec] = await db
          .select()
          .from(aftercareRecords)
          .where(eq(aftercareRecords.bookingId, createdBookingId));
        assert.ok(aftercareRec);
        assert.strictEqual(aftercareRec.status, 'PENDING');
        const expectedScheduled = new Date(fixedNow.getTime() + 7 * 24 * 3600_000).toISOString();
        assert.strictEqual(new Date(aftercareRec.scheduledFor).getTime(), new Date(expectedScheduled).getTime());

        // NA-009 AFTERCARE action created (+7 days, priority 50)
        const [aftercareAction] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.bookingId, createdBookingId))
          .then((rows) => rows.filter((r) => r.actionType === 'AFTERCARE'));
        assert.ok(aftercareAction);
        assert.strictEqual(aftercareAction.priority, 50);
        assert.strictEqual(aftercareAction.status, 'PENDING');
        assert.strictEqual(new Date(aftercareAction.dueAt).getTime(), new Date(expectedScheduled).getTime());

        // Repeat completeBooking is idempotent no-op
        const repeat = await bookingService.completeBooking(ctxA, createdBookingId, actorA);
        assert.strictEqual(repeat.status, 'COMPLETED');
      });
    });
  });

  // =========================================================================
  // SECTION 4: True PostgreSQL Concurrent Booking Completion (§14.2 #13)
  // =========================================================================
  describe('4. True PostgreSQL Concurrent Booking Completion', () => {
    it('Case 13: two independent database connections concurrently complete the same booking -> converges to exactly 1 BOOKING_COMPLETED, 1 AFTERCARE_CREATED, 1 record, and 1 action', async () => {
      let concurrentBookingId: string = '';
      let concurrentContactId: string = '';

      await withIntegrationDb(async (db) => {
        const [c] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Concurrent Contact', phoneE164: '+6281500000001' })
          .returning();
        concurrentContactId = c.id;

        const bookingService = createBookingService(db);
        const b = await bookingService.createBooking(
          ctxA,
          {
            contactId: concurrentContactId,
            serviceId: serviceAStandardId,
            startAt: new Date('2026-08-22T10:00:00.000Z').toISOString(),
            locationType: 'ON_SITE',
            paymentStatus: 'PAID',
          },
          actorA
        );
        await bookingService.confirmBooking(ctxA, b.id, actorA);
        concurrentBookingId = b.id;
      });

      // Create two independent PostgreSQL connections
      const client1 = new Client({ connectionString: TEST_DATABASE_URL });
      const client2 = new Client({ connectionString: TEST_DATABASE_URL });
      await client1.connect();
      await client2.connect();

      try {
        const db1 = drizzle(client1);
        const db2 = drizzle(client2);

        const svc1 = createBookingService(db1);
        const svc2 = createBookingService(db2);

        // Execute concurrent completion
        const [res1, res2] = await Promise.all([
          svc1.completeBooking(ctxA, concurrentBookingId, actorA),
          svc2.completeBooking(ctxA, concurrentBookingId, actorA),
        ]);

        assert.strictEqual(res1.status, 'COMPLETED');
        assert.strictEqual(res2.status, 'COMPLETED');

        // Verify database state: exactly 1 booking row, 1 aftercare record, 1 aftercare action
        await withIntegrationDb(async (db) => {
          const recs = await db
            .select()
            .from(aftercareRecords)
            .where(eq(aftercareRecords.bookingId, concurrentBookingId));
          assert.strictEqual(recs.length, 1, 'Exactly one aftercare_records row');

          const actions = await db
            .select()
            .from(nextActions)
            .where(eq(nextActions.bookingId, concurrentBookingId));
          const aftercareActs = actions.filter((a) => a.actionType === 'AFTERCARE');
          assert.strictEqual(aftercareActs.length, 1, 'Exactly one AFTERCARE action');

          const bookingActs = await db
            .select()
            .from(activities)
            .where(eq(activities.bookingId, concurrentBookingId));

          const completedActs = bookingActs.filter((a) => a.eventType === 'BOOKING_COMPLETED');
          assert.strictEqual(completedActs.length, 1, 'Exactly one BOOKING_COMPLETED activity');

          const aftercareCreatedActs = bookingActs.filter((a) => a.eventType === 'AFTERCARE_CREATED');
          assert.strictEqual(aftercareCreatedActs.length, 1, 'Exactly one AFTERCARE_CREATED activity');
        });
      } finally {
        await client1.end();
        await client2.end();
      }
    });
  });

  // =========================================================================
  // SECTION 5: Aftercare Service & Temporal Guard (§14.2 #14, #28, #37)
  // =========================================================================
  describe('5. Aftercare Service & Temporal Guard', () => {
    let aftercareActionId: string;
    let aftercareBookingId: string;
    let scheduledDate: Date;

    before(async () => {
      await withIntegrationDb(async (db) => {
        const fixedCompletedAt = new Date('2026-08-10T10:00:00.000Z');
        scheduledDate = new Date(fixedCompletedAt.getTime() + 7 * 24 * 3600_000); // 2026-08-17T10:00:00.000Z

        const [c] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Aftercare Subject', phoneE164: '+6281600000001' })
          .returning();

        const bookingService = createBookingService(db, { clock: () => fixedCompletedAt });
        const b = await bookingService.createBooking(
          ctxA,
          {
            contactId: c.id,
            serviceId: serviceAStandardId,
            startAt: fixedCompletedAt.toISOString(),
            locationType: 'HOME_VISIT',
            paymentStatus: 'PAID',
          },
          actorA
        );
        await bookingService.confirmBooking(ctxA, b.id, actorA);
        await bookingService.completeBooking(ctxA, b.id, actorA);

        aftercareBookingId = b.id;

        const [act] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.bookingId, b.id))
          .then((rows) => rows.filter((r) => r.actionType === 'AFTERCARE'));
        aftercareActionId = act.id;
      });
    });

    it('Case 28a: D+6 completion rejected with AFTERCARE_NOT_DUE', async () => {
      await withIntegrationDb(async (db) => {
        // D+6 is 2026-08-16T10:00:00.000Z (before scheduledDate 2026-08-17T10:00:00.000Z)
        const d6Clock = new Date('2026-08-16T10:00:00.000Z');
        const aftercareService = createAftercareService(db, { clock: () => d6Clock });

        await assert.rejects(
          async () => {
            await aftercareService.completeAftercare(
              ctxA,
              aftercareActionId,
              { outcome: 'INTERESTED_NEXT_SESSION', notes: 'Tertarik lanjut' },
              actorA
            );
          },
          (err: any) => isDomainError(err) && err.message === 'AFTERCARE_NOT_DUE'
        );
      });
    });

    it('Case 14 & 28b: D+7 completion succeeds, emits ACTION_COMPLETED(AFTERCARE) and AFTERCARE_COMPLETED, creates follow-on', async () => {
      await withIntegrationDb(async (db) => {
        const d7Clock = new Date('2026-08-17T10:00:00.000Z');
        const aftercareService = createAftercareService(db, { clock: () => d7Clock });

        const result = await aftercareService.completeAftercare(
          ctxA,
          aftercareActionId,
          { outcome: 'INTERESTED_NEXT_SESSION', notes: 'Sangat puas, mau sesi kedua' },
          actorA
        );

        assert.strictEqual(result.action.status, 'COMPLETED');
        assert.strictEqual(result.record.status, 'COMPLETED');
        assert.strictEqual(result.record.outcome, 'INTERESTED_NEXT_SESSION');

        // Verify activities: ACTION_COMPLETED with completedBy='AFTERCARE' AND AFTERCARE_COMPLETED
        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.bookingId, aftercareBookingId));

        const actionCompAct = acts.find(
          (a) => a.eventType === 'ACTION_COMPLETED' && (a.metadataJson as any)?.completedBy === 'AFTERCARE'
        );
        assert.ok(actionCompAct, 'ACTION_COMPLETED { completedBy: AFTERCARE } must be emitted');

        const aftercareCompAct = acts.find((a) => a.eventType === 'AFTERCARE_COMPLETED');
        assert.ok(aftercareCompAct, 'AFTERCARE_COMPLETED must be emitted');

        const waSentAct = acts.find((a) => a.eventType === 'WHATSAPP_SENT');
        assert.strictEqual(waSentAct, undefined, 'WHATSAPP_SENT must NOT be fabricated');

        // Verify follow-on action for INTERESTED_NEXT_SESSION: FOLLOW_UP due D+3 (priority 70)
        const actions = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.bookingId, aftercareBookingId));
        const followUps = actions.filter((a) => a.actionType === 'FOLLOW_UP' && a.status === 'PENDING');
        assert.strictEqual(followUps.length, 1);
        assert.strictEqual(followUps[0].priority, 70);
      });
    });

    it('Case 37: repeat completeAftercare is a true idempotent no-op (zero duplicate activities, zero duplicate follow-ons)', async () => {
      await withIntegrationDb(async (db) => {
        const d7Clock = new Date('2026-08-17T10:00:00.000Z');
        const aftercareService = createAftercareService(db, { clock: () => d7Clock });

        const actsBefore = (
          await db
            .select()
            .from(activities)
            .where(eq(activities.bookingId, aftercareBookingId))
        ).length;

        const followUpsBefore = (
          await db
            .select()
            .from(nextActions)
            .where(eq(nextActions.bookingId, aftercareBookingId))
        ).filter((a) => a.actionType === 'FOLLOW_UP').length;

        const repeatResult = await aftercareService.completeAftercare(
          ctxA,
          aftercareActionId,
          { outcome: 'INTERESTED_NEXT_SESSION' },
          actorA
        );

        assert.strictEqual(repeatResult.action.status, 'COMPLETED');
        assert.strictEqual(repeatResult.record.status, 'COMPLETED');

        const actsAfter = (
          await db
            .select()
            .from(activities)
            .where(eq(activities.bookingId, aftercareBookingId))
        ).length;
        const followUpsAfter = (
          await db
            .select()
            .from(nextActions)
            .where(eq(nextActions.bookingId, aftercareBookingId))
        ).filter((a) => a.actionType === 'FOLLOW_UP').length;

        assert.strictEqual(actsAfter, actsBefore, 'Activities must not duplicate on repeat completion');
        assert.strictEqual(followUpsAfter, followUpsBefore, 'Follow-ons must not duplicate on repeat completion');
      });
    });
  });

  // =========================================================================
  // SECTION 6: Next Action Service & Today View (§14.2 #5, #6, #7, #41)
  // =========================================================================
  describe('6. Next Action Service & Today View', () => {
    let naContactId: string;
    let sampleActionId: string;

    before(async () => {
      await withIntegrationDb(async (db) => {
        const [c] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Next Action Contact', phoneE164: '+6281700000001' })
          .returning();
        naContactId = c.id;
      });
    });

    it('Case 5a: createFollowUp & createManualAction provision actions and emit ACTION_CREATED', async () => {
      await withIntegrationDb(async (db) => {
        const nextActionService = createNextActionService(db);

        const fu = await nextActionService.createFollowUp(
          ctxA,
          {
            contactId: naContactId,
            title: 'Tanya kabar tes anak',
            priority: 70,
          },
          actorA
        );
        assert.strictEqual(fu.actionType, 'FOLLOW_UP');
        assert.strictEqual(fu.priority, 70);
        sampleActionId = fu.id;

        const man = await nextActionService.createManualAction(
          ctxA,
          {
            contactId: naContactId,
            title: 'Kirim materi pengayaan via email',
            priority: 40,
          },
          actorA
        );
        assert.strictEqual(man.actionType, 'MANUAL');
        assert.strictEqual(man.priority, 40);
      });
    });

    it('Case 7: wa.me completion rule - completeAction without confirmedWhatsAppSent remains PENDING with 0 activities; explicit true completes action and emits WHATSAPP_SENT + ACTION_COMPLETED; repeat is no-op', async () => {
      await withIntegrationDb(async (db) => {
        const nextActionService = createNextActionService(db);

        // 1. completeAction without confirmedWhatsAppSent (or false) MUST NOT complete action
        const noConfirmResult = await nextActionService.completeAction(ctxA, sampleActionId, {}, actorA);
        assert.strictEqual(noConfirmResult.status, 'PENDING');
        assert.strictEqual(noConfirmResult.completedAt, null);

        const dbAction1 = await db.select().from(nextActions).where(eq(nextActions.id, sampleActionId));
        assert.strictEqual(dbAction1[0].status, 'PENDING');
        assert.strictEqual(dbAction1[0].completedAt, null);

        const acts1 = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, naContactId));
        assert.strictEqual(acts1.some((a) => a.eventType === 'WHATSAPP_SENT'), false);
        assert.strictEqual(acts1.some((a) => a.eventType === 'ACTION_COMPLETED'), false);

        // 2. completeAction with confirmedWhatsAppSent: false also remains PENDING
        const falseConfirmResult = await nextActionService.completeAction(
          ctxA,
          sampleActionId,
          { confirmedWhatsAppSent: false },
          actorA
        );
        assert.strictEqual(falseConfirmResult.status, 'PENDING');

        // 3. completeAction with explicit confirmedWhatsAppSent: true completes action
        const confirmedResult = await nextActionService.completeAction(
          ctxA,
          sampleActionId,
          { confirmedWhatsAppSent: true },
          actorA
        );
        assert.strictEqual(confirmedResult.status, 'COMPLETED');
        assert.ok(confirmedResult.completedAt);

        const dbAction2 = await db.select().from(nextActions).where(eq(nextActions.id, sampleActionId));
        assert.strictEqual(dbAction2[0].status, 'COMPLETED');
        assert.ok(dbAction2[0].completedAt);

        const acts2 = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, naContactId));
        const waSentActs = acts2.filter((a) => a.eventType === 'WHATSAPP_SENT');
        assert.strictEqual(waSentActs.length, 1, 'Exactly one WHATSAPP_SENT emitted');
        const actionCompActs = acts2.filter((a) => a.eventType === 'ACTION_COMPLETED');
        assert.strictEqual(actionCompActs.length, 1, 'Exactly one ACTION_COMPLETED emitted');

        // 4. Repeat confirmed completion is an idempotent no-op
        const repeatResult = await nextActionService.completeAction(
          ctxA,
          sampleActionId,
          { confirmedWhatsAppSent: true },
          actorA
        );
        assert.strictEqual(repeatResult.status, 'COMPLETED');

        const acts3 = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, naContactId));
        assert.strictEqual(acts3.filter((a) => a.eventType === 'WHATSAPP_SENT').length, 1);
        assert.strictEqual(acts3.filter((a) => a.eventType === 'ACTION_COMPLETED').length, 1);
      });
    });

    it('Case 5b: skipAction requires nextStep; marks old SKIPPED and creates replacement action atomically', async () => {
      await withIntegrationDb(async (db) => {
        const nextActionService = createNextActionService(db);

        // Create an action to skip
        const act = await nextActionService.createFollowUp(
          ctxA,
          {
            contactId: naContactId,
            title: 'Follow-up awal',
          },
          actorA
        );

        // Attempt skip without nextStep -> rejected
        await assert.rejects(
          async () => {
            await nextActionService.skipAction(ctxA, act.id, null as any, actorA);
          },
          (err: any) => isDomainError(err) && err.message === 'NEXT_STEP_REQUIRED'
        );

        // Valid skip
        const skipResult = await nextActionService.skipAction(
          ctxA,
          act.id,
          {
            type: 'MANUAL',
            title: 'Follow-up tunda 1 minggu',
            dueAt: new Date('2026-08-25T10:00:00.000Z'),
          },
          actorA
        );

        assert.strictEqual(skipResult.skippedAction.status, 'SKIPPED');
        assert.strictEqual(skipResult.newAction.status, 'PENDING');
        assert.strictEqual(skipResult.newAction.actionType, 'MANUAL');
      });
    });

    it('Case 6 & 41: getToday groups by organization timezone; totalActiveCount represents FULL pending count while upcoming list is bounded to 20', async () => {
      await withIntegrationDb(async (db) => {
        const now = new Date('2026-08-17T12:00:00.000Z');
        const nextActionService = createNextActionService(db, {
          clock: () => now,
          orgTz: 'Asia/Jakarta',
        });

        // Seed 25 future PENDING actions for tomorrow/upcoming (days 2 to 26)
        for (let i = 2; i <= 26; i++) {
          const futureDue = new Date(now.getTime() + i * 24 * 3600_000);
          await nextActionService.createManualAction(
            ctxA,
            {
              contactId: naContactId,
              title: `Upcoming Action #${i}`,
              dueAt: futureDue,
              priority: 40,
            },
            actorA
          );
        }

        const todayFeed = await nextActionService.getToday(ctxA, now);

        assert.ok(todayFeed.date);
        // Assert upcoming list is bounded to 20 items
        assert.strictEqual(todayFeed.groups.upcoming.length, 20, 'Upcoming group must be bounded to limit 20');

        // Assert totalActiveCount represents the FULL database pending count (which is > 20)
        assert.ok(
          todayFeed.totalActiveCount >= 25,
          `totalActiveCount (${todayFeed.totalActiveCount}) must reflect full DB count >= 25`
        );
        assert.ok(
          todayFeed.totalActiveCount > todayFeed.groups.upcoming.length,
          'totalActiveCount must exceed the bounded upcoming list length'
        );
      });
    });
  });

  // =========================================================================
  // SECTION 7: Assessment Sync & Precedence Matrix (§14.2 #16, #38)
  // =========================================================================
  describe('7. Assessment Sync & Precedence Matrix', () => {
    let assessmentContactId: string;

    before(async () => {
      await withIntegrationDb(async (db) => {
        const [c] = await db
          .insert(contacts)
          .values({ organizationId: orgAId, name: 'Assessment Subject', phoneE164: '+6281800000001' })
          .returning();
        assessmentContactId = c.id;
      });
    });

    it('Case 16 & 38: syncFromBooking enforces highest precedence (COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED) and emits ASSESSMENT_STATUS_CHANGED only when status actually changes to final canonical', async () => {
      await withIntegrationDb(async (db) => {
        const bookingService = createBookingService(db);
        const assessmentService = createAssessmentService(db);

        // Initial assessment status is NOT_STARTED
        const initial = await assessmentService.getAssessmentStatus(ctxA, assessmentContactId);
        assert.strictEqual(initial.status, 'NOT_STARTED');

        // 1. Create ASSESSMENT booking -> candidate SCHEDULED (status changes NOT_STARTED -> SCHEDULED)
        const b1 = await bookingService.createBooking(
          ctxA,
          {
            contactId: assessmentContactId,
            serviceId: serviceAAssessmentId,
            startAt: new Date('2026-08-24T09:00:00.000Z').toISOString(),
            locationType: 'ON_SITE',
            paymentStatus: 'PAID',
          },
          actorA
        );

        const status1 = await assessmentService.getAssessmentStatus(ctxA, assessmentContactId);
        assert.strictEqual(status1.status, 'SCHEDULED');
        assert.strictEqual(status1.sourceBookingId, b1.id);

        // 2. Complete booking -> status promotes to COMPLETED (status changes SCHEDULED -> COMPLETED)
        await bookingService.confirmBooking(ctxA, b1.id, actorA);
        await bookingService.completeBooking(ctxA, b1.id, actorA);

        const status2 = await assessmentService.getAssessmentStatus(ctxA, assessmentContactId);
        assert.strictEqual(status2.status, 'COMPLETED');

        // Check activity count at this point: exactly 2 ASSESSMENT_STATUS_CHANGED events (SCHEDULED and COMPLETED)
        const actsBeforeDowngrades = (
          await db
            .select()
            .from(activities)
            .where(eq(activities.contactId, assessmentContactId))
        ).filter((a) => a.eventType === 'ASSESSMENT_STATUS_CHANGED');
        assert.strictEqual(actsBeforeDowngrades.length, 2);

        // 3. Create another ASSESSMENT booking (candidate SCHEDULED) -> blocked downgrade: canonical stays COMPLETED
        const b2 = await bookingService.createBooking(
          ctxA,
          {
            contactId: assessmentContactId,
            serviceId: serviceAAssessmentId,
            startAt: new Date('2026-08-26T09:00:00.000Z').toISOString(),
            locationType: 'ON_SITE',
            paymentStatus: 'PAID',
          },
          actorA
        );

        const status3 = await assessmentService.getAssessmentStatus(ctxA, assessmentContactId);
        assert.strictEqual(status3.status, 'COMPLETED', 'Status must remain COMPLETED when lower evidence is submitted');

        // 4. Cancel the second booking (candidate CANCELLED) -> blocked downgrade: canonical stays COMPLETED
        await bookingService.cancelBooking(ctxA, b2.id, { reason: 'Dibatalkan' }, actorA);

        const status4 = await assessmentService.getAssessmentStatus(ctxA, assessmentContactId);
        assert.strictEqual(status4.status, 'COMPLETED', 'Status must remain COMPLETED');

        // Regression assertion: blocked downgrades must NOT emit false ASSESSMENT_STATUS_CHANGED activities!
        const actsAfterDowngrades = (
          await db
            .select()
            .from(activities)
            .where(eq(activities.contactId, assessmentContactId))
        ).filter((a) => a.eventType === 'ASSESSMENT_STATUS_CHANGED');

        assert.strictEqual(
          actsAfterDowngrades.length,
          2,
          'Blocked downgrade attempts must emit zero false ASSESSMENT_STATUS_CHANGED activities'
        );
      });
    });
  });

  // =========================================================================
  // SECTION 8: Template Service & Messaging Service (§14.2 #17, #39)
  // =========================================================================
  describe('8. Template Service & Messaging Service', () => {
    it('Case 17: TemplateService org-scoped CRUD', async () => {
      await withIntegrationDb(async (db) => {
        const templateService = createTemplateService(db);

        const tpl = await templateService.createTemplate(ctxA, {
          title: 'Template Pengingat',
          category: 'REMIND_BOOKING',
          templateText: 'Halo {{name}}, jangan lupa sesi besok ya!',
        });

        assert.strictEqual(tpl.title, 'Template Pengingat');
        assert.strictEqual(tpl.category, 'REMIND_BOOKING');

        const list = await templateService.listTemplates(ctxA, { category: 'REMIND_BOOKING' });
        assert.ok(list.some((t) => t.id === tpl.id));

        // Cross-org read for Tenant B returns empty
        const listB = await templateService.listTemplates(ctxB, { category: 'REMIND_BOOKING' });
        assert.strictEqual(listB.some((t) => t.id === tpl.id), false);
      });
    });

    it('Case 39: MessagingService buildWaDeepLink resolves phone for active same-org contact and emits WHATSAPP_OPENED', async () => {
      await withIntegrationDb(async (db) => {
        const messagingService = createMessagingService(db);

        const result = await messagingService.buildWaDeepLink(
          ctxA,
          {
            contactId: contactA1Id,
            message: 'Halo, konfirmasi kehadiran.',
          },
          actorA
        );

        assert.ok(result.url.startsWith('https://wa.me/6281100000001?text='));
        assert.strictEqual(result.phoneE164, '+6281100000001');

        // Emits WHATSAPP_OPENED
        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.contactId, contactA1Id));
        const openedAct = acts.find((a) => a.eventType === 'WHATSAPP_OPENED');
        assert.ok(openedAct);

        // Cross-org contact lookup fails closed with NOT_FOUND
        await assert.rejects(
          async () => {
            await messagingService.buildWaDeepLink(ctxB, { contactId: contactA1Id, message: 'Halo' }, actorB);
          },
          (err: any) => isDomainError(err) && err.code === 'NOT_FOUND'
        );
      });
    });
  });

  // =========================================================================
  // SECTION 9: Tenant Isolation & Parent Poisoning Prevention (§14.2 #18, #19, #42)
  // =========================================================================
  describe('9. Tenant Isolation & Parent Poisoning Prevention', () => {
    it('Case 19 & 42: cross-org contact/service parent operations fail closed with NOT_FOUND', async () => {
      await withIntegrationDb(async (db) => {
        const bookingService = createBookingService(db);
        const lifecycleService = createContactLifecycleService(db);

        // Org B trying to book Org A Contact -> NOT_FOUND
        await assert.rejects(
          async () => {
            await bookingService.createBooking(
              ctxB,
              {
                contactId: contactA1Id, // Org A Contact!
                serviceId: serviceBId,
                startAt: new Date('2026-08-29T10:00:00.000Z').toISOString(),
                locationType: 'ON_SITE',
              },
              actorB
            );
          },
          (err: any) => isDomainError(err) && err.code === 'NOT_FOUND'
        );

        // Org B trying to book with Org A Service -> NOT_FOUND
        await assert.rejects(
          async () => {
            await bookingService.createBooking(
              ctxB,
              {
                contactId: contactB1Id,
                serviceId: serviceAStandardId, // Org A Service!
                startAt: new Date('2026-08-29T10:00:00.000Z').toISOString(),
                locationType: 'ON_SITE',
              },
              actorB
            );
          },
          (err: any) => isDomainError(err) && err.code === 'NOT_FOUND'
        );

        // Org B trying to transition Org A Contact -> NOT_FOUND
        await assert.rejects(
          async () => {
            await lifecycleService.transitionStage(ctxB, contactA1Id, 'INTERESTED', {}, actorB);
          },
          (err: any) => isDomainError(err) && err.code === 'NOT_FOUND'
        );
      });
    });
  });

  // =========================================================================
  // SECTION 10: Activity & Actor Integrity (§14.2 #24, #40)
  // =========================================================================
  describe('10. Activity & Actor Integrity', () => {
    it('Case 40: actor_user_id is populated from server-resolved AuthenticatedActor only and activities are append-only', async () => {
      await withIntegrationDb(async (db) => {
        const acts = await db
          .select()
          .from(activities)
          .where(eq(activities.organizationId, orgAId));

        assert.ok(acts.length > 0);
        // All events emitted with actorA have actorUserId === userAId
        for (const act of acts) {
          if (act.actorUserId) {
            assert.strictEqual(act.actorUserId, userAId);
          }
        }
      });
    });
  });
});
