import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateCandidateSlots, SlotAvailabilityRule } from '../domain/flow/slots';
import { deriveBusyIntervals } from '../domain/flow/occupancy';

describe('B6.1 — Pure Slot Generation & Occupancy Rules Test Suite', () => {
  const weeklyRules: SlotAvailabilityRule[] = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true }, // Monday
    { dayOfWeek: 3, startTime: '14:00', endTime: '17:00', isActive: true }, // Wednesday
    { dayOfWeek: 5, startTime: '08:00', endTime: '11:00', isActive: false }, // Friday (inactive)
  ];

  it('1. generates fixed-duration candidate slots within active availability windows in Asia/Jakarta', () => {
    // Evaluation at Monday 2026-08-17 00:00:00 UTC (07:00 WIB)
    const evalNow = new Date('2026-08-17T00:00:00.000Z');
    const rangeFrom = new Date('2026-08-17T00:00:00.000Z');
    const rangeTo = new Date('2026-08-17T17:00:00.000Z'); // Covers entire day

    const slots = generateCandidateSlots({
      organizationTimezone: 'Asia/Jakarta',
      evaluationNow: evalNow,
      rangeFrom,
      rangeTo,
      serviceDurationMinutes: 60,
      weeklyRules,
      existingBusyIntervals: [],
      bufferMinutes: 30,
    });

    // Monday 09:00 - 12:00 WIB has 3 x 60m slots:
    // 09:00 WIB = 02:00 UTC
    // 10:00 WIB = 03:00 UTC
    // 11:00 WIB = 04:00 UTC
    assert.strictEqual(slots.length, 3);
    assert.strictEqual(slots[0].startAt, '2026-08-17T02:00:00.000Z');
    assert.strictEqual(slots[0].endAt, '2026-08-17T03:00:00.000Z');
    assert.strictEqual(slots[0].localDisplay, '09:00 - 10:00');
    assert.strictEqual(slots[0].localDate, '2026-08-17');

    assert.strictEqual(slots[1].startAt, '2026-08-17T03:00:00.000Z');
    assert.strictEqual(slots[1].endAt, '2026-08-17T04:00:00.000Z');
    assert.strictEqual(slots[1].localDisplay, '10:00 - 11:00');

    assert.strictEqual(slots[2].startAt, '2026-08-17T04:00:00.000Z');
    assert.strictEqual(slots[2].endAt, '2026-08-17T05:00:00.000Z');
    assert.strictEqual(slots[2].localDisplay, '11:00 - 12:00');
  });

  it('2. excludes inactive rules and non-matching weekdays', () => {
    // Friday 2026-08-21 (Friday rule is isActive = false)
    const evalNow = new Date('2026-08-21T00:00:00.000Z');
    const rangeFrom = new Date('2026-08-21T00:00:00.000Z');
    const rangeTo = new Date('2026-08-21T23:59:59.000Z');

    const slots = generateCandidateSlots({
      organizationTimezone: 'Asia/Jakarta',
      evaluationNow: evalNow,
      rangeFrom,
      rangeTo,
      serviceDurationMinutes: 60,
      weeklyRules,
      existingBusyIntervals: [],
      bufferMinutes: 30,
    });

    assert.strictEqual(slots.length, 0, 'Inactive Friday rule must yield 0 slots');
  });

  it('3. respects slot cadence and candidate duration boundaries', () => {
    // 45 minute service in 2-hour window (09:00 - 11:00) with 45m cadence
    const rules: SlotAvailabilityRule[] = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isActive: true },
    ];
    const evalNow = new Date('2026-08-17T00:00:00.000Z');
    const rangeFrom = new Date('2026-08-17T00:00:00.000Z');
    const rangeTo = new Date('2026-08-17T17:00:00.000Z');

    const slots = generateCandidateSlots({
      organizationTimezone: 'Asia/Jakarta',
      evaluationNow: evalNow,
      rangeFrom,
      rangeTo,
      serviceDurationMinutes: 45,
      weeklyRules: rules,
      existingBusyIntervals: [],
      bufferMinutes: 30,
    });

    // 09:00 - 09:45 (fits)
    // 09:45 - 10:30 (fits)
    // 10:30 - 11:15 (exceeds 11:00 window -> excluded)
    assert.strictEqual(slots.length, 2);
    assert.strictEqual(slots[0].localDisplay, '09:00 - 09:45');
    assert.strictEqual(slots[1].localDisplay, '09:45 - 10:30');
  });

  it('4. filters out candidate slots overlapping busy bookings while permitting back-to-back bookings', () => {
    const evalNow = new Date('2026-08-17T00:00:00.000Z');
    const rangeFrom = new Date('2026-08-17T00:00:00.000Z');
    const rangeTo = new Date('2026-08-17T17:00:00.000Z');

    // Existing booking at 10:00 - 11:00 WIB (03:00 - 04:00 UTC)
    const busyIntervals = [
      {
        startAt: new Date('2026-08-17T03:00:00.000Z'),
        endAt: new Date('2026-08-17T04:00:00.000Z'),
      },
    ];

    const slots = generateCandidateSlots({
      organizationTimezone: 'Asia/Jakarta',
      evaluationNow: evalNow,
      rangeFrom,
      rangeTo,
      serviceDurationMinutes: 60,
      weeklyRules,
      existingBusyIntervals: busyIntervals,
      bufferMinutes: 30,
    });

    // 09:00 - 10:00 (available - back to back with busy start)
    // 10:00 - 11:00 (excluded - exact overlap)
    // 11:00 - 12:00 (available - back to back with busy end)
    assert.strictEqual(slots.length, 2);
    assert.strictEqual(slots[0].localDisplay, '09:00 - 10:00');
    assert.strictEqual(slots[1].localDisplay, '11:00 - 12:00');
  });

  it('5. enforces notice buffer time relative to evaluationNow', () => {
    // Current evaluation is Monday 09:15 WIB (02:15 UTC) with 30m buffer
    // Earliest allowed start is 09:45 WIB
    const evalNow = new Date('2026-08-17T02:15:00.000Z');
    const rangeFrom = new Date('2026-08-17T00:00:00.000Z');
    const rangeTo = new Date('2026-08-17T17:00:00.000Z');

    const slots = generateCandidateSlots({
      organizationTimezone: 'Asia/Jakarta',
      evaluationNow: evalNow,
      rangeFrom,
      rangeTo,
      serviceDurationMinutes: 60,
      weeklyRules,
      existingBusyIntervals: [],
      bufferMinutes: 30,
    });

    // 09:00 - 10:00 starts before 09:45 -> excluded
    // 10:00 - 11:00 starts at 10:00 >= 09:45 -> available
    // 11:00 - 12:00 starts at 11:00 >= 09:45 -> available
    assert.strictEqual(slots.length, 2);
    assert.strictEqual(slots[0].localDisplay, '10:00 - 11:00');
    assert.strictEqual(slots[1].localDisplay, '11:00 - 12:00');
  });

  it('6. works accurately across DST-capable timezone (e.g. America/New_York)', () => {
    // New York in Summer (EDT = UTC-4)
    const nyRules: SlotAvailabilityRule[] = [
      { dayOfWeek: 1, startTime: '10:00', endTime: '12:00', isActive: true }, // Monday
    ];
    const evalNow = new Date('2026-08-17T00:00:00.000Z');
    const rangeFrom = new Date('2026-08-17T00:00:00.000Z');
    const rangeTo = new Date('2026-08-17T23:59:59.000Z');

    const slots = generateCandidateSlots({
      organizationTimezone: 'America/New_York',
      evaluationNow: evalNow,
      rangeFrom,
      rangeTo,
      serviceDurationMinutes: 60,
      weeklyRules: nyRules,
      existingBusyIntervals: [],
      bufferMinutes: 30,
    });

    // Monday 10:00 EDT = 14:00 UTC
    // Monday 11:00 EDT = 15:00 UTC
    assert.strictEqual(slots.length, 2);
    assert.strictEqual(slots[0].startAt, '2026-08-17T14:00:00.000Z');
    assert.strictEqual(slots[0].endAt, '2026-08-17T15:00:00.000Z');
    assert.strictEqual(slots[0].localDisplay, '10:00 - 11:00');
  });

  it('7. deriveBusyIntervals: includes PENDING, CONFIRMED, COMPLETED and excludes CANCELLED, NO_SHOW', () => {
    const rawBookings = [
      { startAt: '2026-08-17T02:00:00Z', endAt: '2026-08-17T03:00:00Z', status: 'PENDING' },
      { startAt: '2026-08-17T03:00:00Z', endAt: '2026-08-17T04:00:00Z', status: 'CONFIRMED' },
      { startAt: '2026-08-17T04:00:00Z', endAt: '2026-08-17T05:00:00Z', status: 'COMPLETED' },
      { startAt: '2026-08-17T05:00:00Z', endAt: '2026-08-17T06:00:00Z', status: 'CANCELLED' },
      { startAt: '2026-08-17T06:00:00Z', endAt: '2026-08-17T07:00:00Z', status: 'NO_SHOW' },
      { startAt: '2026-08-17T07:00:00Z', endAt: null, status: 'CONFIRMED', serviceDurationMinutes: 45 },
    ];

    const busy = deriveBusyIntervals(rawBookings, 60);

    // 4 active busy intervals (PENDING, CONFIRMED, COMPLETED, null-end CONFIRMED)
    assert.strictEqual(busy.length, 4);
    assert.strictEqual(busy[0].startAt.toISOString(), '2026-08-17T02:00:00.000Z');
    assert.strictEqual(busy[0].endAt.toISOString(), '2026-08-17T03:00:00.000Z');

    // Null endAt properly derived from serviceDurationMinutes (45m)
    assert.strictEqual(busy[3].startAt.toISOString(), '2026-08-17T07:00:00.000Z');
    assert.strictEqual(busy[3].endAt.toISOString(), '2026-08-17T07:45:00.000Z');
  });
});
