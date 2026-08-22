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
      <div style={{ padding: '20px 16px 0' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
          Kalender Agenda
        </h1>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '2px', marginBottom: '16px' }}>
          Jadwal sesi tes biometrik & konsultasi STIFIn
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {bookings.length > 0 ? (
          bookings.map(({ booking, contactName }) => (
            <div
              key={booking.id}
              onClick={() => router.push(`/app/contacts/${booking.contactId}`)}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-divider)',
                padding: '16px',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'transform var(--duration-fast) var(--ease-spring)',
              }}
            >
              {/* Date Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '58px',
                  padding: '10px 6px',
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-divider)',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 780, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                  {clock.formatDayDate(booking.startAt).split(',')[0]}
                </span>
                <span className="tabular-nums" style={{ fontSize: '16px', fontWeight: 850, color: 'var(--color-primary)', marginTop: '2px' }}>
                  {clock.formatTime(booking.startAt)}
                </span>
              </div>

              {/* Booking Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  {booking.serviceTitle}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Klien: <strong style={{ color: 'var(--color-text-primary)' }}>{contactName}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 780,
                      color: booking.paymentStatus === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)',
                      backgroundColor: booking.paymentStatus === 'PAID' ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {booking.paymentStatus === 'PAID' ? 'Lunas (PAID)' : 'DP Belum Bayar'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    · {booking.locationType === 'HOME_VISIT' ? 'Home Visit' : 'On Site'}
                  </span>
                </div>
              </div>

              <ChevronRightIcon size={16} color="var(--color-text-tertiary)" />
            </div>
          ))
        ) : (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              color: 'var(--color-text-secondary)',
              fontSize: '13.5px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            Belum ada agenda konsultasi terjadwal.
          </div>
        )}
      </div>
    </AppShell>
  );
}
