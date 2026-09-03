import { PhoneE164Schema, PhoneE164 } from '@promotor/contracts';

/**
 * Strictly normalizes raw phone input to E.164 standard (+628...).
 * Throws an Error if the phone number cannot be parsed into a valid E.164 format.
 */
export function normalizePhone(rawPhone: string): PhoneE164 {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new Error('Nomor HP tidak boleh kosong');
  }

  // Remove spaces, hyphens, parentheses, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '');

  // Convert domestic 08... prefix to +628...
  if (cleaned.startsWith('08')) {
    cleaned = '+62' + cleaned.substring(1);
  } else if (cleaned.startsWith('628')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('8')) {
    cleaned = '+62' + cleaned;
  }

  // Validate using canonical Zod PhoneE164Schema
  const parseResult = PhoneE164Schema.safeParse(cleaned);
  if (!parseResult.success) {
    throw new Error(`Nomor HP "${rawPhone}" tidak valid. Format harus E.164 (contoh: +6281234567890)`);
  }

  return parseResult.data;
}

/**
 * Canonical default organization timezone (INTEGRATION_CONTRACT §11).
 */
export const DEFAULT_ORGANIZATION_TIMEZONE = 'Asia/Jakarta';

/**
 * Canonical email normalization for contact identity matching
 * (INTEGRATION_CONTRACT §10: "optional normalized-email fallback").
 * B1 policy: trim + lowercase. Persistence and lookup MUST use this
 * same helper — never normalize differently across the boundary.
 */
export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase();
}

/**
 * Validates an IANA timezone identifier by format + existence check.
 * Accepts "Region/City" style identifiers (optional sub-regions).
 */
export function isValidIanaTimezone(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: input }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats E.164 phone string for human readable UI display (+62 812-3456-7890)
 */
export function formatPhoneDisplay(e164: string): string {
  if (!e164 || !e164.startsWith('+62')) return e164 || '';
  const digits = e164.substring(3);
  if (digits.length >= 8) {
    return `+62 ${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7)}`;
  }
  return e164;
}

/**
 * Formats relative time ago (e.g., "5 menit lalu", "2 jam lalu")
 */
export function formatTimeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return 'baru saja';
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m lalu`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}j lalu`;
  return `${Math.floor(secondsAgo / 86400)}h lalu`;
}

/**
 * Formats integer IDR currency amount (e.g. 149000 -> "Rp 149.000").
 */
export function formatIDR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return 'Rp 0';
  }
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

const ORDER_REF_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates human-safe public order reference (e.g. "TLR-8F4K2Q").
 */
export function generateOrderReference(prefix = 'TLR'): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * ORDER_REF_CHARS.length);
    code += ORDER_REF_CHARS[idx];
  }
  return `${prefix}-${code}`;
}

