import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { withIntegrationDb, applyMigrationsAsOwner, TEST_DATABASE_URL, pgErrorCode } from './test-env';
import { organizations } from '../../db/schema/organizations';
import { contacts } from '../../db/schema/contacts';
import { programs } from '../../db/schema/programs';
import { enrollments } from '../../db/schema/enrollments';
import { learningEvents, CANONICAL_LEARNING_EVENTS } from '../../db/schema/learning-events';
import { createLearningEventRepository } from '../../repositories/learning-event-repository';
import { createLearningEngineService } from '../../services/class/learning-engine-service';

const enabled = Boolean(TEST_DATABASE_URL);

describe('Canonical Learning Events Vocabulary & Tightening (§16, Migration 0008)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let testOrgId: string;
  let testContactId: string;
  let testProgramId: string;
  let testEnrollmentId: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const orgSlug = `org-canon-events-${Date.now()}`;
      const [org] = await db
        .insert(organizations)
        .values({
          name: 'Canonical Events Test Org',
          slug: orgSlug,
        })
        .returning();
      testOrgId = org.id;

      const [contact] = await db
        .insert(contacts)
        .values({
          organizationId: testOrgId,
          name: 'Canonical Learner',
          phoneE164: `+62812${Date.now().toString().slice(-8)}`,
        })
        .returning();
      testContactId = contact.id;

      const [program] = await db
        .insert(programs)
        .values({
          organizationId: testOrgId,
          title: 'Event Vocabulary Program',
          slug: `canon-prog-${Date.now()}`,
          programType: 'lead_magnet',
          status: 'published',
          pricing: 'free',
          priceAmount: 0,
        })
        .returning();
      testProgramId = program.id;

      const [enrollment] = await db
        .insert(enrollments)
        .values({
          organizationId: testOrgId,
          programId: testProgramId,
          contactId: testContactId,
          status: 'ENROLLED',
          learningStatus: 'NOT_STARTED',
        })
        .returning();
      testEnrollmentId = enrollment.id;
    });
  });

  it('accepts all 11 canonical learning events into database without constraint violation', async () => {
    await withIntegrationDb(async (db) => {
      const repo = createLearningEventRepository(db);

      assert.strictEqual(CANONICAL_LEARNING_EVENTS.length, 11);

      for (const eventType of CANONICAL_LEARNING_EVENTS) {
        const created = await repo.create({
          organizationId: testOrgId,
          enrollmentId: testEnrollmentId,
          contactId: testContactId,
          eventType,
          payload: { test: true, eventType },
        });

        assert.ok(created.id);
        assert.strictEqual(created.eventType, eventType);
      }
    });
  });

  it('rejects legacy uppercase event types at DB check constraint level fail-closed', async () => {
    const legacyEvents = [
      'LESSON_COMPLETED',
      'REFLECTION_SUBMITTED',
      'CTA_CLICKED',
      'PROGRAM_COMPLETED',
      'LEARNER_REGISTERED',
      'LEARNER_ENROLLED',
    ];

    await withIntegrationDb(async (db) => {
      for (const legacy of legacyEvents) {
        await assert.rejects(
          async () => {
            await db.insert(learningEvents).values({
              organizationId: testOrgId,
              enrollmentId: testEnrollmentId,
              contactId: testContactId,
              eventType: legacy,
              payload: {},
            });
          },
          (err: any) => {
            return (
              pgErrorCode(err) === '23514' ||
              err.message?.includes('check constraint') ||
              err.message?.includes('learning_events_event_type_check')
            );
          },
          `Legacy event ${legacy} must be rejected by check constraint`
        );
      }
    });
  });

  it('rejects arbitrary unknown event types at DB check constraint level fail-closed', async () => {
    const unknownEvents = [
      'random.event',
      'lesson.finished',
      'program.done',
      'cta.clicked.twice',
      'FOO_BAR',
      'unknown',
    ];

    await withIntegrationDb(async (db) => {
      for (const unknown of unknownEvents) {
        await assert.rejects(
          async () => {
            await db.insert(learningEvents).values({
              organizationId: testOrgId,
              enrollmentId: testEnrollmentId,
              contactId: testContactId,
              eventType: unknown,
              payload: {},
            });
          },
          (err: any) => {
            return (
              pgErrorCode(err) === '23514' ||
              err.message?.includes('check constraint') ||
              err.message?.includes('learning_events_event_type_check')
            );
          },
          `Unknown event ${unknown} must be rejected by check constraint`
        );
      }
    });
  });

  it('LearningEngineService accepts canonical event via recordLearningEvent and rejects legacy/unknown', async () => {
    await withIntegrationDb(async (db) => {
      const service = createLearningEngineService(db);

      // Canonical event succeeds
      const result = await service.recordLearningEvent({
        organizationId: testOrgId,
        enrollmentId: testEnrollmentId,
        eventType: 'cta.clicked',
        payload: { ctaLabel: 'Hubungi Mentor' },
        authenticatedContactId: testContactId,
      });

      assert.ok(result.enrollment);
      assert.strictEqual(result.enrollment.intentScore, 30); // Base 10 + CTA 20

      // Legacy uppercase fails closed at database layer
      await assert.rejects(
        async () => {
          await service.recordLearningEvent({
            organizationId: testOrgId,
            enrollmentId: testEnrollmentId,
            eventType: 'CTA_CLICKED' as any,
            payload: {},
            authenticatedContactId: testContactId,
          });
        },
        (err: any) => {
          return pgErrorCode(err) === '23514' || err.message?.includes('check constraint');
        }
      );
    });
  });
});
