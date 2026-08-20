import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SystemClock } from '../adapters/system-clock';

describe('P0-4 — SystemClock Real Production Clock Invariants', () => {
  const clock = new SystemClock();

  it('1. now() returns real current Date object', () => {
    const before = Date.now();
    const d = clock.now();
    const after = Date.now();
    assert.ok(d instanceof Date);
    assert.ok(d.getTime() >= before && d.getTime() <= after);
  });

  it('2. nowIso() returns valid ISO-8601 string', () => {
    const iso = clock.nowIso();
    assert.strictEqual(typeof iso, 'string');
    assert.ok(!isNaN(Date.parse(iso)));
  });

  it('3. formatDayDate formats Indonesian day and month names correctly', () => {
    // 2026-08-20 is a Thursday (Kamis)
    const testDate = new Date('2026-08-20T10:00:00+07:00');
    const formatted = clock.formatDayDate(testDate);
    assert.strictEqual(formatted, 'Kamis, 20 Agustus');
  });

  it('4. formatTime formats HH:mm with zero padding', () => {
    const testDate = new Date(2026, 7, 20, 9, 5); // 09:05
    const formatted = clock.formatTime(testDate);
    assert.strictEqual(formatted, '09:05');
  });

  it('5. getDifferenceInDays calculates accurate day diff', () => {
    const d1 = new Date('2026-08-25T10:00:00Z');
    const d2 = new Date('2026-08-20T15:00:00Z');
    assert.strictEqual(clock.getDifferenceInDays(d1, d2), 5);
    assert.strictEqual(clock.getDifferenceInDays(d2, d1), -5);
  });

  it('6. addDays returns new Date with offset', () => {
    const base = new Date('2026-08-20T10:00:00Z');
    const plus7 = clock.addDays(base, 7);
    assert.strictEqual(plus7.getUTCDate(), 27);
  });
});
