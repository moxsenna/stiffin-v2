'use client';

import React from 'react';
import { buildGoogleCalendarUrl, buildIcsContent, CalendarEvent } from '@promotor/platform-core';

export function CalendarButtons({ event }: { event: CalendarEvent }) {
  const downloadIcs = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const blob = new Blob([buildIcsContent(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ralivo-jadwal.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={(e) => {
          e.stopPropagation();
          window.open(buildGoogleCalendarUrl(event), '_blank');
        }}
      >
        + Google Calendar
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={downloadIcs}>
        Unduh .ics
      </button>
    </div>
  );
}
