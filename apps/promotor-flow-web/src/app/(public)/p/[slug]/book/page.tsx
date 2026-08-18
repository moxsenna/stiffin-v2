'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { formatPhoneDisplay } from '@promotor/platform-core';

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
      const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days out

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
      // If previous slot is no longer in list, deselect
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
        // Race recovery: slot is already booked
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
      <div style={{ maxWidth: '540px', margin: '40px auto', padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E7E3', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#ECFDF3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#027A48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#191918', margin: 0 }}>Booking Berhasil Terkirim!</h2>
          <p style={{ fontSize: '14px', color: '#71706B', marginTop: '6px' }}>
            Terima kasih, {name}. Permintaan konsultasi Anda telah kami terima.
          </p>
        </div>

        <div style={{ backgroundColor: '#FAFAF9', borderRadius: '8px', padding: '16px', border: '1px solid #E8E7E3', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#71706B' }}>Layanan:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#191918' }}>{bookingSuccess.serviceTitle}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#71706B' }}>Waktu:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#191918' }}>
              {new Date(bookingSuccess.startAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#71706B' }}>Nomor WhatsApp:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#191918' }}>{formatPhoneDisplay(phoneRaw)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #D5D3CE', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '13px', color: '#71706B' }}>Estimasi Biaya:</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#167A68' }}>
              {bookingSuccess.amount > 0 ? `Rp ${bookingSuccess.amount.toLocaleString('id-ID')}` : 'Gratis'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#F0FDF9', borderRadius: '8px', border: '1px solid #B2E5D9', fontSize: '13px', color: '#0E5C4E', lineHeight: '1.5' }}>
          <strong>Langkah Selanjutnya:</strong> Promotor kami akan segera menghubungi nomor WhatsApp Anda untuk konfirmasi jadwal dan instruksi pembayaran jika berlaku.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '30px auto', padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E7E3', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #E8E7E3', paddingBottom: '16px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#191918', margin: 0 }}>Jadwal Konsultasi STIFIn</h1>
        {service ? (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#167A68' }}>{service.name}</div>
            <div style={{ fontSize: '13px', color: '#71706B', marginTop: '2px' }}>
              Durasi: {service.durationMinutes} Menit • Biaya: {service.priceAmount > 0 ? `Rp ${service.priceAmount.toLocaleString('id-ID')}` : 'Gratis'}
            </div>
            {service.description && (
              <p style={{ fontSize: '13.5px', color: '#4E4D49', marginTop: '6px', lineHeight: '1.4' }}>{service.description}</p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '13.5px', color: '#71706B', marginTop: '4px' }}>
            Pilih slot waktu dan isi data kontak Anda untuk menjadwalkan sesi konsultasi.
          </p>
        )}
      </div>

      {slotUnavailableNotice && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', fontSize: '13.5px', marginBottom: '16px', fontWeight: 500 }}>
          {slotUnavailableNotice}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#FEF3F2', border: '1px solid #FECDCA', color: '#B42318', fontSize: '13.5px', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Step 1: Slot Selection */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#191918', marginBottom: '10px' }}>
            1. Pilih Jadwal Waktu Konsultasi
          </div>

          {loadingSlots ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#71706B', fontSize: '13.5px' }}>
              Memuat slot ketersediaan...
            </div>
          ) : Object.keys(slotsByDate).length === 0 ? (
            <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#FAFAF9', border: '1px solid #E8E7E3', textAlign: 'center', color: '#71706B', fontSize: '13.5px' }}>
              Belum ada slot waktu yang tersedia dalam 14 hari ke depan. Silakan hubungi promotor langsung.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {Object.entries(slotsByDate).map(([dateStr, dateSlots]) => (
                <div key={dateStr}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#71706B', marginBottom: '6px', textTransform: 'uppercase' }}>
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
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: isSelected ? '2px solid #167A68' : '1px solid #D5D3CE',
                            backgroundColor: isSelected ? '#EAF5F2' : '#FFFFFF',
                            color: isSelected ? '#167A68' : '#191918',
                            fontSize: '13px',
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer',
                            textAlign: 'center',
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
        <div style={{ borderTop: '1px solid #E8E7E3', paddingTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#191918', marginBottom: '12px' }}>
            2. Informasi Kontak
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#4E4D49', marginBottom: '4px' }}>
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth: Budi Santoso"
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #D5D3CE', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#4E4D49', marginBottom: '4px' }}>
                Nomor WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={phoneRaw}
                onChange={(e) => setPhoneRaw(e.target.value)}
                placeholder="cth: 081234567890"
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #D5D3CE', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#4E4D49', marginBottom: '4px' }}>
                Email (Opsional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cth: budi@example.com"
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #D5D3CE', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#4E4D49', marginBottom: '4px' }}>
                Tipe Sesi Konsultasi
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as any)}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #D5D3CE', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
              >
                <option value="ONLINE">Online (Zoom / Google Meet)</option>
                <option value="ON_SITE">On-Site (Kantor / Tempat Promotor)</option>
                <option value="HOME_VISIT">Home Visit (Kunjungan ke Rumah)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#4E4D49', marginBottom: '4px' }}>
                Catatan / Harapan Sesi (Opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="cth: Ingin konsultasi tes minat bakat untuk anak usia 10 tahun..."
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D5D3CE', fontSize: '13.5px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedSlot}
          style={{
            height: '46px',
            backgroundColor: submitting || !selectedSlot ? '#87BDB2' : '#167A68',
            color: '#FFFFFF',
            borderRadius: '8px',
            border: 'none',
            fontSize: '15px',
            fontWeight: 600,
            cursor: submitting || !selectedSlot ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {submitting ? 'Memproses Booking...' : selectedSlot ? `Konfirmasi Booking (${selectedSlot.localDisplay})` : 'Pilih Slot Waktu Terlebih Dahulu'}
        </button>
      </form>
    </div>
  );
}
