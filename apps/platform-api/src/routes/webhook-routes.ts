import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import type { AppEnv } from '../app';
import { whatsappDevices, whatsappInbox, contacts, providerWebhookEvents } from '../db/schema';
import { verifyWakonekSignature, extractInboundText } from '../services/wakonek-service';

export function registerWebhookRoutes(app: Hono<AppEnv>) {
  // ==========================================
  // Public Wakonek Webhook Receiver (HMAC-verified, Idempotent)
  // ==========================================
  app.post('/api/v1/webhooks/wakonek', async (c) => {
    c.header('Cache-Control', 'no-store');
    const rawBody = await c.req.text();
    const signatureHeader =
      c.req.header('x-wakonek-signature') ||
      c.req.header('X-Wakonek-Signature');

    const secret = c.env?.WAKONEK_WEBHOOK_SECRET;
    if (!verifyWakonekSignature(rawBody, signatureHeader, secret)) {
      return c.json({ error: 'invalid signature' }, 401);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return c.json({ error: 'invalid payload' }, 400);
    }

    if (payload?.event === 'message.received' && payload.message?.id) {
      const db = c.get('db');
      const msg = payload.message;
      const waMessageId = String(msg.id);

      const [device] = await db
        .select({ organizationId: whatsappDevices.organizationId })
        .from(whatsappDevices)
        .where(eq(whatsappDevices.deviceId, payload.deviceId))
        .limit(1);

      if (device) {
        const chatJid: string = typeof msg.chatJid === 'string' ? msg.chatJid : '';
        const isGroup = chatJid.endsWith('@g.us');
        const digits = chatJid
          .replace(/@s\.whatsapp\.net$/, '')
          .replace(/@g\.us$/, '')
          .replace(/\D/g, '');
        const phoneE164 = isGroup ? chatJid : `+${digits}`;

        let contactId: string | null = null;
        if (!isGroup && digits) {
          const [contact] = await db
            .select({ id: contacts.id })
            .from(contacts)
            .where(
              and(
                eq(contacts.organizationId, device.organizationId),
                eq(contacts.phoneE164, phoneE164),
                isNull(contacts.deletedAt)
              )
            )
            .limit(1);
          contactId = contact?.id ?? null;
        }

        const { text, type } = extractInboundText(msg.payload);

        await db
          .insert(whatsappInbox)
          .values({
            organizationId: device.organizationId,
            contactId,
            waMessageId,
            chatJid,
            phoneE164,
            isGroup,
            type,
            text,
            rawPayload: msg.payload ?? null,
            receivedAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date().toISOString(),
            isRead: false,
          })
          .onConflictDoNothing();

        await db
          .insert(providerWebhookEvents)
          .values({
            provider: 'WAKONEK',
            providerEventId: waMessageId,
            eventType: payload.event,
            processingResult: 'SUCCESS',
          })
          .onConflictDoNothing();
      }
    }

    return c.json({ ok: true }, 200);
  });
}
