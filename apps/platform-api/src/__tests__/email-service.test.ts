import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createLogEmailService, createResendEmailService, resolveEmailService } from '../services/email/email-service';

describe('email-service log-first', () => {
  it('resolves without throwing and exposes sendEmail', async () => {
    const svc = createLogEmailService();
    assert.equal(typeof svc.sendEmail, 'function');
    await svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>');
  });

  it('defaults to log service without resend env', async () => {
    const svc = resolveEmailService({});
    assert.equal(typeof svc.sendEmail, 'function');
    await svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>');
  });

  it('resend service posts to api.resend.com and throws sanitized error on non-2xx', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const origFetch = globalThis.fetch;
    (globalThis as Record<string, unknown>).fetch = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{}', { status: 400 });
    };
    try {
      const svc = createResendEmailService({ apiKey: 're_test', from: 'Ralivo <n@example.com>' });
      await assert.rejects(() => svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>'), /EMAIL_DELIVERY_FAILED/);
      assert.equal(calls[0].url, 'https://api.resend.com/emails');
      assert.ok(!(calls[0].init.body as string).includes('re_test'), 'key must travel in header, not body');
    } finally {
      (globalThis as Record<string, unknown>).fetch = origFetch;
    }
  });

  it('resolveEmailService picks resend when EMAIL_MODE=resend with key+from', async () => {
    const calls: Array<{ url: string }> = [];
    const origFetch = globalThis.fetch;
    (globalThis as Record<string, unknown>).fetch = async (url: string) => {
      calls.push({ url });
      return new Response('{}', { status: 400 });
    };
    try {
      const svc = resolveEmailService({ EMAIL_MODE: 'resend', RESEND_API_KEY: 're_test', EMAIL_FROM: 'Ralivo <n@example.com>' });
      await assert.rejects(() => svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>'));
      assert.equal(calls[0].url, 'https://api.resend.com/emails');
    } finally {
      (globalThis as Record<string, unknown>).fetch = origFetch;
    }
  });
});
