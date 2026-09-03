import { Client } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { assertStagingEnvironment, DEMO_IDS } from './seed-staging-demo';

import {
  organizations,
  users,
  organizationMembers,
  productEntitlements,
  programs,
  modules,
  lessons,
  contacts,
  enrollments,
  learningEvents,
  nextActions,
  bookings,
  aftercareRecords,
  CANONICAL_LEARNING_EVENTS,
} from '../src/db/schema';

export interface VerificationResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; details?: string }>;
  summary: {
    orgSlug: string;
    promoterEmail: string;
    programsCount: number;
    publishedCount: number;
    draftCount: number;
    contactsCount: number;
    classLearnersCount: number;
    flowOnlyContactsCount: number;
    ayuEnrollmentCount: number;
    classNextActionsCount: number;
    pendingBookingsCount: number;
    confirmedBookingsCount: number;
    completedBookingsCount: number;
    aftercareCount: number;
    unknownEventsCount: number;
    duplicateMilestonesCount: number;
  };
}

export async function verifyStagingDemo(db: NodePgDatabase): Promise<VerificationResult> {
  assertStagingEnvironment();

  console.log('[VERIFY] Running Canonical Staging Demo Dataset Verification...');

  const checks: Array<{ name: string; passed: boolean; details?: string }> = [];

  function recordCheck(name: string, condition: boolean, details?: string) {
    checks.push({ name, passed: condition, details });
    if (!condition) {
      console.error(`  ❌ FAILED: ${name} ${details ? `(${details})` : ''}`);
    } else {
      console.log(`  ✅ PASSED: ${name}`);
    }
  }

  // 1. Organization Check
  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, DEMO_IDS.organization));

  recordCheck('1. Demo Organization Exists', orgRows.length === 1 && orgRows[0].slug === 'demo-promotor', `Found ${orgRows.length} orgs`);

  // 2. Promoter Better Auth User & Owner Membership
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, DEMO_IDS.promoterUser));

  const memberRows = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, DEMO_IDS.organization),
        eq(organizationMembers.userId, DEMO_IDS.promoterUser)
      )
    );

  recordCheck(
    '2. Promoter User & Owner Membership',
    userRows.length === 1 && memberRows.length === 1 && memberRows[0].role === 'owner',
    `User: ${userRows.length}, Role: ${memberRows[0]?.role}`
  );

  // 3. Product Entitlements (BUNDLE_AVAILABLE)
  const entRows = await db
    .select()
    .from(productEntitlements)
    .where(eq(productEntitlements.organizationId, DEMO_IDS.organization));

  const isClassEntitled = entRows[0]?.promotorClass === true;
  const isFlowEntitled = entRows[0]?.promotorFlow === true;

  recordCheck(
    '3. Product Entitlements BUNDLE_AVAILABLE',
    entRows.length === 1 && isClassEntitled && isFlowEntitled,
    `Class: ${isClassEntitled}, Flow: ${isFlowEntitled}`
  );

  // 4. Programs & Curriculum
  const progRows = await db
    .select()
    .from(programs)
    .where(eq(programs.organizationId, DEMO_IDS.organization));

  const publishedProgs = progRows.filter((p: any) => p.status === 'published');
  const draftProgs = progRows.filter((p: any) => p.status === 'draft');

  recordCheck(
    '4. Programs Count (>=4 total, >=3 published, >=1 draft)',
    progRows.length >= 4 && publishedProgs.length >= 3 && draftProgs.length >= 1,
    `Total: ${progRows.length}, Published: ${publishedProgs.length}, Draft: ${draftProgs.length}`
  );

  // Lessons breakdown
  const progIds = progRows.map((p: any) => p.id);
  const modRows = progIds.length > 0
    ? await db.select().from(modules).where(inArray(modules.programId, progIds))
    : [];

  const modIds = modRows.map((m: any) => m.id);
  const lesRows = modIds.length > 0
    ? await db.select().from(lessons).where(inArray(lessons.moduleId, modIds))
    : [];

  const textLessons = lesRows.filter((l: any) => Boolean(l.textContent));
  const youtubeLessons = lesRows.filter((l: any) => l.videoProvider === 'youtube' && Boolean(l.videoUrl));
  const reflectionLessons = lesRows.filter((l: any) => Boolean(l.reflectionType));
  const ctaLessons = lesRows.filter((l: any) => Boolean(l.ctaType));

  recordCheck(
    '5. Curriculum Completeness (Text, YouTube, Reflection, CTA)',
    textLessons.length >= 4 && youtubeLessons.length >= 3 && reflectionLessons.length >= 3 && ctaLessons.length >= 2,
    `Text: ${textLessons.length}, YouTube: ${youtubeLessons.length}, Reflection: ${reflectionLessons.length}, CTA: ${ctaLessons.length}`
  );

  // 5. Contacts & Identity Separation (Contact != Learner)
  const contactRows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.organizationId, DEMO_IDS.organization), isNull(contacts.deletedAt)));

  const enrollmentRows = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.organizationId, DEMO_IDS.organization));

  const enrolledContactIds = new Set(enrollmentRows.map((e: any) => e.contactId));
  const classLearners = contactRows.filter((c: any) => enrolledContactIds.has(c.id));
  const flowOnlyContacts = contactRows.filter((c: any) => !enrolledContactIds.has(c.id));

  recordCheck('6. Total Contacts >= 8', contactRows.length >= 8, `Found ${contactRows.length} contacts`);
  recordCheck(
    '7. Flow-Only Contacts >= 2 (Contact != Learner Proof)',
    flowOnlyContacts.length >= 2 && classLearners.length >= 6,
    `Class Learners: ${classLearners.length}, Flow-Only Contacts: ${flowOnlyContacts.length}`
  );

  // 6. Primary Demo Learner (Ayu Rahma)
  const ayuEnrollments = enrollmentRows.filter((e: any) => e.contactId === DEMO_IDS.contactAyu);
  const ayuCompleted = ayuEnrollments.filter((e: any) => e.status === 'COMPLETED' && e.progressPercent === 100);
  const ayuActive = ayuEnrollments.filter((e: any) => e.status === 'STARTED' || e.status === 'ENROLLED');

  recordCheck(
    '8. Primary Demo Learner (Ayu Rahma) Multiple Programs',
    ayuEnrollments.length >= 3 && ayuCompleted.length >= 1 && ayuActive.length >= 2,
    `Total: ${ayuEnrollments.length}, Completed: ${ayuCompleted.length}, Active: ${ayuActive.length}`
  );

  // 7. Learning Events & Integrity
  const eventRows = await db
    .select()
    .from(learningEvents)
    .where(eq(learningEvents.organizationId, DEMO_IDS.organization));

  const canonicalEventSet = new Set<string>(CANONICAL_LEARNING_EVENTS);
  const unknownEvents = eventRows.filter((e: any) => !canonicalEventSet.has(e.eventType));
  const reactivatedEvents = eventRows.filter((e: any) => e.eventType === 'learner.reactivated');

  recordCheck(
    '9. Learning Events Canonical Vocabulary (0 Unknown, 0 Reactivated)',
    unknownEvents.length === 0 && reactivatedEvents.length === 0,
    `Total Events: ${eventRows.length}, Unknown: ${unknownEvents.length}, Reactivated: ${reactivatedEvents.length}`
  );

  // Duplicate milestone checks
  const milestoneEvents = eventRows.filter((e: any) =>
    ['program.progress_50', 'program.progress_80', 'program.completed', 'learner.registered', 'learner.enrolled'].includes(e.eventType)
  );
  const seenMilestones = new Set<string>();
  let duplicateMilestones = 0;
  for (const me of milestoneEvents) {
    const key = `${me.enrollmentId}:${me.eventType}`;
    if (seenMilestones.has(key)) {
      duplicateMilestones++;
    }
    seenMilestones.add(key);
  }

  recordCheck('10. Milestone Events Exactly-Once (0 Duplicates)', duplicateMilestones === 0, `Duplicates: ${duplicateMilestones}`);

  // 8. Class -> Flow Bridge (Learning Signal -> NextAction)
  const classNextActions = await db
    .select()
    .from(nextActions)
    .where(
      and(
        eq(nextActions.organizationId, DEMO_IDS.organization),
        eq(nextActions.source, 'PROMOTORCLASS')
      )
    );

  recordCheck(
    '11. Class -> Flow Integration NextAction Present',
    classNextActions.length >= 1 && Boolean(classNextActions[0].idempotencyKey),
    `Found ${classNextActions.length} Class NextActions`
  );

  // 9. Bookings & Aftercare D+7
  const bookingRows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.organizationId, DEMO_IDS.organization));

  const pendingBookings = bookingRows.filter((b: any) => b.status === 'PENDING');
  const confirmedBookings = bookingRows.filter((b: any) => b.status === 'CONFIRMED' && b.paymentStatus === 'PAID');
  const completedBookings = bookingRows.filter((b: any) => b.status === 'COMPLETED' && b.paymentStatus === 'PAID');

  const aftercareList = await db
    .select()
    .from(aftercareRecords)
    .where(eq(aftercareRecords.organizationId, DEMO_IDS.organization));

  recordCheck(
    '12. Bookings Lifecycle States (Pending, Confirmed, Completed)',
    pendingBookings.length >= 1 && confirmedBookings.length >= 1 && completedBookings.length >= 1,
    `Pending: ${pendingBookings.length}, Confirmed: ${confirmedBookings.length}, Completed: ${completedBookings.length}`
  );

  recordCheck(
    '13. Completed Booking Aftercare Exactly-Once',
    aftercareList.length === 1 && aftercareList[0].status === 'PENDING',
    `Aftercare Records: ${aftercareList.length}`
  );

  const allPassed = checks.every((c) => c.passed);

  console.log(`\n[VERIFY] Verification Summary: ${allPassed ? 'ALL CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'}`);

  return {
    passed: allPassed,
    checks,
    summary: {
      orgSlug: orgRows[0]?.slug || 'unknown',
      promoterEmail: userRows[0]?.email || 'unknown',
      programsCount: progRows.length,
      publishedCount: publishedProgs.length,
      draftCount: draftProgs.length,
      contactsCount: contactRows.length,
      classLearnersCount: classLearners.length,
      flowOnlyContactsCount: flowOnlyContacts.length,
      ayuEnrollmentCount: ayuEnrollments.length,
      classNextActionsCount: classNextActions.length,
      pendingBookingsCount: pendingBookings.length,
      confirmedBookingsCount: confirmedBookings.length,
      completedBookingsCount: completedBookings.length,
      aftercareCount: aftercareList.length,
      unknownEventsCount: unknownEvents.length,
      duplicateMilestonesCount: duplicateMilestones,
    },
  };
}

// Standalone execution entrypoint
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('verify-staging-demo.ts');

if (isDirectRun) {
  const dbUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: Database URL missing. Provide STAGING_DATABASE_URL.');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  client
    .connect()
    .then(async () => {
      const db = drizzle(client);
      const res = await verifyStagingDemo(db);
      if (!res.passed) {
        process.exitCode = 1;
      }
    })
    .catch((err: unknown) => {
      console.error('[VERIFY ERROR]', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await client.end();
    });
}
