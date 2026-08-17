import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createLocalPromotorFlowAdapter } from '../adapters/local-promotor-flow-adapter';
import { DomainError } from '../core/errors';
import type { OrganizationContext } from '../core/organization-context';
import { getNextLocalDay10Am } from '../domain/next-action-rules';

describe('B6 — Class Integration Seam Unit Invariants (No DB)', () => {
  const ctxA: OrganizationContext = { organizationId: 'org-seam-unit-1' };
  const mockNow = new Date('2026-08-17T03:00:00.000Z');

  it('unbound adapter rejects createNextAction with UNAUTHORIZED even when payload provides organizationId', async () => {
    const unboundAdapter = createLocalPromotorFlowAdapter({} as any, { clock: () => mockNow });

    await assert.rejects(
      async () =>
        unboundAdapter.createNextAction({
          organizationId: 'org-seam-unit-1',
          contactId: 'c-1',
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-1',
          actionType: 'FOLLOW_UP',
          title: 'Title',
          reason: 'Reason',
          idempotencyKey: 'idem-1',
          context: {},
        }),
      (err: any) => err instanceof DomainError && err.code === 'UNAUTHORIZED'
    );
  });

  it('unbound adapter rejects appendLearningActivity with UNAUTHORIZED even when payload provides organizationId', async () => {
    const unboundAdapter = createLocalPromotorFlowAdapter({} as any, { clock: () => mockNow });

    await assert.rejects(
      async () =>
        unboundAdapter.appendLearningActivity({
          organizationId: 'org-seam-unit-1',
          contactId: 'c-1',
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-1',
          eventType: 'PROGRAM_COMPLETED',
          summary: 'Summary',
          context: {},
          idempotencyKey: 'idem-1',
        }),
      (err: any) => err instanceof DomainError && err.code === 'UNAUTHORIZED'
    );
  });

  it('bound adapter rejects payload organizationId mismatch with FORBIDDEN', async () => {
    const boundAdapter = createLocalPromotorFlowAdapter({} as any, { ctx: ctxA, clock: () => mockNow });

    await assert.rejects(
      async () =>
        boundAdapter.createNextAction({
          organizationId: 'org-seam-unit-DIFFERENT',
          contactId: 'c-1',
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-1',
          actionType: 'FOLLOW_UP',
          title: 'Title',
          reason: 'Reason',
          idempotencyKey: 'idem-1',
          context: {},
        }),
      (err: any) => err instanceof DomainError && err.code === 'FORBIDDEN'
    );

    await assert.rejects(
      async () =>
        boundAdapter.appendLearningActivity({
          organizationId: 'org-seam-unit-DIFFERENT',
          contactId: 'c-1',
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-1',
          eventType: 'PROGRAM_COMPLETED',
          summary: 'Summary',
          context: {},
          idempotencyKey: 'idem-1',
        }),
      (err: any) => err instanceof DomainError && err.code === 'FORBIDDEN'
    );
  });

  it('rejects invalid LearningNextActionRequest schema inputs', async () => {
    const adapter = createLocalPromotorFlowAdapter({} as any, { ctx: ctxA, clock: () => mockNow });

    // Missing required fields / invalid type
    await assert.rejects(
      async () =>
        adapter.createNextAction({
          organizationId: 'org-seam-unit-1',
          contactId: 'c-1',
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-1',
          actionType: 'INVALID_TYPE' as any,
          title: '',
          reason: '',
          idempotencyKey: 'idem-1',
          context: {},
        }),
      (err: any) => err instanceof DomainError && err.code === 'VALIDATION_ERROR'
    );
  });

  it('rejects invalid LearningActivityProjection schema inputs', async () => {
    const adapter = createLocalPromotorFlowAdapter({} as any, { ctx: ctxA, clock: () => mockNow });

    await assert.rejects(
      async () =>
        adapter.appendLearningActivity({
          organizationId: 'org-seam-unit-1',
          contactId: 'c-1',
          source: 'PROMOTORCLASS',
          sourceEventId: 'evt-1',
          eventType: 'INVALID_EVENT' as any,
          summary: 'Summary',
          context: {},
          idempotencyKey: 'idem-1',
        }),
      (err: any) => err instanceof DomainError && err.code === 'VALIDATION_ERROR'
    );
  });

  it('withContext creates a new adapter instance bound to the given tenant context', () => {
    const rootAdapter = createLocalPromotorFlowAdapter({} as any);
    const boundAdapter = rootAdapter.withContext(ctxA);
    assert.ok(boundAdapter);
    assert.notStrictEqual(rootAdapter, boundAdapter);
  });

  it('calculates deterministic fallback dueAt next local day 10:00 WIB', () => {
    const expected = getNextLocalDay10Am(mockNow, 'Asia/Jakarta');
    assert.strictEqual(expected.toISOString(), '2026-08-18T03:00:00.000Z');
  });
});
