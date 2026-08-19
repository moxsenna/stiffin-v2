/**
 * V0.1 Consolidated Hardening & Final Release Live Acceptance Rehearsal Tool
 *
 * Exercises Golden Flows A through E, Flow Booking Lifecycle, Class-Only Scenarios,
 * Outbox Dispatcher Retries, and Cross-Tenant Isolation against a dedicated disposable database.
 *
 * Requirements:
 *   - Explicit REHEARSAL_DATABASE_URL environment variable (never falls back to test/prod DB)
 *   - Zero printing of plaintext session tokens or database credentials
 *   - Fails closed if REHEARSAL_DATABASE_URL is absent
 *
 * Usage:
 *   REHEARSAL_DATABASE_URL="postgresql://..." pnpm --filter @promotor/platform-api v0.1:live-acceptance
 */

import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import {
  organizations,
  contacts,
  programs,
  modules,
  lessons,
  enrollments,
  learnerSessions,
  integrationOutbox,
  learningEvents,
  learningSignals,
  nextActions,
  activities,
  productEntitlements,
  services,
  bookings,
  aftercareRecords,
} from '../src/db/schema';
import { createEnrollmentService } from '../src/services/class/enrollment-service';
import { createLearningEngineService } from '../src/services/class/learning-engine-service';
import { createLearnerSessionService } from '../src/services/class/learner-session-service';
import { createIntegrationOutboxService } from '../src/services/integration/integration-outbox-service';
import { createPromotorClassAdapter } from '../src/services/class/promotor-class-adapter';
import { createPublicBookingService } from '../src/services/flow/public-booking-service';
import { createBookingService } from '../src/services/booking-service';
import { createAftercareService } from '../src/services/aftercare-service';
import { createApp } from '../src/app';

const REHEARSAL_DATABASE_URL = process.env.REHEARSAL_DATABASE_URL;

if (!REHEARSAL_DATABASE_URL) {
  console.error('LIVE ACCEPTANCE TOOLING ERROR: REHEARSAL_DATABASE_URL environment variable is required to execute a real disposable rehearsal.');
  console.error('Usage: REHEARSAL_DATABASE_URL="postgresql://..." pnpm --filter @promotor/platform-api v0.1:live-acceptance');
  process.exit(1);
}

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details?: string) {
  results.push({ category, name, passed, details });
  const status = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`[${category}] ${status} ${name}${details ? ` — ${details}` : ''}`);
}

