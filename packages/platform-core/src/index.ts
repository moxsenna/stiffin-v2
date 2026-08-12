import { Contact, ContactId, OrganizationId } from '@promotor/contracts';

/**
 * Normalizes any Indonesian raw phone input string to canonical E.164 format (+628...).
 * Examples:
 * - "08123456789" -> "+628123456789"
 * - "628123456789" -> "+628123456789"
 * - "+62 812-3456-789" -> "+628123456789"
 */
export function normalizePhone(rawInput: string): string {
  if (!rawInput) return '';
  const digitsOnly = rawInput.replace(/\D/g, '');
  
  if (digitsOnly.startsWith('0')) {
    return '+62' + digitsOnly.substring(1);
  }
  if (digitsOnly.startsWith('62')) {
    return '+' + digitsOnly;
  }
  if (digitsOnly.length > 5) {
    return '+' + digitsOnly;
  }
  return rawInput.trim();
}

/**
 * Formats an E.164 phone number for clean human-readable UI display.
 */
export function formatPhoneDisplay(e164Phone: string): string {
  if (!e164Phone) return '';
  const clean = e164Phone.replace(/\D/g, '');
  if (clean.startsWith('628')) {
    const localNumber = '08' + clean.substring(3);
    if (localNumber.length >= 10) {
      return `${localNumber.substring(0, 4)}-${localNumber.substring(4, 8)}-${localNumber.substring(8)}`;
    }
    return localNumber;
  }
  return e164Phone;
}

/**
 * Platform-neutral date/time formatters.
 */
export function formatTimeAgo(timestampISO: string): string {
  if (!timestampISO) return '';
  const date = new Date(timestampISO);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

/**
 * Shared identity helper function to create a new Contact record structure.
 */
export function createContactIdentity(
  organizationId: OrganizationId,
  name: string,
  rawPhone: string,
  email?: string
): Contact {
  const normalized = normalizePhone(rawPhone);
  const generatedId = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: generatedId,
    organizationId,
    name: name.trim(),
    phone: normalized,
    email: email?.trim(),
    createdAt: new Date().toISOString(),
  };
}
