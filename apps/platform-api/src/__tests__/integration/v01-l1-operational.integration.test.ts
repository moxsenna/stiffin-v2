import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { sql, eq, and } from 'drizzle-orm';
import {
  withIntegrationDb,
  TEST_DATABASE_URL,
  applyMigrationsAsOwner,
} from './test-env';
import {
  organizations,
  contacts,
  programs,
  modules,
  lessons,
  enrollments,
  learnerSessions,
  learnerAccessTokens,
  reflectionResponses,
  bookings,
  services,
  nextActions,
  activities,
  productEntitlements,
  learningEvents,
  learningSignals,
} from '../../db/schema';
import { createInactivitySweepService } from '../../services/class/inactivity-sweep-service';
import { createContactPrivacyService } from '../../services/contact-privacy-service';
import { createEnrollmentService } from '../../services/class/enrollment-service';
import { createLearningEngineService } from '../../services/class/learning-engine-service';
import { DomainError } from '../../core/errors';

const enabled = Boolean(TEST_DATABASE_URL);

describe('V0.1 L1 Operational Readiness Suite (Inactivity Sweep & Privacy Deletion)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testProgramId: string;
  let testLesson1Id: string;
  let testLesson2Id: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();
      const [org] = await db
        .insert(organizations)
        .values({
          name: 'L1 Operational Test Org',
          slug: `l1-ops-${now}`,
        })
        .returning();
      testOrgId = org.id;

      await db.insert(productEntitlements).values({
        organizationId: testOrgId,
        promotorClass: true,
        promotorFlow: true,
      });

      const [prog] = await db
        .insert(programs)
        .values({
          organizationId: testOrgId,
          title: 'Arsitektur Cloudflare Workers L1',
          slug: `prog-l1-${now}`,
          programType: 'lead_magnet',
          accessType: 'public',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      testProgramId = prog.id;

      const [mod] = await db
        .insert(modules)
        .values({
          programId: testProgramId,
          title: 'Modul 1 — Operational Mastery',
          order: 0,
        })
        .returning();

      const [l1] = await db
        .insert(lessons)
        .values({
          moduleId: mod.id,
          title: 'Pelajaran 1 — Scheduled Jobs',
          order: 0,
          isRequired: true,
          videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          videoProvider: 'youtube',
        })
        .returning();
      testLesson1Id = l1.id;

      const [l2] = await db
        .insert(lessons)
        .values({
          moduleId: mod.id,
          title: 'Pelajaran 2 — Privacy & GDPR',
          order: 1,
          isRequired: true,
          reflectionType: 'long_text',
          reflectionPrompt: 'Bagaimana Anda merancang penghapusan PII?',
        })
        .returning();
      testLesson2Id = l2.id;
    });
  });

  describe('1. L1-A Inactivity / At-Risk Sweep Engine (§13, §16)', () => {
    it('detects inactive learner (> 7 days, progress < 50%), transitions to AT_RISK, and emits learner.inactive exactly once', async () => {
      await withIntegrationDb(async (db) => {
        const enrollmentService = createEnrollmentService(db);
        const fixedNow = new Date('2026-08-20T12:00:00Z');
        const eightDaysAgo = new Date(fixedNow.getTime() - 8 * 24 * 60 * 60 * 1000);

        // 1. Register learner
        const reg = await enrollmentService.registerPublicLearner({
          slug: (await db.select().from(organizations).where(eq(organizations.id, testOrgId)))[0].slug,
          programSlug: (await db.select().from(programs).where(eq(programs.id, testProgramId)))[0].slug,
          name: 'Inactive Learner Test',
          phoneRaw: '+6281299990001',
        });

        // 2. Artificially backdate enrolledAt and lastActivityAt to 8 days ago
        await db
          .update(enrollments)
          .set({
            enrolledAt: eightDaysAgo.toISOString(),
            lastActivityAt: eightDaysAgo.toISOString(),
            progressPercent: 0,
            learningStatus: 'NOT_STARTED',
          })
          .where(eq(enrollments.id, reg.enrollmentId));

        // 3. Execute Inactivity Sweep with injected clock
        const sweepService = createInactivitySweepService(db, {
          clock: () => fixedNow,
        });

        const result1 = await sweepService.executeSweep();
        assert.ok(result1.scannedCount >= 1);
        assert.ok(result1.atRiskCount >= 1);
        assert.strictEqual(result1.errors.length, 0);

        // Verify enrollment state updated to AT_RISK
        const [updatedEnr] = await db
          .select()
          .from(enrollments)
          .where(eq(enrollments.id, reg.enrollmentId));
        assert.strictEqual(updatedEnr.learningStatus, 'AT_RISK');

        // Verify canonical learner.inactive event was emitted
        const events = await db
          .select()
          .from(learningEvents)
          .where(
            and(
              eq(learningEvents.enrollmentId, reg.enrollmentId),
              eq(learningEvents.eventType, 'learner.inactive')
            )
          );
        assert.strictEqual(events.length, 1);
        assert.ok(events[0].payload);
        assert.strictEqual((events[0].payload as any).daysInactive, 8);

        // Verify learning signal LEARNER_INACTIVE created with provenance
        const signals = await db
          .select()
          .from(learningSignals)
          .where(
            and(
              eq(learningSignals.enrollmentId, reg.enrollmentId),
              eq(learningSignals.reason, 'LEARNER_INACTIVE')
            )
          );
        assert.strictEqual(signals.length, 1);
        assert.strictEqual(signals[0].sourceEventId, events[0].id);

        // 4. Repeated sweep: MUST be idempotent with zero duplicate events or signals
        const result2 = await sweepService.executeSweep();
        assert.strictEqual(result2.emittedEventsCount, 0, 'Duplicate sweep must emit 0 new events');

        const eventsAfterRetry = await db
          .select()
          .from(learningEvents)
          .where(
            and(
              eq(learningEvents.enrollmentId, reg.enrollmentId),
              eq(learningEvents.eventType, 'learner.inactive')
            )
          );
        assert.strictEqual(eventsAfterRetry.length, 1, 'Events count must remain exactly 1');
      });
    });

    it('does NOT mark completed learners or learners with progress >= 50% as AT_RISK', async () => {
      await withIntegrationDb(async (db) => {
        const enrollmentService = createEnrollmentService(db);
        const fixedNow = new Date('2026-08-20T12:00:00Z');
        const eightDaysAgo = new Date(fixedNow.getTime() - 8 * 24 * 60 * 60 * 1000);

        const reg = await enrollmentService.registerPublicLearner({
          slug: (await db.select().from(organizations).where(eq(organizations.id, testOrgId)))[0].slug,
          programSlug: (await db.select().from(programs).where(eq(programs.id, testProgramId)))[0].slug,
          name: 'Active Progress Learner',
          phoneRaw: '+6281299990002',
        });

        // Set progress to 50% and backdate activity
        await db
          .update(enrollments)
          .set({
            enrolledAt: eightDaysAgo.toISOString(),
            lastActivityAt: eightDaysAgo.toISOString(),
            progressPercent: 50,
            learningStatus: 'IN_PROGRESS',
          })
          .where(eq(enrollments.id, reg.enrollmentId));

        const sweepService = createInactivitySweepService(db, {
          clock: () => fixedNow,
        });

        await sweepService.executeSweep();

        const [enr] = await db
          .select()
          .from(enrollments)
          .where(eq(enrollments.id, reg.enrollmentId));

        assert.strictEqual(enr.learningStatus, 'IN_PROGRESS', 'Learner with 50% progress must not be AT_RISK');
      });
    });
  });

  describe('2. L1-B Contact Privacy & Data Anonymization (§13, PDP/GDPR)', () => {
    it('anonymizes contact PII, revokes sessions/tokens, redacts reflections, and logs audit activity', async () => {
      await withIntegrationDb(async (db) => {
        const enrollmentService = createEnrollmentService(db);
        const learningService = createLearningEngineService(db);
        const privacyService = createContactPrivacyService(db);

        // 1. Register learner
        const reg = await enrollmentService.registerPublicLearner({
          slug: (await db.select().from(organizations).where(eq(organizations.id, testOrgId)))[0].slug,
          programSlug: (await db.select().from(programs).where(eq(programs.id, testProgramId)))[0].slug,
          name: 'Private Citizen',
          phoneRaw: '+6281288889999',
        });

        // 2. Submit reflection with sensitive text
        await learningService.submitReflection({
          organizationId: testOrgId,
          enrollmentId: reg.enrollmentId,
          lessonId: testLesson2Id,
          responseText: 'Ini adalah jawaban refleksi yang bersifat sangat pribadi.',
          authenticatedContactId: reg.contactId,
        });

        // 3. Create a service and booking
        const [srv] = await db
          .insert(services)
          .values({
            organizationId: testOrgId,
            name: 'Konsultasi Privat',
            category: 'SESSION',
            durationMinutes: 45,
            priceAmount: 250000,
          })
          .returning();

        const [booking] = await db
          .insert(bookings)
          .values({
            organizationId: testOrgId,
            contactId: reg.contactId,
            serviceId: srv.id,
            amount: 250000,
            locationType: 'ONLINE',
            startAt: new Date().toISOString(),
            endAt: new Date(Date.now() + 3600000).toISOString(),
            status: 'CONFIRMED',
            notes: 'Catatan konsultasi rahasia',
          })
          .returning();

        // 4. Create pending NextAction
        await db.insert(nextActions).values({
          organizationId: testOrgId,
          contactId: reg.contactId,
          bookingId: booking.id,
          actionType: 'FOLLOW_UP',
          title: 'Tindak lanjut privat',
          priority: 50,
          status: 'PENDING',
          dueAt: new Date().toISOString(),
        });

        // 5. Execute privacy anonymization
        const result = await privacyService.anonymizeContact(testOrgId, reg.contactId, 'actor_admin_1');
        assert.strictEqual(result.contactId, reg.contactId);
        assert.strictEqual(result.anonymized, true);

        // 6. Assert PII in contacts table is scrubbed
        const [anonymizedContact] = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, reg.contactId));

        assert.strictEqual(anonymizedContact.name, '[ANONIM]');
        assert.ok(anonymizedContact.phoneE164.startsWith('+62800'));
        assert.strictEqual(anonymizedContact.email, null);
        assert.ok(anonymizedContact.deletedAt);

        // 7. Assert sessions and access tokens are completely deleted/revoked
        const remainingSessions = await db
          .select()
          .from(learnerSessions)
          .where(eq(learnerSessions.contactId, reg.contactId));
        assert.strictEqual(remainingSessions.length, 0, 'Learner sessions must be revoked');

        const remainingTokens = await db
          .select()
          .from(learnerAccessTokens)
          .where(eq(learnerAccessTokens.contactId, reg.contactId));
        assert.strictEqual(remainingTokens.length, 0, 'Learner access tokens must be revoked');

        // 8. Assert reflection response text is redacted
        const [ref] = await db
          .select()
          .from(reflectionResponses)
          .where(eq(reflectionResponses.enrollmentId, reg.enrollmentId));
        assert.strictEqual(ref.responseText, '[REDACTED]', 'Reflection text must be redacted');

        // 9. Assert booking notes scrubbed
        const [bk] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, booking.id));
        assert.strictEqual(bk.notes, null);

        // 10. Assert pending next actions cancelled
        const [act] = await db
          .select()
          .from(nextActions)
          .where(eq(nextActions.contactId, reg.contactId));
        assert.strictEqual(act.status, 'CANCELLED');

        // 11. Assert audit activity log created
        const auditActivities = await db
          .select()
          .from(activities)
          .where(
            and(
              eq(activities.contactId, reg.contactId),
              eq(activities.eventType, 'CONTACT_UPDATED')
            )
          );
        assert.strictEqual(auditActivities.length, 1);
        assert.strictEqual(auditActivities[0].actorUserId, 'actor_admin_1');
      });
    });

    it('cross-tenant privacy anonymization fails closed with NOT_FOUND', async () => {
      await withIntegrationDb(async (db) => {
        const [orgOther] = await db
          .insert(organizations)
          .values({
            name: 'Other Org Privacy Test',
            slug: `other-org-priv-${Date.now()}`,
          })
          .returning();

        const [contact] = await db
          .insert(contacts)
          .values({
            organizationId: testOrgId,
            name: 'Tenant Protected Contact',
            phoneE164: '+6281299998888',
          })
          .returning();

        const privacyService = createContactPrivacyService(db);

        await assert.rejects(
          async () => {
            await privacyService.anonymizeContact(orgOther.id, contact.id);
          },
          (err: any) => {
            assert.ok(err instanceof DomainError);
            assert.strictEqual(err.code, 'NOT_FOUND');
            return true;
          }
        );
      });
    });
  });
});
