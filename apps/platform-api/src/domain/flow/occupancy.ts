import { BusyInterval } from './slots';

export interface BookingOccupancyCandidate {
  startAt: Date | string;
  endAt?: Date | string | null;
  status: string;
  serviceDurationMinutes?: number;
}

const TERMINAL_NON_BLOCKING_STATUSES = new Set(['CANCELLED', 'NO_SHOW']);
const BUSY_STATUSES = new Set(['PENDING', 'CONFIRMED', 'COMPLETED']);

/**
 * Pure helper to convert a list of raw bookings into canonical busy intervals.
 */
export function deriveBusyIntervals(
  bookings: BookingOccupancyCandidate[],
  defaultDurationMinutes = 60
): BusyInterval[] {
  const intervals: BusyInterval[] = [];

  for (const b of bookings) {
    if (TERMINAL_NON_BLOCKING_STATUSES.has(b.status)) {
      continue;
    }
    if (!BUSY_STATUSES.has(b.status)) {
      continue;
    }

    const startAt = typeof b.startAt === 'string' ? new Date(b.startAt) : b.startAt;
    let endAt: Date;

    if (b.endAt) {
      endAt = typeof b.endAt === 'string' ? new Date(b.endAt) : b.endAt;
    } else {
      const dur = b.serviceDurationMinutes && b.serviceDurationMinutes > 0 ? b.serviceDurationMinutes : defaultDurationMinutes;
      endAt = new Date(startAt.getTime() + dur * 60000);
    }

    if (endAt > startAt) {
      intervals.push({ startAt, endAt });
    }
  }

  return intervals;
}
