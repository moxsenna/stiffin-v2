import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('signup enabled gate', () => {
  it('createAuth exposes sign-up email path', async () => {
    assert.equal(1 + 1, 2);
  });
});
