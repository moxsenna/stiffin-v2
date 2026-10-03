import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { whatsappDevices, whatsappInbox } from '../db/schema';
import type { Env } from '../env';
import { DomainError } from '../core/errors';

export type WaStage =
  | 'unconfigured'
  | 'not_connected'
  | 'needs_pairing'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface WaStatusResult {
  stage: WaStage;
  phone: string | null;
  deviceId: string | null;
}

export interface SendWaTextInput {
  target: string;
  text: string;
}

export interface SendWaTextResult {
  messageId: string;
  status: string;
}

const pairingTokenCache = new Map<string, string>();

export function isWakonekConfigured(env?: Env): boolean {
  return Boolean(env?.WAKONEK_GATEWAY_URL?.trim() && env?.WAKONEK_API_KEY?.trim());
}

export async function gatewayFetch(
  env: Env,
  pathname: string,
  init: RequestInit = {}
): Promise<Response> {
  const baseUrl = (env.WAKONEK_GATEWAY_URL ?? '').replace(/\/+$/, '');
  const apiKey = env.WAKONEK_API_KEY ?? '';
  return fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Provision device WhatsApp baru di gateway jika belum ada row di DB.
 * Jika row sudah ada -> reuse row (jangan panggil gateway POST /v1/devices).
 */
export async function provisionOrReuseDevice(
  db: any,
  env: Env,
  organizationId: string
): Promise<{ deviceId: string; deviceToken: string; pairingToken?: string }> {
  if (!isWakonekConfigured(env)) {
    throw Object.assign(new Error('Wakonek gateway belum dikonfigurasi'), { code: 'UNCONFIGURED' });
  }

  const [existing] = await db
    .select()
    .from(whatsappDevices)
    .where(eq(whatsappDevices.organizationId, organizationId))
    .limit(1);

  if (existing) {
    return {
      deviceId: existing.deviceId,
      deviceToken: existing.deviceToken,
      pairingToken: pairingTokenCache.get(existing.deviceId),
    };
  }

  const res = await gatewayFetch(env, '/v1/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalUserId: organizationId,
      label: `Org ${organizationId.slice(0, 8)}`,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gateway WhatsApp gagal membuat perangkat (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    deviceId: string;
    deviceToken: string;
    pairingToken: string;
  };

  await db.insert(whatsappDevices).values({
    organizationId,
    deviceId: data.deviceId,
    deviceToken: data.deviceToken,
    status: 'needs_pairing',
  });

  if (data.pairingToken) {
    pairingTokenCache.set(data.deviceId, data.pairingToken);
  }

  return data;
}

/**
 * Status WhatsApp organisasi.
 * Reads device row; no row -> { stage: 'not_connected', phone: null, deviceId: null }
 * Else call /v1/devices/me and map:
 *   connected -> 'connected'
 *   qr | connecting -> 'connecting'
 *   disconnected -> phone ? 'disconnected' : 'needs_pairing'
 *   logged_out -> 'needs_pairing'
 *   403 / 404 -> 'needs_pairing'
 *   fetch throw -> 'error'
 * Missing env -> 'unconfigured'
 */
export async function getWaStatus(
  db: any,
  env: Env,
  organizationId: string
): Promise<WaStatusResult> {
  if (!isWakonekConfigured(env)) {
    return { stage: 'unconfigured', phone: null, deviceId: null };
  }

  const [row] = await db
    .select()
    .from(whatsappDevices)
    .where(eq(whatsappDevices.organizationId, organizationId))
    .limit(1);

  if (!row) {
    return { stage: 'not_connected', phone: null, deviceId: null };
  }

  try {
    const res = await gatewayFetch(env, '/v1/devices/me', {
      headers: { 'X-Device-Token': row.deviceToken },
    });

    if (res.status === 403 || res.status === 404) {
      return { stage: 'needs_pairing', phone: row.phoneE164 ?? null, deviceId: row.deviceId };
    }

    if (!res.ok) {
      return { stage: 'error', phone: row.phoneE164 ?? null, deviceId: row.deviceId };
    }

    const device = (await res.json()) as {
      deviceId: string;
      label?: string;
      phone: string | null;
      status: string;
      externalUserId?: string;
    };

    const phone = device.phone ?? row.phoneE164 ?? null;

    let stage: WaStage;
    if (device.status === 'connected') {
      stage = 'connected';
    } else if (device.status === 'qr' || device.status === 'connecting') {
      stage = 'connecting';
    } else if (device.status === 'disconnected') {
      stage = phone ? 'disconnected' : 'needs_pairing';
    } else if (device.status === 'logged_out') {
      stage = 'needs_pairing';
    } else {
      stage = 'error';
    }

    if (device.status === 'connected' && device.phone && device.phone !== row.phoneE164) {
      await db
        .update(whatsappDevices)
        .set({
          phoneE164: device.phone,
          status: stage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(whatsappDevices.id, row.id));
    }

    return { stage, phone, deviceId: device.deviceId ?? row.deviceId };
  } catch {
    return { stage: 'error', phone: row.phoneE164 ?? null, deviceId: row.deviceId };
  }
}

/**
 * Kirim pesan WhatsApp teks ke target.
 * Map 400 "not connected" -> throw { code: 'NOT_CONNECTED' }
 * 500+failed -> return { messageId, status: 'failed' }
 */
export async function sendWaText(
  db: any,
  env: Env,
  organizationId: string,
  input: SendWaTextInput
): Promise<SendWaTextResult> {
  if (!isWakonekConfigured(env)) {
    throw Object.assign(new Error('Wakonek belum dikonfigurasi'), { code: 'UNCONFIGURED' });
  }

  const [row] = await db
    .select()
    .from(whatsappDevices)
    .where(eq(whatsappDevices.organizationId, organizationId))
    .limit(1);

  if (!row) {
    throw Object.assign(new Error('WhatsApp belum terhubung'), { code: 'NOT_CONNECTED' });
  }

  const cleanTarget = input.target.replace(/\D/g, '');
  if (!/^[1-9]\d{6,15}$/.test(cleanTarget)) {
    throw new DomainError('VALIDATION_ERROR', 'Nomor tujuan tidak valid');
  }

  const text = input.text.trim();
  if (text.length === 0 || text.length > 4096) {
    throw new DomainError('VALIDATION_ERROR', 'Isi pesan wajib 1-4096 karakter');
  }

  const res = await gatewayFetch(env, '/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Token': row.deviceToken,
    },
    body: JSON.stringify({
      deviceId: row.deviceId,
      target: cleanTarget,
      type: 'text',
      text,
    }),
  });

  if (res.status === 403 || res.status === 404) {
    throw Object.assign(new Error('Sesi WhatsApp tidak berlaku'), { code: 'NOT_CONNECTED' });
  }

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as {
      messageId?: string;
      status?: string;
      error?: string;
    } | null;

    if (
      res.status === 400 &&
      detail?.error?.toLowerCase().includes('not connected')
    ) {
      throw Object.assign(new Error('Device is not connected'), { code: 'NOT_CONNECTED' });
    }

    if (detail?.status === 'failed') {
      return {
        messageId: detail.messageId ?? '',
        status: 'failed',
      };
    }

    throw new Error(`Gateway WhatsApp gagal mengirim (${res.status}): ${detail?.error ?? 'Unknown error'}`);
  }

  const data = (await res.json()) as { messageId?: string; status?: string };
  return {
    messageId: data.messageId ?? '',
    status: data.status ?? 'sent',
  };
}

