import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpPromotorClassAdapter } from '../adapters/http/promotorclass-adapter';
import { PromotorFlowApiClient } from '@promotor/api-client';

function createMockApiClient(overrides?: Partial<Record<keyof PromotorFlowApiClient, any>>): PromotorFlowApiClient {
  return {
    getContactLearningContext: async (contactId: string) => {
      if (overrides?.getContactLearningContext) {
        return overrides.getContactLearningContext(contactId);
      }
      return {
        contactId,
        overallProgressPercent: 50,
        highestIntentLabel: 'WARM',
        activeEnrollments: [
          {
            enrollmentId: 'enr_123',
            programId: 'prog_abc',
            programTitle: 'Mastering Fullstack',
            progressPercent: 50,
            learningStatus: 'IN_PROGRESS',
            intentLabel: 'WARM',
            enrolledAt: '2026-08-01T00:00:00Z',
          },
        ],
        recentSignals: [
          {
            id: 'sig_1',
            type: 'LEARNING_SIGNAL',
            reason: 'MILESTONE_50_PERCENT',
            sourceEventId: 'evt_1',
            createdAt: '2026-08-01T12:00:00Z',
          },
        ],
      };
    },
    listEligiblePrograms: async (accessType?: string) => {
      if (overrides?.listEligiblePrograms) {
        return overrides.listEligiblePrograms(accessType);
      }
      return {
        programs: [
          {
            id: 'prog_abc',
            title: 'Mastering Fullstack',
            slug: 'mastering-fullstack',
            programType: 'course',
            accessType: 'open',
            pricing: 'paid',
            priceAmount: 500000,
          },
        ],
      };
    },
    createManualEnrollment: async (data: any) => {
      if (overrides?.createManualEnrollment) {
        return overrides.createManualEnrollment(data);
      }
      return {
        enrollment: {
          id: 'enr_manual_1',
          programId: data.programId,
          contactId: data.contactId,
          status: 'ENROLLED',
          enrolledAt: '2026-08-20T00:00:00Z',
        },
      };
    },
    listClassEnrollments: async (query?: any) => {
      if (overrides?.listClassEnrollments) {
        return overrides.listClassEnrollments(query);
      }
      return {
        enrollments: [
          {
            id: 'enr_123',
            programId: query?.programId || 'prog_abc',
            contactId: query?.contactId || 'contact_1',
            status: 'IN_PROGRESS',
            progressPercent: 50,
            enrolledAt: '2026-08-01T00:00:00Z',
            completedAt: null,
          },
        ],
      };
    },
  } as unknown as PromotorFlowApiClient;
}

test('HttpPromotorClassAdapter: BUNDLE_AVAILABLE scenario and clean M17 reverse queries', async () => {
  const mockApi = createMockApiClient();
  const adapter = new HttpPromotorClassAdapter(mockApi);

  const { entitlements, integrationHealth } = await adapter.getEntitlementsAndHealth();
  assert.equal(entitlements.promotorClass, true);
  assert.equal(integrationHealth.promotorClass, 'AVAILABLE');

  // 1. getLearningContext
  const ctx = await adapter.getLearningContext('contact_1');
  assert.equal(ctx.contactId, 'contact_1');
  assert.equal(ctx.activeEnrollments.length, 1);
  assert.equal(ctx.activeEnrollments[0].programTitle, 'Mastering Fullstack');
  assert.equal(ctx.recentSignals.length, 1);

  // 2. listEligiblePrograms
  const programs = await adapter.listEligiblePrograms({ organizationId: 'org_1', contactId: 'contact_1' });
  assert.equal(programs.length, 1);
  assert.equal(programs[0].title, 'Mastering Fullstack');

  // 3. enrollContact
  const enrRef = await adapter.enrollContact({
    organizationId: 'org_1',
    contactId: 'contact_1',
    programId: 'prog_abc',
    source: 'PROMOTORFLOW_MANUAL',
    idempotencyKey: 'idem_1',
  });
  assert.equal(enrRef.enrollmentId, 'enr_manual_1');
  assert.equal(enrRef.contactId, 'contact_1');

  // 4. getEnrollmentStatus
  const status = await adapter.getEnrollmentStatus('contact_1', 'prog_abc');
  assert.ok(status);
  assert.equal(status?.enrollmentId, 'enr_123');
  assert.equal(status?.progressPercent, 50);
});

test('HttpPromotorClassAdapter: FLOW_ONLY scenario disables Class calls cleanly', async () => {
  const mockApi = createMockApiClient();
  const adapter = new HttpPromotorClassAdapter(mockApi);

  await adapter.setDemoScenario('FLOW_ONLY');

  const { entitlements, integrationHealth } = await adapter.getEntitlementsAndHealth();
  assert.equal(entitlements.promotorClass, false);
  assert.equal(integrationHealth.promotorClass, 'AVAILABLE');

  const ctx = await adapter.getLearningContext('contact_1');
  assert.equal(ctx.activeEnrollments.length, 0);

  const programs = await adapter.listEligiblePrograms({ organizationId: 'org_1', contactId: 'contact_1' });
  assert.equal(programs.length, 0);

  const status = await adapter.getEnrollmentStatus('contact_1', 'prog_abc');
  assert.equal(status, null);
});

test('HttpPromotorClassAdapter: BUNDLE_CLASS_UNAVAILABLE scenario throws to display outage banner', async () => {
  const mockApi = createMockApiClient();
  const adapter = new HttpPromotorClassAdapter(mockApi);

  await adapter.setDemoScenario('BUNDLE_CLASS_UNAVAILABLE');

  const { entitlements, integrationHealth } = await adapter.getEntitlementsAndHealth();
  assert.equal(entitlements.promotorClass, true);
  assert.equal(integrationHealth.promotorClass, 'UNAVAILABLE');

  await assert.rejects(
    async () => {
      await adapter.getLearningContext('contact_1');
    },
    { message: /PromotorClass service is currently unavailable/ }
  );

  await assert.rejects(
    async () => {
      await adapter.listEligiblePrograms({ organizationId: 'org_1', contactId: 'contact_1' });
    },
    { message: /PromotorClass service is currently unavailable/ }
  );
});

test('HttpPromotorClassAdapter: dynamic network 503 outage updates health to UNAVAILABLE', async () => {
  const mockApi = createMockApiClient({
    getContactLearningContext: async () => {
      const err: any = new Error('Gateway Timeout');
      err.status = 504;
      throw err;
    },
  });
  const adapter = new HttpPromotorClassAdapter(mockApi);

  await assert.rejects(
    async () => {
      await adapter.getLearningContext('contact_1');
    },
    { message: /PromotorClass service is currently unavailable/ }
  );

  const { integrationHealth } = await adapter.getEntitlementsAndHealth();
  assert.equal(integrationHealth.promotorClass, 'UNAVAILABLE', 'Health must dynamically flip to UNAVAILABLE');
});
