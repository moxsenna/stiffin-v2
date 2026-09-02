import { Client } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import { assertStagingEnvironment, DEMO_IDS } from './seed-staging-demo';

import {
  organizations,
  users,
  accounts,
  sessions,
  organizationMembers,
  productEntitlements,
  workspaceProfiles,
  programs,
  programPresentations,
  modules,
  lessons,
  contacts,
  contactFlowStates,
  enrollments,
  lessonProgress,
  reflectionResponses,
  learningEvents,
  learningSignals,
  learnerAccessTokens,
  learnerSessions,
  services,
  availabilityRules,
  messageTemplates,
  bookings,
  nextActions,
  activities,
  aftercareRecords,
  integrationOutbox,
} from '../src/db/schema';

export async function resetStagingDemo(db: NodePgDatabase): Promise<void> {
  assertStagingEnvironment();

  console.log(`[RESET] Resetting Canonical Demo Workspace (Org ID: ${DEMO_IDS.organization})...`);

  // 1. Integration & Activity
  await db.delete(integrationOutbox).where(eq(integrationOutbox.organizationId, DEMO_IDS.organization));
  await db.delete(activities).where(eq(activities.organizationId, DEMO_IDS.organization));
  await db.delete(nextActions).where(eq(nextActions.organizationId, DEMO_IDS.organization));
  await db.delete(aftercareRecords).where(eq(aftercareRecords.organizationId, DEMO_IDS.organization));
  await db.delete(bookings).where(eq(bookings.organizationId, DEMO_IDS.organization));
  await db.delete(services).where(eq(services.organizationId, DEMO_IDS.organization));
  await db.delete(availabilityRules).where(eq(availabilityRules.organizationId, DEMO_IDS.organization));
  await db.delete(messageTemplates).where(eq(messageTemplates.organizationId, DEMO_IDS.organization));

  // 2. Learning & Progress
  await db.delete(learningSignals).where(eq(learningSignals.organizationId, DEMO_IDS.organization));
  await db.delete(learningEvents).where(eq(learningEvents.organizationId, DEMO_IDS.organization));
  await db.delete(reflectionResponses).where(eq(reflectionResponses.organizationId, DEMO_IDS.organization));
  await db.delete(lessonProgress).where(eq(lessonProgress.organizationId, DEMO_IDS.organization));
  await db.delete(learnerAccessTokens).where(eq(learnerAccessTokens.organizationId, DEMO_IDS.organization));
  await db.delete(learnerSessions).where(eq(learnerSessions.organizationId, DEMO_IDS.organization));
  await db.delete(enrollments).where(eq(enrollments.organizationId, DEMO_IDS.organization));

  // 3. Curriculum & Programs
  const progRows = await db.select({ id: programs.id }).from(programs).where(eq(programs.organizationId, DEMO_IDS.organization));
  const progIds = progRows.map((p: any) => p.id);

  if (progIds.length > 0) {
    const modRows = await db.select({ id: modules.id }).from(modules).where(inArray(modules.programId, progIds));
    const modIds = modRows.map((m: any) => m.id);

    if (modIds.length > 0) {
      await db.delete(lessons).where(inArray(lessons.moduleId, modIds));
    }
    await db.delete(modules).where(inArray(modules.programId, progIds));
    await db.delete(programPresentations).where(inArray(programPresentations.programId, progIds));
    await db.delete(programs).where(eq(programs.organizationId, DEMO_IDS.organization));
  }

  // 4. Contacts & Workspace
  await db.delete(contactFlowStates).where(eq(contactFlowStates.organizationId, DEMO_IDS.organization));
  await db.delete(contacts).where(eq(contacts.organizationId, DEMO_IDS.organization));
  await db.delete(workspaceProfiles).where(eq(workspaceProfiles.organizationId, DEMO_IDS.organization));
  await db.delete(productEntitlements).where(eq(productEntitlements.organizationId, DEMO_IDS.organization));
  await db.delete(organizationMembers).where(eq(organizationMembers.organizationId, DEMO_IDS.organization));

  // 5. Promoter User & Sessions
  await db.delete(sessions).where(eq(sessions.userId, DEMO_IDS.promoterUser));
  await db.delete(accounts).where(eq(accounts.userId, DEMO_IDS.promoterUser));
  await db.delete(organizations).where(eq(organizations.id, DEMO_IDS.organization));
  await db.delete(users).where(eq(users.id, DEMO_IDS.promoterUser));

  console.log('[RESET] Canonical Demo Workspace reset complete.');
}

// Standalone execution entrypoint
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('reset-staging-demo.ts');

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
      await resetStagingDemo(db);
    })
    .catch((err: unknown) => {
      console.error('[RESET ERROR]', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await client.end();
    });
}