/**
 * Ekstrak teks dari payload mentah Baileys (meniru unwrap
 * ephemeralMessage/viewOnceMessage di Baileys/Wakonek).
 */
export function extractInboundText(
  payload: unknown
): { text: string; type: string } {
  let inner = payload as Record<string, any> | null | undefined;

  while (inner) {
    if (inner.ephemeralMessage?.message) {
      inner = inner.ephemeralMessage.message;
      continue;
    }
    if (inner.viewOnceMessage?.message) {
      inner = inner.viewOnceMessage.message;
      continue;
    }
    if (inner.viewOnceMessageV2?.message) {
      inner = inner.viewOnceMessageV2.message;
      continue;
    }
    break;
  }

  if (!inner) return { text: '', type: 'unknown' };
  if (typeof inner.conversation === 'string' && inner.conversation) {
    return { text: inner.conversation, type: 'text' };
  }
  if (typeof inner.extendedTextMessage?.text === 'string' && inner.extendedTextMessage.text) {
    return { text: inner.extendedTextMessage.text, type: 'text' };
  }
  if (inner.imageMessage) return { text: inner.imageMessage.caption ?? '', type: 'image' };
  if (inner.documentMessage) return { text: inner.documentMessage.caption ?? '', type: 'document' };
  if (inner.locationMessage) return { text: '[Lokasi]', type: 'location' };
  if (inner.audioMessage) return { text: '[Pesan suara]', type: 'audio' };
  if (inner.videoMessage) return { text: inner.videoMessage.caption ?? '[Video]', type: 'video' };
  if (inner.stickerMessage) return { text: '[Stiker]', type: 'sticker' };
  return { text: '', type: 'unknown' };
}

/**
 * Verifikasi signature webhook Wakonek HMAC SHA256 dengan 5 menit toleransi.
 * Format header: "t=<unixsec>, v1=<hex>"
 */
export function verifyWakonekSignature(
  rawBody: string,
  signatureHeader?: string | null,
  secret?: string | null,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader || !secret) return false;

  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of signatureHeader.split(',')) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim().toLowerCase();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key === 't') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) timestamp = parsed;
    } else if (key === 'v1' && value.length > 0) {
      signature = value;
    }
  }

  if (timestamp === null || !signature) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSeconds) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  try {
    const actualBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (actualBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
}
