/**
 * Activity Catalog & Taxonomy Pure Domain Definitions
 *
 * Canonical taxonomy of all 21 activity event types and projection keys.
 * This module is 100% pure (no IO, no DB, no framework dependencies).
 */

export const ACTIVITY_EVENT_TYPES = [
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'STAGE_CHANGED',
  'WHATSAPP_OPENED',
  'WHATSAPP_SENT',
  'ACTION_CREATED',
  'ACTION_COMPLETED',
  'ACTION_RESCHEDULED',
  'ACTION_SKIPPED',
  'ACTION_CANCELLED',
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
  'BOOKING_NO_SHOW',
  'BOOKING_COMPLETED',
  'PAYMENT_MARKED',
  'AFTERCARE_CREATED',
  'AFTERCARE_COMPLETED',
  'ASSESSMENT_STATUS_CHANGED',
  'CLASS_SIGNAL',
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const ACTIVITY_EVENT_COUNT = 21;

export function isActivityEventType(val: unknown): val is ActivityEventType {
  return typeof val === 'string' && (ACTIVITY_EVENT_TYPES as readonly string[]).includes(val);
}

export const ACTIVITY_PROJECTION_KEYS: Record<ActivityEventType, string> = {
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  STAGE_CHANGED: 'stage.changed',
  WHATSAPP_OPENED: 'whatsapp.opened',
  WHATSAPP_SENT: 'whatsapp.sent',
  ACTION_CREATED: 'action.created',
  ACTION_COMPLETED: 'action.completed',
  ACTION_RESCHEDULED: 'action.rescheduled',
  ACTION_SKIPPED: 'action.skipped',
  ACTION_CANCELLED: 'action.cancelled',
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_RESCHEDULED: 'booking.rescheduled',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_NO_SHOW: 'booking.no_show',
  BOOKING_COMPLETED: 'booking.completed',
  PAYMENT_MARKED: 'payment.marked',
  AFTERCARE_CREATED: 'aftercare.created',
  AFTERCARE_COMPLETED: 'aftercare.completed',
  ASSESSMENT_STATUS_CHANGED: 'assessment.status_changed',
  CLASS_SIGNAL: 'class.signal',
};

export function getActivityProjectionKey(eventType: ActivityEventType): string {
  return ACTIVITY_PROJECTION_KEYS[eventType];
}
