import type { Env } from '../../env';

export interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

export function createLogEmailService(): EmailService {
  return {
    async sendEmail(to: string, subject: string, html: string): Promise<void> {
      console.log(`[email] to=${to} subject=${subject} htmlLen=${html.length}`);
    },
  };
}

export interface MailketingConfig {
  apiToken: string;
  fromName: string;
  fromEmail: string;
}

/**
 * Mailketing API v2 (Worker-compatible fetch, X-Api-Token header).
 * Docs: POST https://api.mailketing.co.id/api/v2/send
 * Body: { from_name, from_email, subject, recipient, content }.
 * Fail-closed: non-2xx throws sanitized error, no token/body leakage.
 */
export function createMailketingEmailService(config: MailketingConfig): EmailService {
  return {
    async sendEmail(to: string, subject: string, html: string): Promise<void> {
      const res = await fetch('https://api.mailketing.co.id/api/v2/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': config.apiToken,
        },
        body: JSON.stringify({
          from_name: config.fromName,
          from_email: config.fromEmail,
          subject,
          recipient: to,
          content: html,
        }),
      });
      if (!res.ok) {
        throw new Error(`EMAIL_DELIVERY_FAILED status=${res.status}`);
      }
    },
  };
}

export function resolveEmailService(env?: Env): EmailService {
  if (env?.EMAIL_MODE === 'mailketing' && env?.MAILKETING_API_TOKEN && env?.EMAIL_FROM) {
    return createMailketingEmailService({
      apiToken: env.MAILKETING_API_TOKEN,
      fromName: env.EMAIL_FROM_NAME ?? 'Ralivo',
      fromEmail: env.EMAIL_FROM,
    });
  }
  return createLogEmailService();
}
