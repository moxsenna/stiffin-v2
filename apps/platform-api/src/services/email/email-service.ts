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

export function resolveEmailService(_env?: Env): EmailService {
  return createLogEmailService();
}
