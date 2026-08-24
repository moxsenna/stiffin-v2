'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { bookingQueries, contactQueries, clock } from '@/lib/container';
import { FlowBooking } from '@promotor/promotor-flow-fixtures';

type AgendaItem = { booking: FlowBooking; contactName: string };

function dayKey(iso: string): string {
  return clock.formatDayDate(iso);
}

export default function CalendarPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<AgendaItem[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () =>{
    setLoadError(null);
    try {
      const list = await bookingQueries.getCalendarAgenda();
      const items = await Promise.all(
        list.map(async (bk) =>{
          const c = await contactQueries.getContactDetail(bk.contactId);
          return { booking: bk, contactName: c ? c.name : 'Kontak' };
        })
      );
      setBookings(items);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat agenda.');
    }
  }, []);

  useEffect(() =>{
    loadData();
  }, [loadData]);

  const days = bookings
    ? Array.from(new Set(bookings.map(({ booking }) =>dayKey(booking.startAt)))).sort()
    : [];

  const visible = bookings
    ? (selectedDay ? bookings.filter(({ booking }) =>dayKey(booking.startAt) === selectedDay) : bookings)
    : [];

  return (
    <AppShell showBottomNav={true}>
     <PageHeader kicker="Agenda" title="Kalender" sub="Agenda layanan & booking STIFIn" />

     {loadError && <ErrorState title="Gagal memuat agenda" detail={loadError} onRetry={() =>loadData()} />}

      {!bookings && !loadError && <LoadingRows rows={4} />}

      {bookings && days.length >0 && (
        <div className="week-strip">
         {days.map((day) =>{
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                className={`week-day${isSelected ? ' is-selected' : ''}`}
                onClick={() =>setSelectedDay(isSelected ? null : day)}
              >
               <div className="dow">{day.split(',')[0]}</div>
               <div className="num" style={{ fontSize: 11, letterSpacing: 0 }}>{day.split(',')[1]?.trim() ?? ''}</div>
               <div className="dot" />
             </button>
           );
          })}
        </div>
     )}

      {bookings && visible.length >0 && (
        <>
         <SectionHead label="Booking" count={`${visible.length}`} />
         {visible.map(({ booking, contactName }) =>(
            <button
              key={booking.id}
              type="button"
              className="agenda-row"
              onClick={() =>router.push(`/app/contacts/${booking.contactId}`)}
            >
             <div className="agenda-time">{clock.formatTime(booking.startAt)}</div>
             <div className="agenda-body">
               <div style={{ font: '700 14px/1.2 var(--font-sans)' }}>{contactName}</div>
               <div className="row-meta" style={{ marginTop: 5 }}>
                 {booking.serviceTitle} · {booking.locationType === 'HOME_VISIT' ? 'Home Visit' : 'On Site'}
                </div>
               <div style={{ marginTop: 8 }}>
                 <span className={`tag ${booking.paymentStatus === 'PAID' ? 'tag-neutral' : 'tag-accent'}`}>
                   {booking.paymentStatus === 'PAID' ? 'Lunas (PAID)' : 'DP belum dibayar'}
                  </span>
               </div>
             </div>
           </button>
         ))}
        </>
     )}

      {bookings && visible.length === 0 && !loadError && (
        <EmptyState
          title="Belum ada agenda booking"
          explanation="Booking dibuat dari halaman kontak atau pendaftaran publik."
        />
     )}
      <div style={{ height: 24 }} />
   </AppShell>
 );
}