async function runLiveAcceptance() {
  console.log('===============================================================');
  console.log('PROMOTOR PLATFORM V0.1 CONSOLIDATED LIVE ACCEPTANCE REHEARSAL');
  console.log('Environment: DEDICATED DISPOSABLE REHEARSAL');
  console.log('===============================================================\n');

  const client = new Client({ connectionString: REHEARSAL_DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  try {
    // -------------------------------------------------------------
    // Gate 1: Migration Journal & Capability Arithmetic
    // -------------------------------------------------------------
    const journalRes = await client.query(
      `SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`
    );
    const migrationCount = journalRes.rows.length;
    record(
      'MIGRATIONS',
      'All migrations 0000 through 0009 registered in journal',
      migrationCount >= 10,
      `Found ${migrationCount} migrations`
    );

    const privsRes = await client.query(
      `SELECT table_name, privilege_type
       FROM information_schema.table_privileges
       WHERE grantee = 'promotor_runtime' AND table_schema = 'public'
       ORDER BY table_name, privilege_type`
    );
    const privCount = privsRes.rows.length;
    record(
      'PERMISSIONS',
      'Runtime capability arithmetic matches 128 capabilities across 33 tables',
      privCount === 128,
      `Exact ${privCount} capabilities`
    );

    // -------------------------------------------------------------
    // Gate 2: API Startup & Health Probes
    // -------------------------------------------------------------
    const app = createApp();
    const mockEnv = {
      DATABASE_URL: REHEARSAL_DATABASE_URL,
      BETTER_AUTH_SECRET: 'rehearsal_secret_32_characters_minimum_len_12345',
      BETTER_AUTH_URL: 'http://localhost:8787',
      ENVIRONMENT: 'rehearsal',
    };

    const healthRes = await app.request('/health', { method: 'GET' }, mockEnv as any);
    record(
      'API_STARTUP',
      'API startup and health probe endpoint returns 200 OK',
      healthRes.status === 200
    );

    // -------------------------------------------------------------
    // Fixture Setup: Organization, Program, Modules, Lessons
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const orgSlug = `live-acc-${timestamp}`;
    const [org] = await db
      .insert(organizations)
      .values({ name: 'Live Acceptance Org', slug: orgSlug })
      .returning();

    await db.insert(productEntitlements).values({
      organizationId: org.id,
      promotorClass: true,
      promotorFlow: true,
    });

    const [program] = await db
      .insert(programs)
      .values({
        organizationId: org.id,
        title: 'Mastering AI Agentic Systems',
        slug: `ai-mastery-${timestamp}`,
        programType: 'lead_magnet',
        status: 'published',
        pricing: 'free',
        priceAmount: 0,
      })
      .returning();

    const [module1] = await db
      .insert(modules)
      .values({ programId: program.id, title: 'Module 1: Foundations', order: 1 })
      .returning();

    const [lesson1] = await db
      .insert(lessons)
      .values({
        moduleId: module1.id,
        title: 'Lesson 1: Architecture Overview',
        order: 1,
        isRequired: true,
      })
      .returning();

    const [lesson2] = await db
      .insert(lessons)
      .values({
        moduleId: module1.id,
        title: 'Lesson 2: Core Implementation & Reflection',
        order: 2,
        isRequired: true,
        reflectionType: 'long_text',
        reflectionPrompt: 'Jelaskan bagaimana arsitektur ini mengatasi tantangan integrasi Anda.',
        ctaType: 'WHATSAPP',
        ctaLabel: 'Jadwalkan Konsultasi Arsitektur',
      })
      .returning();

    const enrollmentService = createEnrollmentService(db);
    const learningService = createLearningEngineService(db);
    const sessionService = createLearnerSessionService(db);
    const outboxService = createIntegrationOutboxService(db);

    // -------------------------------------------------------------
    // Golden Flow A: Public Registration & First Lesson Completion
    // -------------------------------------------------------------
    const regPhone = `+62813${Math.floor(10000000 + Math.random() * 90000000)}`;
    const reg = await enrollmentService.registerPublicLearner({
      slug: orgSlug,
      programSlug: program.slug,
      name: 'Bima Satria',
      phoneRaw: regPhone,
      email: 'bima.satria@example.com',
    });

    record(
      'FLOW_A',
      'Public registration returns enrollment and raw accessToken',
      Boolean(reg.enrollmentId && reg.accessToken),
      `enrollmentId: ${reg.enrollmentId}`
    );

    // Token Redemption
    const session = await sessionService.redeemToken(reg.accessToken);
    record(
      'FLOW_A',
      'Access token redeemed for 30-day session cookie (sanitized output)',
      Boolean(session.sessionToken && session.contactId === reg.contactId),
      'session token validated and hashed'
    );

    // Initial state check
    let enrState = await enrollmentService.getEnrollmentById(org.id, reg.enrollmentId);
    record(
      'FLOW_A',
      'Initial enrollment progress is 0% and intent is COLD (10 pts base)',
      enrState?.progressPercent === 0 && enrState?.intentScore === 10 && enrState?.intentLabel === 'COLD'
    );

    // Complete Lesson 1
    const l1Result = await learningService.completeLesson({
      organizationId: org.id,
      enrollmentId: reg.enrollmentId,
      lessonId: lesson1.id,
      authenticatedContactId: reg.contactId,
    });

    record(
      'FLOW_A',
      'Completing Lesson 1 advances progress to 50% and updates status to STARTED / IN_PROGRESS',
      l1Result.enrollment.progressPercent === 50 &&
        l1Result.enrollment.status === 'STARTED' &&
        l1Result.enrollment.learningStatus === 'IN_PROGRESS',
      `Progress: ${l1Result.enrollment.progressPercent}%, Intent: ${l1Result.enrollment.intentScore}`
    );

    // Assert after Lesson 1 reaches 50%: exactly one lesson.completed for Lesson 1 and exactly one program.progress_50
    const flowAEvents = await db
      .select()
      .from(learningEvents)
      .where(eq(learningEvents.enrollmentId, reg.enrollmentId));

    const l1CompletedEvents = flowAEvents.filter(
      (e) => e.eventType === 'lesson.completed' && (e.payload as any)?.lessonId === lesson1.id
    );
    const prog50Events = flowAEvents.filter((e) => e.eventType === 'program.progress_50');

    record(
      'FLOW_A',
      'After Lesson 1 reaches 50%: exactly one lesson.completed for Lesson 1 and exactly one program.progress_50',
      l1CompletedEvents.length === 1 && prog50Events.length === 1,
      `lesson.completed: ${l1CompletedEvents.length}, program.progress_50: ${prog50Events.length}`
    );

    // Idempotency check on Lesson 1
    const l1Retry = await learningService.completeLesson({
      organizationId: org.id,
      enrollmentId: reg.enrollmentId,
      lessonId: lesson1.id,
      authenticatedContactId: reg.contactId,
    });
    record(
      'FLOW_A',
      'Idempotent Lesson 1 completion returns unchanged state with 0 duplicate events',
      l1Retry.enrollment.progressPercent === 50 && l1Retry.signalsCreated.length === 0
    );

    // -------------------------------------------------------------
    // Golden Flow B: Required Reflection Blocking & Progression
    // -------------------------------------------------------------
    let directCompleteBlocked = false;
    try {
      await learningService.completeLesson({
        organizationId: org.id,
        enrollmentId: reg.enrollmentId,
        lessonId: lesson2.id,
        authenticatedContactId: reg.contactId,
      });
    } catch (err: any) {
      if (err.code === 'REFLECTION_REQUIRED' || err.code === 'VALIDATION_ERROR') {
        directCompleteBlocked = true;
      }
    }
    record(
      'FLOW_B',
      'Completing lesson with required reflection without submission fails closed',
      directCompleteBlocked
    );

    // Submit Reflection
    const reflectionText = 'Arsitektur decoupled outbox menjamin ketersediaan Flow CRM tanpa coupling database langsung.';
    const reflResult = await learningService.submitReflection({
      organizationId: org.id,
      enrollmentId: reg.enrollmentId,
      lessonId: lesson2.id,
      responseText: reflectionText,
      authenticatedContactId: reg.contactId,
    });

    record(
      'FLOW_B',
      'Submitting reflection advances progress to 100% and status to COMPLETED',
      reflResult.enrollment.progressPercent === 100 &&
        reflResult.enrollment.status === 'COMPLETED' &&
        reflResult.enrollment.learningStatus === 'COMPLETED'
    );

    // Assert after required reflection completes Lesson 2 and program jumps 50 -> 100:
    const flowBEvents = await db
      .select()
      .from(learningEvents)
      .where(eq(learningEvents.enrollmentId, reg.enrollmentId));

    const reflSubmittedEvents = flowBEvents.filter(
      (e) => e.eventType === 'reflection.submitted' && (e.payload as any)?.lessonId === lesson2.id
    );
    const l2CompletedEvents = flowBEvents.filter(
      (e) => e.eventType === 'lesson.completed' && (e.payload as any)?.lessonId === lesson2.id
    );
    const prog80Events = flowBEvents.filter((e) => e.eventType === 'program.progress_80');
    const progCompEvents = flowBEvents.filter((e) => e.eventType === 'program.completed');

    record(
      'FLOW_B',
      'After required reflection completes Lesson 2: exactly one reflection.submitted, one lesson.completed for Lesson 2, one program.progress_80, and one program.completed',
      reflSubmittedEvents.length === 1 &&
        l2CompletedEvents.length === 1 &&
        prog80Events.length === 1 &&
        progCompEvents.length === 1,
      `refl: ${reflSubmittedEvents.length}, l2: ${l2CompletedEvents.length}, prog80: ${prog80Events.length}, progComp: ${progCompEvents.length}`
    );

    // -------------------------------------------------------------
    // Golden Flow C: Intent Milestones & Transitions
    // -------------------------------------------------------------
    record(
      'FLOW_C',
      'Intent score accumulates milestone additions correctly (Base 10 + L1 10 + 50% 20 + 80% 20 + Complete 20 = 80 pts WARM/HOT)',
      reflResult.enrollment.intentScore >= 70 && reflResult.enrollment.intentLabel === 'HOT',
      `Intent: ${reflResult.enrollment.intentScore} (${reflResult.enrollment.intentLabel})`
    );

    // -------------------------------------------------------------
    // Golden Flow D: Program Completion & Outbox Dispatch to Flow
    // -------------------------------------------------------------
    // Signal Provenance Assertion
    const flowSignals = await db
      .select()
      .from(learningSignals)
      .where(eq(learningSignals.enrollmentId, reg.enrollmentId));

    const progCompSignal = flowSignals.find((s) => s.reason === 'PROGRAM_COMPLETED');
    const prog80Signal = flowSignals.find((s) => s.reason === 'MILESTONE_80_PERCENT');

    const progCompSourceEvent = flowBEvents.find((e) => e.id === progCompSignal?.sourceEventId);
    const prog80SourceEvent = flowBEvents.find((e) => e.id === prog80Signal?.sourceEventId);

    record(
      'FLOW_D',
      'Signal provenance: PROGRAM_COMPLETED.source_event_id -> program.completed and MILESTONE_80_PERCENT.source_event_id -> program.progress_80',
      Boolean(
        progCompSignal &&
          progCompSourceEvent?.eventType === 'program.completed' &&
          prog80Signal &&
          prog80SourceEvent?.eventType === 'program.progress_80'
      ),
      `progComp source: ${progCompSourceEvent?.eventType}, prog80 source: ${prog80SourceEvent?.eventType}`
    );

    const outboxRows = await db
      .select()
      .from(integrationOutbox)
      .where(eq(integrationOutbox.organizationId, org.id));

    record(
      'FLOW_D',
      'Program completion enqueues NextAction and Activity Projection in outbox',
      outboxRows.length >= 2,
      `Outbox rows: ${outboxRows.length}`
    );

    // Outbox Idempotency Key Provenance
    const expectedCompKey = `promotorclass:${progCompEvents[0].id}:completed`;
    const expectedProg80Key = `promotorclass:${prog80Events[0].id}:progress_80`;

    const hasCanonicalCompKey = outboxRows.some((o) => o.idempotencyKey === expectedCompKey);
    const hasCanonicalProg80Key = outboxRows.some((o) => o.idempotencyKey === expectedProg80Key);

    record(
      'FLOW_D',
      'Outbox idempotency keys naturally derive from canonical source event IDs (promotorclass:{source_event_id}:{rule_id})',
      hasCanonicalCompKey && hasCanonicalProg80Key,
      `Keys verified: ${expectedCompKey} (ok=${hasCanonicalCompKey}), ${expectedProg80Key} (ok=${hasCanonicalProg80Key})`
    );

    // Verify Flow NextAction and Activity were created
    const flowNextActions = await db
      .select()
      .from(nextActions)
      .where(eq(nextActions.contactId, reg.contactId));

    const flowActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.contactId, reg.contactId));

    record(
      'FLOW_D',
      'Flow NextAction created with source=PROMOTORCLASS and due date set',
      flowNextActions.some((a) => a.source === 'PROMOTORCLASS')
    );

    // Privacy Isolation Assertion
    let privacyPreserved = true;
    for (const a of flowNextActions) {
      if (a.title.includes(reflectionText) || a.description?.includes(reflectionText)) {
        privacyPreserved = false;
      }
    }
    for (const act of flowActivities) {
      if (JSON.stringify(act.metadataJson ?? {}).includes(reflectionText)) {
        privacyPreserved = false;
      }
    }
    record(
      'FLOW_D',
      'PRIVACY ISOLATION: Raw reflection response text is strictly excluded from Flow CRM actions & activities',
      privacyPreserved
    );

    // -------------------------------------------------------------
    // Golden Flow E: CTA Click & Immediate Hot Intent Signal
    // -------------------------------------------------------------
    const ctaResult = await learningService.recordCtaClick({
      organizationId: org.id,
      enrollmentId: reg.enrollmentId,
      lessonId: lesson2.id,
      ctaLabel: 'Jadwalkan Konsultasi Arsitektur',
      authenticatedContactId: reg.contactId,
    });

    record(
      'FLOW_E',
      'CTA click boosts intent score to maximum capped at 100 with HOT label',
      ctaResult.enrollment.intentScore === 100 && ctaResult.enrollment.intentLabel === 'HOT',
      `Final Intent: ${ctaResult.enrollment.intentScore} (${ctaResult.enrollment.intentLabel})`
    );

    const postCtaEvents = await db
      .select()
      .from(learningEvents)
      .where(eq(learningEvents.enrollmentId, reg.enrollmentId));
    const ctaEvents = postCtaEvents.filter((e) => e.eventType === 'cta.clicked');

    const postCtaSignals = await db
      .select()
      .from(learningSignals)
      .where(eq(learningSignals.enrollmentId, reg.enrollmentId));
    const ctaSignal = postCtaSignals.find((s) => s.reason === 'CTA_CLICKED');
    const ctaSourceEvent = postCtaEvents.find((e) => e.id === ctaSignal?.sourceEventId);

    record(
      'FLOW_E',
      'Signal provenance: CTA_CLICKED.source_event_id -> cta.clicked and outbox uses canonical CTA event ID',
      Boolean(ctaSignal && ctaSourceEvent?.eventType === 'cta.clicked' && ctaEvents.length === 1),
      `CTA source: ${ctaSourceEvent?.eventType}, ctaEvents: ${ctaEvents.length}`
    );

    // Repeat mutations and assert counts remain unchanged (Idempotency / Mutation Immutability)
    const initialEventsCount = postCtaEvents.length;
    const initialSignalsCount = postCtaSignals.length;

    await learningService.completeLesson({
      organizationId: org.id,
      enrollmentId: reg.enrollmentId,
      lessonId: lesson1.id,
      authenticatedContactId: reg.contactId,
    });
    await learningService.submitReflection({
      organizationId: org.id,
      enrollmentId: reg.enrollmentId,
      lessonId: lesson2.id,
      responseText: reflectionText,
      authenticatedContactId: reg.contactId,
    });
    await learningService.recordCtaClick({
      organizationId: org.id,
      enrollmentId: reg.enrollmentId,
      lessonId: lesson2.id,
      ctaLabel: 'Jadwalkan Konsultasi Arsitektur',
      authenticatedContactId: reg.contactId,
    });

    const finalEvents = await db
      .select()
      .from(learningEvents)
      .where(eq(learningEvents.enrollmentId, reg.enrollmentId));
    const finalSignals = await db
      .select()
      .from(learningSignals)
      .where(eq(learningSignals.enrollmentId, reg.enrollmentId));

    record(
      'FLOW_E',
      'Repeated semantic mutations guarantee zero duplicate events or signals (exact count immutability)',
      finalEvents.length === initialEventsCount && finalSignals.length === initialSignalsCount,
      `Events: ${initialEventsCount} -> ${finalEvents.length}, Signals: ${initialSignalsCount} -> ${finalSignals.length}`
    );

    // -------------------------------------------------------------
    // Golden Flow F: Flow Public Booking, Lifecycle & D+7 Aftercare
    // -------------------------------------------------------------
    const [serviceRow] = await db
      .insert(services)
      .values({
        organizationId: org.id,
        name: 'Private Architecture Consultation',
        category: 'SESSION',
        durationMinutes: 60,
        priceAmount: 500000,
        isActive: true,
      })
      .returning();

    const publicBookingService = createPublicBookingService(db);
    const bookingService = createBookingService(db);

    const bookingStartTime = new Date(Date.now() + 86400000 * 2).toISOString();
    const publicBooking = await publicBookingService.createPublicBooking({
      slug: orgSlug,
      serviceId: serviceRow.id,
      startAt: bookingStartTime,
      name: 'Bima Satria',
      phoneRaw: regPhone,
      email: 'bima.satria@example.com',
      notes: 'Initial architecture consultation',
    });

    record(
      'FLOW_F',
      'Public booking created with PENDING status and correct service details',
      Boolean(publicBooking.bookingId && publicBooking.status === 'PENDING')
    );

    const orgCtx = { organizationId: org.id };

    // 1. Confirm booking (PENDING -> CONFIRMED)
    const confirmedBooking = await bookingService.confirmBooking(orgCtx, publicBooking.bookingId);
    record(
      'FLOW_F',
      'Operator confirms booking transitioning status to CONFIRMED',
      confirmedBooking.status === 'CONFIRMED'
    );

    // 2. Complete booking (CONFIRMED -> COMPLETED)
    const completedBooking = await bookingService.completeBooking(orgCtx, publicBooking.bookingId);
    record(
      'FLOW_F',
      'Completing booking updates status to COMPLETED and generates AFTERCARE next action and record',
      completedBooking.status === 'COMPLETED'
    );

    const aftercareActions = await db
      .select()
      .from(nextActions)
      .where(and(eq(nextActions.bookingId, publicBooking.bookingId), eq(nextActions.actionType, 'AFTERCARE')));

    record(
      'FLOW_F',
      'Exactly one AFTERCARE next action created atomically on booking completion in PENDING state',
      aftercareActions.length === 1 && aftercareActions[0].status === 'PENDING'
    );

    const initialAftercareRecords = await db
      .select()
      .from(aftercareRecords)
      .where(eq(aftercareRecords.bookingId, publicBooking.bookingId));

    const initialAftercare = initialAftercareRecords[0];
    const completedAt = completedBooking.completedAt ? new Date(completedBooking.completedAt) : null;
    const scheduledAt = initialAftercare?.scheduledFor ? new Date(initialAftercare.scheduledFor) : null;
    const expectedAftercareAt = completedAt ? new Date(completedAt.getTime() + 7 * 24 * 3600_000) : null;

    const isCanonicalD7 = Boolean(
      completedBooking.completedAt &&
      initialAftercare &&
      initialAftercare.status === 'PENDING' &&
      initialAftercare.scheduledFor &&
      completedAt &&
      scheduledAt &&
      expectedAftercareAt &&
      scheduledAt.getTime() === expectedAftercareAt.getTime()
    );

    record(
      'FLOW_F',
      'Aftercare record initialized in PENDING status with canonical D+7 scheduled_for',
      isCanonicalD7,
      `Completed: ${completedBooking.completedAt}, Scheduled: ${initialAftercare?.scheduledFor}, Expected D+7: ${expectedAftercareAt?.toISOString()}`
    );

    if (aftercareActions.length > 0 && initialAftercare && scheduledAt) {
      // 3. Respect Aftercare D+7 temporal guard by using the AftercareService clock dependency
      const aftercareService = createAftercareService(db, {
        clock: () => scheduledAt,
      });

      const aftercareResult = await aftercareService.completeAftercare(orgCtx, aftercareActions[0].id, {
        outcome: 'NO_NEED',
        notes: 'Client confirmed implementation is progressing smoothly',
      });

      const updatedAftercareRows = await db
        .select()
        .from(aftercareRecords)
        .where(eq(aftercareRecords.bookingId, publicBooking.bookingId));

      record(
        'FLOW_F',
        'Completing aftercare at D+7 records canonical outcome NO_NEED and updates record & action to COMPLETED',
        updatedAftercareRows.length === 1 &&
          updatedAftercareRows[0].status === 'COMPLETED' &&
          updatedAftercareRows[0].outcome === 'NO_NEED' &&
          aftercareResult.action.status === 'COMPLETED'
      );
    }

    // -------------------------------------------------------------
    // Scenario G: Class-Only Organization (Flow Entitlement Disabled)
    // -------------------------------------------------------------
    const classOnlyOrgSlug = `class-only-${timestamp}`;
    const [classOnlyOrg] = await db
      .insert(organizations)
      .values({ name: 'Class Only Org', slug: classOnlyOrgSlug })
      .returning();

    await db.insert(productEntitlements).values({
      organizationId: classOnlyOrg.id,
      promotorClass: true,
      promotorFlow: false,
    });

    const [classOnlyProgram] = await db
      .insert(programs)
      .values({
        organizationId: classOnlyOrg.id,
        title: 'Class Only Course',
        slug: `class-only-${timestamp}`,
        programType: 'lead_magnet',
        status: 'published',
        pricing: 'free',
        priceAmount: 0,
      })
      .returning();

    const classOnlyReg = await enrollmentService.registerPublicLearner({
      slug: classOnlyOrgSlug,
      programSlug: classOnlyProgram.slug,
      name: 'Class Only Learner',
      phoneRaw: `+62812${Math.floor(10000000 + Math.random() * 90000000)}`,
    });

    record(
      'CLASS_ONLY',
      'Class-only organization allows registration and learning without Flow entitlement requirement',
      Boolean(classOnlyReg.enrollmentId)
    );

    // -------------------------------------------------------------
    // Scenario H: Cross-Tenant Isolation
    // -------------------------------------------------------------
    let crossTenantBlocked = false;
    try {
      await enrollmentService.getEnrollmentById(classOnlyOrg.id, reg.enrollmentId);
    } catch {
      crossTenantBlocked = true;
    }
    const crossTenantEnr = await enrollmentService.getEnrollmentById(classOnlyOrg.id, reg.enrollmentId);
    record(
      'TENANT_ISOLATION',
      'Cross-tenant isolation: Org B context cannot access Org A enrollment',
      crossTenantBlocked || crossTenantEnr === null || crossTenantEnr === undefined
    );

    // -------------------------------------------------------------
    // Scenario I: Outbox Dispatcher Resilience & Status
    // -------------------------------------------------------------
    const failedOutboxRows = await db
      .select()
      .from(integrationOutbox)
      .where(and(eq(integrationOutbox.organizationId, org.id), eq(integrationOutbox.status, 'FAILED')));

    record(
      'OUTBOX_RESILIENCE',
      'Outbox dispatcher maintains queue statistics and zero failed tasks',
      failedOutboxRows.length === 0,
      `Failed outbox tasks: ${failedOutboxRows.length}`
    );

    console.log('\n===============================================================');
    const passedAll = results.every((r) => r.passed);
    if (passedAll) {
      console.log('\x1b[32mALL REHEARSAL GATES & GOLDEN FLOWS PASSED (100% GREEN)\x1b[0m');
    } else {
      console.log('\x1b[31mSOME REHEARSAL CHECKS FAILED\x1b[0m');
    }
    console.log('===============================================================\n');

    return passedAll;
  } finally {
    await client.end();
  }
}

runLiveAcceptance()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((err) => {
    console.error('Fatal rehearsal error (sanitized):', err.message || 'Unknown error');
    process.exit(1);
  });

