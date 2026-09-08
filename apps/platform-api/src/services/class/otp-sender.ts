export interface OtpSender {
  send(phoneE164: string, code: string): Promise<void>;
}

export function createLogOtpSender(logger: Pick<Console, 'info'> = console): OtpSender {
  return {
    async send(phoneE164, code) {
      logger.info(`[OTP:dev] kode untuk ${phoneE164}: ${code}`);
    },
  };
}

export function createFonnteOtpSender(token: string): OtpSender {
  return {
    async send(phoneE164, code) {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: phoneE164.replace(/^\+/, ''),
          message: `Kode login Ralivo Anda: ${code}\nBerlaku 5 menit. Jangan bagikan kode ini ke siapa pun.`,
        }),
      });
      if (!res.ok) {
        throw new Error(`FONNTE_HTTP_${res.status}`);
      }
    },
  };
}
