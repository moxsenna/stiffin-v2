/**
 * Today Grouping Pure Domain Rules
 *
 * Implements timezone-aware calendar day grouping (overdue, today, upcoming).
 * This module is 100% pure (no IO, no DB, no framework dependencies).
 */

import { getLocalCalendarDate, getInstantForZonedDateTime } from './next-action-rules';

export interface DueItem {
  dueAt: string | Date;
  [key: string]: unknown;
}

export interface TodayGroupingResult<T> {
  date: string; // YYYY-MM-DD in organization timezone
  overdue: T[];
  today: T[];
  upcoming: T[];
}

/**
 * Groups items into overdue, today, and upcoming based on organization timezone calendar boundaries:
 * - overdue: dueAt < start of CURRENT LOCAL calendar day (00:00:00 local)
 * - today: start of CURRENT LOCAL day <= dueAt < start of NEXT LOCAL day (00:00:00 local)
 * - upcoming: dueAt >= start of NEXT LOCAL day
 */
export function groupTodayActions<T extends DueItem>(
  items: readonly T[],
  now: string | Date,
  timeZone: string
): TodayGroupingResult<T> {
  const nowDate = typeof now === 'string' ? new Date(now) : now;
  const localNow = getLocalCalendarDate(nowDate, timeZone);

  const yearStr = String(localNow.year);
  const monthStr = String(localNow.month).padStart(2, '0');
  const dayStr = String(localNow.day).padStart(2, '0');
  const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

  // Start of current local day: YYYY-MM-DD 00:00:00 in timeZone
  const startOfToday = getInstantForZonedDateTime({
    year: localNow.year,
    month: localNow.month,
    day: localNow.day,
    hour: 0,
    minute: 0,
    second: 0,
    timeZone,
  });

  // Start of next local day: (YYYY-MM-DD + 1 day) 00:00:00 in timeZone
  const nextDayUtc = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day + 1, 12, 0, 0));
  const startOfTomorrow = getInstantForZonedDateTime({
    year: nextDayUtc.getUTCFullYear(),
    month: nextDayUtc.getUTCMonth() + 1,
    day: nextDayUtc.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
    timeZone,
  });

  const startTodayMs = startOfToday.getTime();
  const startTomorrowMs = startOfTomorrow.getTime();

  const overdue: T[] = [];
  const today: T[] = [];
  const upcoming: T[] = [];

  for (const item of items) {
    const dueMs = (typeof item.dueAt === 'string' ? new Date(item.dueAt) : item.dueAt).getTime();

    if (dueMs < startTodayMs) {
      overdue.push(item);
    } else if (dueMs < startTomorrowMs) {
      today.push(item);
    } else {
      upcoming.push(item);
    }
  }

  return {
    date: dateStr,
    overdue,
    today,
    upcoming,
  };
}
