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

export interface ResendConfig {
  apiKey: string;
  from: string;
}

/**
 * Resend via HTTP API (Worker-compatible fetch, no SMTP dependency).
 * Fail-closed: non-2xx throws sanitized error, no key/body leakage.
 */
export function createResendEmailService(config: ResendConfig): EmailService {
  return {
    async sendEmail(to: string, subject: string, html: string): Promise<void> {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: config.from, to: [to], subject, html }),
      });
      if (!res.ok) {
        throw new Error(`EMAIL_DELIVERY_FAILED status=${res.status}`);
      }
    },
  };
}

export function resolveEmailService(env?: Env): EmailService {
  if (env?.EMAIL_MODE === 'resend' && env?.RESEND_API_KEY && env?.EMAIL_FROM) {
    return createResendEmailService({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
  }
  return createLogEmailService();
}
