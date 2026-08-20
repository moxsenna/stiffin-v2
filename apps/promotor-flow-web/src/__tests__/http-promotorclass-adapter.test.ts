import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpPromotorClassAdapter } from '../adapters/http/promotorclass-adapter';
import { PromotorFlowApiClient } from '@promotor/api-client';

function createMockApiClient(overrides?: Partial<Record<keyof PromotorFlowApiClient, any>>): PromotorFlowApiClient {
  return {
    getIntegrationHealth: async () => {
      if (overrides?.getIntegrationHealth) {
        return overrides.getIntegrationHealth();
      }
      return { promotorFlow: 'AVAILABLE', promotorClass: 'AVAILABLE' };
    },
    getContactLearningContext: async (contactId: string) => {
      if (overrides?.getContactLearningContext) {
        return overrides.getContactLearningContext(contactId);
      }
      return {
        contactId,
        overallProgressPercent: 75,
        highestIntentLabel: 'HOT',
        activeEnrollments: [
          {
            enrollmentId: 'enr_123',
            programId: 'prog_abc',
            programTitle: 'Parenting Biometrik STIFIn',
            progressPercent: 75,
            learningStatus: 'IN_PROGRESS',
            intentLabel: 'HOT',
            enrolledAt: '2026-08-01T00:00:00Z',
          },
        ],
        recentSignals: [
          {
            id: 'sig_1',
            type: 'LEARNING_SIGNAL',
            reason: 'MILESTONE_80_PERCENT',
            priority: 15,
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
            title: 'Parenting Biometrik STIFIn',
            slug: 'parenting-biometrik',
            programType: 'aftersales',
            accessType: 'restricted',
            pricing: 'paid',
            priceAmount: 450000,
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
            status: 'COMPLETED',
            progressPercent: 100,
            enrolledAt: '2026-08-01T00:00:00Z',
            completedAt: '2026-08-08T00:00:00Z',
          },
        ],
      };
    },
  } as unknown as PromotorFlowApiClient;
}

test('1. HttpPromotorClassAdapter: does not own scenarioPreset or setDemoScenario', () => {
  const mockApi = createMockApiClient();
  const adapter = new HttpPromotorClassAdapter(mockApi);
  assert.equal((adapter as any).scenarioPreset, undefined);
  assert.equal((adapter as any).setDemoScenario, undefined);
});

test('2. BUNDLE_AVAILABLE: returns exact server state, intentLabel, and signal priority', async () => {
  const mockApi = createMockApiClient();
  const adapter = new HttpPromotorClassAdapter(mockApi);

  const { entitlements, integrationHealth } = await adapter.getEntitlementsAndHealth();
  assert.equal(entitlements.promotorFlow, true);
  assert.equal(integrationHealth.promotorClass, 'AVAILABLE');

  // getLearningContext preserves exact intentLabel and priority
  const ctx = await adapter.getLearningContext('contact_1');
  assert.equal(ctx.contactId, 'contact_1');
  assert.equal(ctx.activeEnrollments.length, 1);
  assert.equal(ctx.activeEnrollments[0].intentLabel, 'hot');
  assert.equal(ctx.recentSignals[0].priority, 15);
  assert.equal(ctx.recentSignals[0].reason, 'MILESTONE_80_PERCENT');

  // listEligiblePrograms preserves exact programType and pricing
  const programs = await adapter.listEligiblePrograms({ organizationId: 'org_1', contactId: 'contact_1' });
  assert.equal(programs.length, 1);
  assert.equal(programs[0].programType, 'aftersales');
  assert.equal(programs[0].pricing, 'paid');
  assert.equal(programs[0].priceAmount, 450000);

  // enrollContact
  const enr = await adapter.enrollContact({
    organizationId: 'org_1',
    contactId: 'contact_1',
    programId: 'prog_abc',
    source: 'PROMOTORFLOW_MANUAL',
    idempotencyKey: 'idem_test_1',
  });
  assert.equal(enr.enrollmentId, 'enr_manual_1');

  // getEnrollmentStatus
  const status = await adapter.getEnrollmentStatus('contact_1', 'prog_abc');
  assert.ok(status);
  assert.equal(status?.status, 'selesai');
  assert.equal(status?.progressPercent, 100);
});

test('3. BUNDLE_CLASS_UNAVAILABLE: server health UNAVAILABLE triggers fail-closed error', async () => {
  const mockApi = createMockApiClient({
    getIntegrationHealth: async () => ({ promotorFlow: 'AVAILABLE', promotorClass: 'UNAVAILABLE' }),
  });
  const adapter = new HttpPromotorClassAdapter(mockApi);

  const { integrationHealth } = await adapter.getEntitlementsAndHealth();
  assert.equal(integrationHealth.promotorClass, 'UNAVAILABLE');

  await assert.rejects(
    async () => adapter.getLearningContext('contact_1'),
    /PromotorClass service is currently unavailable/
  );
  await assert.rejects(
    async () => adapter.listEligiblePrograms({ organizationId: 'org_1', contactId: 'contact_1' }),
    /PromotorClass service is currently unavailable/
  );
  await assert.rejects(
    async () =>
      adapter.enrollContact({
        organizationId: 'org_1',
        contactId: 'contact_1',
        programId: 'prog_abc',
        source: 'PROMOTORFLOW_MANUAL',
        idempotencyKey: 'idem_test_2',
      }),
    /PromotorClass service is currently unavailable/
  );
  await assert.rejects(
    async () => adapter.getEnrollmentStatus('contact_1', 'prog_abc'),
    /PromotorClass service is currently unavailable/
  );
});

test('4. 404 No Record: returns clean empty context or null status without throwing', async () => {
  const mockApi = createMockApiClient({
    getContactLearningContext: async () => {
      const err: any = new Error('Not found');
      err.status = 404;
      throw err;
    },
    listClassEnrollments: async () => {
      const err: any = new Error('Not found');
      err.status = 404;
      throw err;
    },
  });
  const adapter = new HttpPromotorClassAdapter(mockApi);

  const ctx = await adapter.getLearningContext('contact_unknown');
  assert.equal(ctx.contactId, 'contact_unknown');
  assert.deepEqual(ctx.activeEnrollments, []);
  assert.deepEqual(ctx.recentSignals, []);

  const status = await adapter.getEnrollmentStatus('contact_unknown', 'prog_abc');
  assert.equal(status, null);
});

test('5. 401/403 Authorization: throws directly and never mutates local entitlements', async () => {
  const mockApi = createMockApiClient({
    getContactLearningContext: async () => {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    },
  });
  const adapter = new HttpPromotorClassAdapter(mockApi);

  await assert.rejects(
    async () => adapter.getLearningContext('contact_1'),
    (err: any) => err.status === 403
  );

  // Subsequent call to getEntitlementsAndHealth still reflects server truth, not false mutation
  const { entitlements } = await adapter.getEntitlementsAndHealth();
  assert.equal(entitlements.promotorFlow, true);
});

test('6. 500 / Network Failure: fails closed as service unavailable', async () => {
  const mockApi = createMockApiClient({
    getContactLearningContext: async () => {
      const err: any = new Error('Internal Server Error');
      err.status = 500;
      throw err;
    },
  });
  const adapter = new HttpPromotorClassAdapter(mockApi);

  await assert.rejects(
    async () => adapter.getLearningContext('contact_1'),
    /PromotorClass service is currently unavailable/
  );
});
