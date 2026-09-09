import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createLogEmailService } from '../services/email/email-service';

describe('email-service log-first', () => {
  it('resolves without throwing and exposes sendEmail', async () => {
    const svc = createLogEmailService();
    assert.equal(typeof svc.sendEmail, 'function');
    await svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>');
  });
});
