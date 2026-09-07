import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LearnersListQuerySchema } from '@promotor/contracts';

describe('LearnersListQuerySchema & Inactivity Sweep Validation', () => {
  it('validates learningStatus whitelist correctly', () => {
    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK'] as const;
    for (const status of validStatuses) {
      const result = LearnersListQuerySchema.safeParse({ learningStatus: status });
      assert.strictEqual(result.success, true, `Status ${status} should be valid`);
      if (result.success) {
        assert.strictEqual(result.data.learningStatus, status);
      }
    }
  });

  it('rejects invalid learningStatus with validation error', () => {
    const result = LearnersListQuerySchema.safeParse({ learningStatus: 'UNKNOWN_STATUS' });
    assert.strictEqual(result.success, false, 'Invalid status must fail validation');
  });

  it('coerces and defaults limit and offset', () => {
    const result = LearnersListQuerySchema.safeParse({});
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.limit, 50);
      assert.strictEqual(result.data.offset, 0);
    }
  });
});
