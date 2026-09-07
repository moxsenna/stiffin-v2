import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleCalendarUrl, buildIcsContent } from '../index.js';

const ev = {
  title: 'Sesi Konsultasi STIFIn — Ayu',
  startAt: '2026-09-10T02:00:00.000Z', // 09:00 WIB
  endAt: '2026-09-10T03:00:00.000Z',
  details: 'Dibuat otomatis dari Ralivo Flow',
  location: 'Online via Zoom',
};

describe('calendar utils', () => {
  it('google url memuat template, dates UTC, dan title ter-encode', () => {
    const url = buildGoogleCalendarUrl(ev);
    assert.ok(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
    assert.ok(url.includes('dates=20260910T020000Z%2F20260910T030000Z') || url.includes('dates=20260910T020000Z/20260910T030000Z'));
    assert.ok(decodeURIComponent(url).includes('Sesi Konsultasi STIFIn — Ayu'));
  });

  it('ics berisi VCALENDAR, UTC timestamps, dan escape koma', () => {
    const ics = buildIcsContent({ ...ev, location: 'Jakarta, Indonesia' });
    assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('BEGIN:VEVENT'));
    assert.ok(ics.includes('DTSTART:20260910T020000Z'));
    assert.ok(ics.includes('DTEND:20260910T030000Z'));
    assert.ok(ics.includes('LOCATION:Jakarta\\, Indonesia'));
    assert.ok(ics.endsWith('END:VCALENDAR'));
  });

  it('durasi default 60 menit bila endAt kosong', () => {
    const ics = buildIcsContent({ title: 'T', startAt: '2026-09-10T02:00:00.000Z', endAt: null });
    assert.ok(ics.includes('DTEND:20260910T030000Z'));
  });
});
