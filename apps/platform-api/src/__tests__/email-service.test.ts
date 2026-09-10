import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createLogEmailService, createMailketingEmailService, resolveEmailService } from '../services/email/email-service';

describe('email-service log-first', () => {
  it('resolves without throwing and exposes sendEmail', async () => {
    const svc = createLogEmailService();
    assert.equal(typeof svc.sendEmail, 'function');
    await svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>');
  });

  it('defaults to log service without mailketing env', async () => {
    const svc = resolveEmailService({});
    assert.equal(typeof svc.sendEmail, 'function');
    await svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>');
  });

  it('mailketing service posts to api.mailketing.co.id with X-Api-Token and throws sanitized error on non-2xx', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const origFetch = globalThis.fetch;
    (globalThis as Record<string, unknown>).fetch = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{}', { status: 400 });
    };
    try {
      const svc = createMailketingEmailService({ apiToken: 'mk_test', fromName: 'Ralivo', fromEmail: 'noreply@ralivo.biz.id' });
      await assert.rejects(() => svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>'), /EMAIL_DELIVERY_FAILED/);
      assert.equal(calls[0].url, 'https://api.mailketing.co.id/api/v2/send');
      const headers = calls[0].init.headers as Record<string, string>;
      assert.equal(headers['X-Api-Token'], 'mk_test');
      const body = JSON.parse(calls[0].init.body as string) as Record<string, string>;
      assert.equal(body.from_email, 'noreply@ralivo.biz.id');
      assert.equal(body.recipient, 'a@example.com');
      assert.ok(!('apiToken' in body), 'token must travel in header, not body');
    } finally {
      (globalThis as Record<string, unknown>).fetch = origFetch;
    }
  });

  it('resolveEmailService picks mailketing when EMAIL_MODE=mailketing with token+from', async () => {
    const calls: Array<{ url: string }> = [];
    const origFetch = globalThis.fetch;
    (globalThis as Record<string, unknown>).fetch = async (url: string) => {
      calls.push({ url });
      return new Response('{}', { status: 400 });
    };
    try {
      const svc = resolveEmailService({ EMAIL_MODE: 'mailketing', MAILKETING_API_TOKEN: 'mk_test', EMAIL_FROM: 'noreply@ralivo.biz.id' });
      await assert.rejects(() => svc.sendEmail('a@example.com', 'subjek', '<p>hi</p>'));
      assert.equal(calls[0].url, 'https://api.mailketing.co.id/api/v2/send');
    } finally {
      (globalThis as Record<string, unknown>).fetch = origFetch;
    }
  });
});
