'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { formatPhoneDisplay } from '@promotor/platform-core';
import { CheckIcon, ClockIcon } from '@/components/foundation/icons';

interface AvailableSlot {
  startAt: string;
  endAt: string;
  localDate: string;
  localDisplay: string;
}

interface PublicService {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  priceAmount: number;
  description?: string;
}

interface BookingSuccessData {
  bookingId: string;
  status: string;
  startAt: string;
  endAt: string;
  serviceTitle: string;
  amount: number;
}

export default function PublicBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || '';
  const initialServiceId = searchParams.get('serviceId') || '';

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [service, setService] = useState<PublicService | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [locationType, setLocationType] = useState<'ONLINE' | 'ON_SITE' | 'HOME_VISIT'>('ONLINE');

  // Feedback State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slotUnavailableNotice, setSlotUnavailableNotice] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessData | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  // Fetch Available Slots
  const fetchSlots = useCallback(async (serviceId: string) => {
    if (!slug || !serviceId) return;
    setLoadingSlots(true);
    setErrorMessage(null);
    setSlotUnavailableNotice(null);

    try {
      const now = new Date();
      const from = now.toISOString();
      const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(
        `${baseUrl}/api/v1/public/${encodeURIComponent(slug)}/slots?serviceId=${encodeURIComponent(
          serviceId
        )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Gagal memuat slot konsultasi');
      }

      const data = await res.json();
      setService(data.service);
      setSlots(data.slots || []);
      setSelectedSlot((prev) => {
        if (prev && !data.slots.some((s: AvailableSlot) => s.startAt === prev.startAt)) {
          return null;
        }
        return prev;
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memuat jadwal');
    } finally {
      setLoadingSlots(false);
    }
  }, [baseUrl, slug]);

  useEffect(() => {
    if (initialServiceId) {
      fetchSlots(initialServiceId);
    }
  }, [initialServiceId, fetchSlots]);

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setSlotUnavailableNotice(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMessage('Silakan pilih slot waktu terlebih dahulu.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }
    if (!phoneRaw.trim()) {
      setErrorMessage('Nomor WhatsApp wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSlotUnavailableNotice(null);

    try {
      const res = await fetch(`${baseUrl}/api/v1/public/${encodeURIComponent(slug)}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service?.id || initialServiceId,
          startAt: selectedSlot.startAt,
          name: name.trim(),
          phoneRaw: phoneRaw.trim(),
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
          locationType,
        }),
      });

      if (res.status === 409) {
        setSlotUnavailableNotice(
          'Slot waktu ini baru saja dipesan oleh orang lain. Silakan pilih slot lain yang masih tersedia di bawah.'
        );
        setSelectedSlot(null);
        await fetchSlots(service?.id || initialServiceId);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Gagal mengirim pendaftaran booking');
      }

      const created = await res.json();
      setBookingSuccess(created);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan pada server');
    } finally {
      setSubmitting(false);
    }
  };

  // Group slots by local date
  const slotsByDate: Record<string, AvailableSlot[]> = {};
  for (const s of slots) {
    if (!slotsByDate[s.localDate]) {
      slotsByDate[s.localDate] = [];
    }
    slotsByDate[s.localDate].push(s);
  }

  if (bookingSuccess) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', padding: '40px 16px', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-divider)',
            padding: '36px 24px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: 'var(--color-success-soft)',
                border: '1px solid var(--color-success-border)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--color-success)',
              }}
            >
              <CheckIcon size={30} color="var(--color-success)" />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
              Booking Berhasil Terkirim!
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              Terima kasih, <strong>{name}</strong>. Permintaan jadwal sesi konsultasi Anda telah kami catat.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              border: '1px solid var(--color-divider)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Layanan:</span>
              <span style={{ fontSize: '13.5px', fontWeight: 780, color: 'var(--color-text-primary)' }}>{bookingSuccess.serviceTitle}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Jadwal Waktu:</span>
              <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 780, color: 'var(--color-text-primary)' }}>
                {new Date(bookingSuccess.startAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Nomor WhatsApp:</span>
              <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 780, color: 'var(--color-text-primary)' }}>
                {formatPhoneDisplay(phoneRaw)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--color-border-strong)', paddingTop: '10px', marginTop: '2px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Estimasi Biaya:</span>
              <span className="tabular-nums" style={{ fontSize: '15px', fontWeight: 850, color: 'var(--color-primary)' }}>
                {bookingSuccess.amount > 0 ? `Rp ${bookingSuccess.amount.toLocaleString('id-ID')}` : 'Gratis'}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-primary-border)',
              fontSize: '13px',
              color: 'var(--color-primary-hover)',
              lineHeight: 1.5,
            }}
          >
            <strong>Langkah Selanjutnya:</strong> Promotor kami akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi persiapan sesi dan lokasi.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-divider)',
          padding: '28px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '18px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
            Jadwal Konsultasi STIFIn
          </h1>
          {service ? (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--color-primary)' }}>
                {service.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Durasi: {service.durationMinutes} Menit · Biaya:{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {service.priceAmount > 0 ? `Rp ${service.priceAmount.toLocaleString('id-ID')}` : 'Gratis'}
                </strong>
              </div>
              {service.description && (
                <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                  {service.description}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Pilih slot waktu dan isi data kontak Anda untuk menjadwalkan sesi konsultasi.
            </p>
          )}
        </div>

        {slotUnavailableNotice && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-danger-soft)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '13.5px',
              marginBottom: '16px',
              fontWeight: 600,
            }}
          >
            {slotUnavailableNotice}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-danger-soft)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '13.5px',
              marginBottom: '16px',
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Step 1: Slot Selection */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
              1. Pilih Jadwal Waktu Konsultasi
            </div>

            {loadingSlots ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13.5px' }}>
                Memuat slot ketersediaan...
              </div>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-canvas)',
                  border: '1px solid var(--color-divider)',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13.5px',
                }}
              >
                Belum ada slot waktu yang tersedia dalam 14 hari ke depan. Silakan hubungi promotor langsung.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {Object.entries(slotsByDate).map(([dateStr, dateSlots]) => (
                  <div key={dateStr}>
                    <div style={{ fontSize: '12.5px', fontWeight: 780, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      {new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                      {dateSlots.map((slot) => {
                        const isSelected = selectedSlot?.startAt === slot.startAt;
                        return (
                          <button
                            type="button"
                            key={slot.startAt}
                            onClick={() => handleSlotSelect(slot)}
                            className="touch-target"
                            style={{
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border-strong)',
                              backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                              color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                              fontSize: '13px',
                              fontWeight: isSelected ? 780 : 550,
                              textAlign: 'center',
                              transition: 'all var(--duration-fast) ease',
                            }}
                          >
                            {slot.localDisplay}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Contact Details */}
          <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '14px' }}>
              2. Informasi Kontak Peserta
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-strong)',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-canvas)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Nomor WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneRaw}
                  onChange={(e) => setPhoneRaw(e.target.value)}
                  placeholder="0812 3456 7890"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-strong)',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-canvas)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@example.com"
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-strong)',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-canvas)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Tipe Sesi Konsultasi
                </label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as any)}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-strong)',
                    fontSize: '14px',
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-canvas)',
                    outline: 'none',
                  }}
                >
                  <option value="ONLINE">Online (Zoom / Google Meet)</option>
                  <option value="ON_SITE">On-Site (Kantor / Tempat Promotor)</option>
                  <option value="HOME_VISIT">Home Visit (Kunjungan ke Rumah)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  Catatan / Harapan Sesi (Opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Ingin konsultasi tes minat bakat untuk anak usia 10 tahun..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-strong)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    color: 'var(--color-text-primary)',
                    backgroundColor: 'var(--color-canvas)',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="touch-target-primary"
            style={{
              width: '100%',
              backgroundColor: submitting || !selectedSlot ? 'var(--color-border-strong)' : 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontSize: '15px',
              fontWeight: 780,
              cursor: submitting || !selectedSlot ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-sm)',
              marginTop: '8px',
            }}
          >
            {submitting
              ? 'Memproses Booking...'
              : selectedSlot
              ? `Konfirmasi Booking (${selectedSlot.localDisplay}) →`
              : 'Pilih Slot Waktu Terlebih Dahulu'}
          </button>
        </form>
      </div>
    </div>
  );
}
