'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { BrandKicker, EmptyState, ErrorState, LoadingRows } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { bookingQueries, contactQueries, clock } from '@/lib/container';
import { FlowBooking } from '@promotor/promotor-flow-fixtures';
import { CalendarButtons } from '@/components/calendar/CalendarButtons';
import { getSession } from '@/lib/auth';

type AgendaItem = { booking: FlowBooking; contactName: string };

function dayKey(iso: string): string {
  return clock.formatDayDate(iso);
}

function shortDow(label: string): string {
  return (label.split(',')[0] || '').slice(0, 3);
}

const MONTH_SHORT: Record<string, string> = {
  Januari: 'Jan',
  Februari: 'Feb',
  Maret: 'Mar',
  April: 'Apr',
  Mei: 'Mei',
  Juni: 'Jun',
  Juli: 'Jul',
  Agustus: 'Agu',
  September: 'Sep',
  Oktober: 'Okt',
  November: 'Nov',
  Desember: 'Des',
};

function shortDayNum(label: string): string {
  const datePart = (label.split(',')[1] ?? '').trim();
  return (datePart.split(' ')[0] ?? '').trim();
}

function shortMonth(label: string): string {
  const datePart = (label.split(',')[1] ?? '').trim();
  const monthFull = (datePart.split(' ')[1] ?? '').trim();
  return MONTH_SHORT[monthFull] ?? monthFull.slice(0, 3);
}

export default function CalendarPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<AgendaItem[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string>('anda');

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await bookingQueries.getCalendarAgenda();
      const items = await Promise.all(
        list.map(async (bk) => {
          const c = await contactQueries.getContactDetail(bk.contactId);
          return { booking: bk, contactName: c ? c.name : 'Kontak' };
        })
      );
      setBookings(items);
      try {
        const sess = await getSession();
        if (sess?.organization?.slug) setBookingSlug(sess.organization.slug);
      } catch {
        /* keep default */
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat agenda.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const days = bookings
    ? Array.from(new Set(bookings.map(({ booking }) => dayKey(booking.startAt)))).sort()
    : [];

  const visible = bookings
    ? (selectedDay ? bookings.filter(({ booking }) => dayKey(booking.startAt) === selectedDay) : bookings)
    : [];

  return (
    <AppShell showBottomNav={true}>
      <div className="hv-page">
        <div className="hv-topnav">
          <div>
            <BrandKicker />
            <h1 className="hv-page-title">14-Day Calendar</h1>
            <div className="hv-page-sub">Agenda layanan & booking STIFIn</div>
          </div>
        </div>

        <div className="hv-column">
          {loadError && <ErrorState title="Gagal memuat agenda" detail={loadError} onRetry={() => loadData()} />}

          {!bookings && !loadError && <LoadingRows rows={4} />}

          {bookings && days.length > 0 && (
            <div className="hv-day-strip" role="group" aria-label="Pilih hari">
              {days.map((day) => {
                const isSelected = selectedDay === day;
                const count = bookings.filter(({ booking }) => dayKey(booking.startAt) === day).length;
                return (
                  <button
                    key={day}
                    type="button"
                    className={`hv-day${isSelected ? ' is-selected' : ''}${count > 0 ? ' has-events' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                  >
                    <span className="hv-dow">{shortDow(day)}</span>
                    <span className="hv-num">{shortDayNum(day)}</span>
                    <span className="hv-month">{shortMonth(day)}</span>
                    <span className="hv-dot" />
                  </button>
                );
              })}
            </div>
          )}

          {bookings && visible.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--hv-muted)' }}>
                {visible.length} booking{selectedDay ? ` · ${selectedDay}` : ' · 14 hari ke depan'}
              </div>
              {visible.map(({ booking, contactName }) => (
                <article key={booking.id} className="hv-card" style={{ padding: 12 }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/app/contacts/${booking.contactId}`)}
                    style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
                    aria-label={`Buka ${contactName}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 750, fontSize: 14, color: 'var(--hv-text)' }}>
                        {clock.formatTime(booking.startAt)} · {contactName}
                      </div>
                      <span className={`hv-tone-badge ${booking.paymentStatus === 'PAID' ? 'hv-tone-badge-retensi' : 'hv-tone-badge-urgent'}`}>
                        {booking.paymentStatus === 'PAID' ? 'Lunas' : 'DP belum dibayar'}
                      </span>
                    </div>
                    <div className="hv-contact-card-meta" style={{ marginTop: 4 }}>
                      {booking.serviceTitle} · {booking.locationType === 'HOME_VISIT' ? 'Home Visit' : booking.locationType === 'ONLINE' ? 'Online' : 'On Site'}
                    </div>
                  </button>
                  <div style={{ marginTop: 8 }}>
                    <CalendarButtons
                      event={{
                        title: `${booking.serviceTitle} — ${contactName}`,
                        startAt: booking.startAt,
                        endAt: booking.endAt,
                        details: 'Jadwal dari Ralivo Flow',
                        location: (booking as any).locationText ?? booking.locationAddress ?? undefined,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {bookings && visible.length === 0 && !loadError && (
            <EmptyState
              title="Belum ada agenda booking"
              explanation="Booking dibuat dari halaman kontak atau pendaftaran publik."
            />
          )}

          {bookings && (
            <div className="hv-card" style={{ padding: 12, marginTop: 4 }}>
              <div style={{ fontWeight: 750, fontSize: 13, color: 'var(--hv-text)' }}>Link booking publik</div>
              <div className="hv-contact-card-meta">Bagikan ke prospek agar mereka booking mandiri.</div>
              <div className="hv-message-box" style={{ marginTop: 8, fontSize: 12 }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/p/${bookingSlug}/book` : `/p/${bookingSlug}/book`}
              </div>
              <div className="hv-actions-row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="hv-btn-sec"
                  onClick={async () => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/p/${bookingSlug}/book` : `/p/${bookingSlug}/book`;
                    try {
                      await navigator.clipboard?.writeText(url);
                      showToast('Tautan booking berhasil disalin!', 'success');
                    } catch {
                      showToast('Tautan booking siap dibagikan', 'info');
                    }
                  }}
                >
                  Salin link
                </button>
              </div>
            </div>
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </AppShell>
  );
}
