'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ChevronRightIcon, CalendarIcon } from '@/components/foundation/icons';
import { bookingQueries, contactQueries, clock } from '@/lib/container';
import { FlowBooking } from '@promotor/promotor-flow-fixtures';

export default function CalendarPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Array<{ booking: FlowBooking; contactName: string }>>([]);

  const loadData = useCallback(async () => {
    const list = await bookingQueries.getCalendarAgenda();
    const items = await Promise.all(
      list.map(async (bk) => {
        const c = await contactQueries.getContactDetail(bk.contactId);
        return { booking: bk, contactName: c ? c.name : 'Kontak' };
      })
    );
    setBookings(items);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <AppShell showBottomNav={true}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
        <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Kalender</h1>
      </div>

      <div style={{ font: '450 13px/18px Inter, sans-serif', color: '#71706B', padding: '6px 16px 16px' }}>
        Agenda Layanan & Booking STIFIn
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3' }}>
        {bookings.length > 0 ? (
          bookings.map(({ booking, contactName }) => (
            <div
              key={booking.id}
              onClick={() => router.push(`/app/contacts/${booking.contactId}`)}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '14px 16px',
                borderBottom: '1px solid #E8E7E3',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '54px',
                  padding: '8px 4px',
                  backgroundColor: '#F7F7F5',
                  borderRadius: '8px',
                  border: '1px solid #E8E7E3',
                }}
              >
                <span style={{ font: '600 12px Inter, sans-serif', color: '#71706B', textTransform: 'uppercase' }}>
                  {clock.formatDayDate(booking.startAt).split(',')[0]}
                </span>
                <span style={{ font: '700 16px Inter, sans-serif', color: '#167A68' }}>
                  {clock.formatTime(booking.startAt)}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 15px Inter, sans-serif', color: '#191918' }}>{booking.serviceTitle}</div>
                <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>
                  Klien: <strong>{contactName}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                  <span
                    style={{
                      font: '500 12px Inter, sans-serif',
                      color: booking.paymentStatus === 'PAID' ? '#067647' : '#B54708',
                      backgroundColor: booking.paymentStatus === 'PAID' ? '#ECFDF3' : '#FFFAEB',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {booking.paymentStatus === 'PAID' ? 'Lunas (PAID)' : 'DP belum dibayar'}
                  </span>
                  <span style={{ font: '400 12px Inter, sans-serif', color: '#9C9A94' }}>
                    {booking.locationType === 'HOME_VISIT' ? 'Home Visit' : 'On Site'}
                  </span>
                </div>
              </div>

              <ChevronRightIcon size={16} color="#C6C4BE" />
            </div>
          ))
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#71706B' }}>Belum ada agenda booking.</div>
        )}
      </div>
    </AppShell>
  );
}
