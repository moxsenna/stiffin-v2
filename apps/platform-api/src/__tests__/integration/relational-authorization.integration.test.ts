import { describe, it, before } from 'node:test';
import assert from 'node:assert';
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
} from '../../db/schema';
import { createLearningEngineService } from '../../services/class/learning-engine-service';

const enabled = Boolean(TEST_DATABASE_URL);

describe('Relational Authorization & Hierarchy Validation Suite (§10, §11, §12, §34)', { skip: !enabled ? 'TEST_DATABASE_URL not set' : false }, () => {
  let org1Id: string;
  let org2Id: string;
  let prog1Id: string;
  let prog2Id: string;
  let lesson1Prog1Id: string;
  let lesson1Prog2Id: string;
  let contactAId: string;
  let contactBId: string;
  let enrollmentAProg1Id: string;
  let enrollmentBProg1Id: string;

  before(async () => {
    await applyMigrationsAsOwner();

    await withIntegrationDb(async (db) => {
      const now = Date.now();

      // Org 1 & Org 2
      const [o1] = await db.insert(organizations).values({ name: 'Org 1', slug: `org1-${now}` }).returning();
      const [o2] = await db.insert(organizations).values({ name: 'Org 2', slug: `org2-${now}` }).returning();
      org1Id = o1.id;
      org2Id = o2.id;

      // Contacts in Org 1
      const [cA] = await db.insert(contacts).values({
        organizationId: org1Id,
        name: 'Learner A',
        phoneE164: `+62818${Math.floor(10000000 + Math.random() * 90000000)}`,
      }).returning();
      const [cB] = await db.insert(contacts).values({
        organizationId: org1Id,
        name: 'Learner B',
        phoneE164: `+62818${Math.floor(10000000 + Math.random() * 90000000)}`,
      }).returning();
      contactAId = cA.id;
      contactBId = cB.id;

      // Program 1 in Org 1
      const [p1] = await db.insert(programs).values({
        organizationId: org1Id,
        title: 'Program 1',
        slug: `prog1-${now}`,
        programType: 'lead_magnet',
        status: 'published',
        pricing: 'free',
        priceAmount: 0,
      }).returning();
      prog1Id = p1.id;

      // Program 2 in Org 2
      const [p2] = await db.insert(programs).values({
        organizationId: org2Id,
        title: 'Program 2',
        slug: `prog2-${now}`,
        programType: 'lead_magnet',
        status: 'published',
        pricing: 'free',
        priceAmount: 0,
      }).returning();
      prog2Id = p2.id;

      // Modules & Lessons for Program 1
      const [m1] = await db.insert(modules).values({ programId: prog1Id, title: 'Mod 1', order: 1 }).returning();
      const [l1] = await db.insert(lessons).values({
        moduleId: m1.id,
        title: 'Lesson 1 Prog 1',
        order: 1,
        isRequired: true,
      }).returning();
      lesson1Prog1Id = l1.id;

      // Modules & Lessons for Program 2
      const [m2] = await db.insert(modules).values({ programId: prog2Id, title: 'Mod 2', order: 1 }).returning();
      const [l2] = await db.insert(lessons).values({
        moduleId: m2.id,
        title: 'Lesson 1 Prog 2',
        order: 1,
        isRequired: true,
      }).returning();
      lesson1Prog2Id = l2.id;

      // Enrollments in Program 1
      const [eA] = await db.insert(enrollments).values({
        organizationId: org1Id,
        programId: prog1Id,
        contactId: contactAId,
        status: 'ENROLLED',
      }).returning();
      const [eB] = await db.insert(enrollments).values({
        organizationId: org1Id,
        programId: prog1Id,
        contactId: contactBId,
        status: 'ENROLLED',
      }).returning();
      enrollmentAProg1Id = eA.id;
      enrollmentBProg1Id = eB.id;
    });
  });

  it('fails closed when Learner A attempts to complete Learner B enrollment (§10, §12)', async () => {
    await withIntegrationDb(async (db) => {
      const service = createLearningEngineService(db);
      await assert.rejects(
        () =>
          service.completeLesson({
            organizationId: org1Id,
            enrollmentId: enrollmentBProg1Id,
            lessonId: lesson1Prog1Id,
            authenticatedContactId: contactAId, // Wrong learner!
          }),
        (err: any) => {
          assert.strictEqual(err.code, 'FORBIDDEN');
          return true;
        }
      );
    });
  });

  it('fails closed when cross-tenant organization ID mismatch is attempted (§10)', async () => {
    await withIntegrationDb(async (db) => {
      const service = createLearningEngineService(db);
      await assert.rejects(
        () =>
          service.completeLesson({
            organizationId: org2Id, // Cross-tenant spoofing!
            enrollmentId: enrollmentAProg1Id,
            lessonId: lesson1Prog1Id,
            authenticatedContactId: contactAId,
          }),
        (err: any) => {
          assert.ok(err.code === 'FORBIDDEN' || err.code === 'NOT_FOUND', `Expected FORBIDDEN or NOT_FOUND, got ${err.code}`);
          return true;
        }
      );
    });
  });

  it('fails closed when completing lesson from a different program (§11)', async () => {
    await withIntegrationDb(async (db) => {
      const service = createLearningEngineService(db);
      await assert.rejects(
        () =>
          service.completeLesson({
            organizationId: org1Id,
            enrollmentId: enrollmentAProg1Id,
            lessonId: lesson1Prog2Id, // Lesson belongs to Prog 2 in Org 2!
            authenticatedContactId: contactAId,
          }),
        (err: any) => {
          assert.strictEqual(err.code, 'NOT_FOUND');
          return true;
        }
      );
    });
  });

  it('fails closed when submitting reflection on a lesson from a different program (§11)', async () => {
    await withIntegrationDb(async (db) => {
      const service = createLearningEngineService(db);
      await assert.rejects(
        () =>
          service.submitReflection({
            organizationId: org1Id,
            enrollmentId: enrollmentAProg1Id,
            lessonId: lesson1Prog2Id, // Foreign lesson
            responseText: 'My thoughts',
            authenticatedContactId: contactAId,
          }),
        (err: any) => {
          assert.strictEqual(err.code, 'NOT_FOUND');
          return true;
        }
      );
    });
  });

  it('fails closed when recording CTA click on a lesson from a different program (§11)', async () => {
    await withIntegrationDb(async (db) => {
      const service = createLearningEngineService(db);
      await assert.rejects(
        () =>
          service.recordCtaClick({
            organizationId: org1Id,
            enrollmentId: enrollmentAProg1Id,
            lessonId: lesson1Prog2Id, // Foreign lesson
            authenticatedContactId: contactAId,
          }),
        (err: any) => {
          assert.strictEqual(err.code, 'NOT_FOUND');
          return true;
        }
      );
    });
  });
});
