'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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

  const [name, setName] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [locationType, setLocationType] = useState<'ONLINE' | 'ON_SITE' | 'HOME_VISIT'>('ONLINE');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slotUnavailableNotice, setSlotUnavailableNotice] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessData | null>(null);

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://stiffin-promotor-api.moxsenna.workers.dev'
      : 'http://localhost:8787');

  const fetchSlots = useCallback(async (serviceId: string) =>{
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
        const errorData = await res.json().catch(() =>({}));
        throw new Error(errorData.error?.message || 'Gagal memuat slot konsultasi');
      }

      const data = await res.json();
      setService(data.service);
      setSlots(data.slots || []);
      setSelectedSlot((prev) =>{
        if (prev && !data.slots.some((s: AvailableSlot) =>s.startAt === prev.startAt)) {
          return null;
        }
        return prev;
      });
    } catch (err: any) {
      if (process.env.NEXT_PUBLIC_API_MODE !== 'http') {
        setService({
          id: 'srv_tes_personal',
          name: 'Tes STIFIn Personal & Konsultasi',
          category: 'ASSESSMENT',
          durationMinutes: 60,
          priceAmount: 500000,
          description: 'Sesi tes biometrik sidik jari dan penjelasan Mesin Kecerdasan secara mendalam 1-on-1.',
        });
        setSlots([
          {
            localDate: '2026-08-15',
            localDisplay: '10:00 - 11:00 WIB',
            startAt: '2026-08-15T10:00:00.000Z',
            endAt: '2026-08-15T11:00:00.000Z',
          },
          {
            localDate: '2026-08-15',
            localDisplay: '14:00 - 15:00 WIB',
            startAt: '2026-08-15T14:00:00.000Z',
            endAt: '2026-08-15T15:00:00.000Z',
          },
          {
            localDate: '2026-08-16',
            localDisplay: '09:30 - 10:30 WIB',
            startAt: '2026-08-16T09:30:00.000Z',
            endAt: '2026-08-16T10:30:00.000Z',
          },
          {
            localDate: '2026-08-16',
            localDisplay: '13:30 - 14:30 WIB',
            startAt: '2026-08-16T13:30:00.000Z',
            endAt: '2026-08-16T14:30:00.000Z',
          },
        ]);
        return;
      }
      setErrorMessage(err.message || 'Terjadi kesalahan saat memuat jadwal');
    } finally {
      setLoadingSlots(false);
    }
  }, [baseUrl, slug]);

  useEffect(() => {
    if (initialServiceId) {
      fetchSlots(initialServiceId);
    } else if (process.env.NEXT_PUBLIC_API_MODE !== 'http') {
      fetchSlots('srv_tes_personal');
    }
  }, [initialServiceId, fetchSlots]);

  const handleSlotSelect = (slot: AvailableSlot) =>{
    setSelectedSlot(slot);
    setSlotUnavailableNotice(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) =>{
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
        const errorData = await res.json().catch(() =>({}));
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

  const slotsByDate: Record<string, AvailableSlot[]>= {};
  for (const s of slots) {
    if (!slotsByDate[s.localDate]) {
      slotsByDate[s.localDate] = [];
    }
    slotsByDate[s.localDate].push(s);
  }

  if (bookingSuccess) {
    return (
      <div className="hv-page" style={{ paddingBottom: 32 }}>
        <div className="hv-column" style={{ maxWidth: 560, paddingTop: 32 }}>
          <div className="hv-card">
            <div className="hv-kicker-row">
              <span className="hv-kicker">
                <Image
                  src="/icons/pwa-192.png"
                  alt="Ralivo"
                  width={14}
                  height={14}
                  style={{ borderRadius: '3px', display: 'inline-block', flexShrink: 0 }}
                />
                Ralivo Flow Booking
              </span>
              <span className="hv-tone-badge hv-tone-badge-retensi">Berhasil</span>
            </div>
            <h1 className="hv-page-title">Booking Berhasil Terkirim!</h1>
            <p className="hv-page-sub" style={{ marginTop: 4 }}>
              Terima kasih, {name}. Permintaan konsultasi Anda telah kami terima.
            </p>

       <div style={{ marginTop: 20, borderTop: 'var(--sep-strong)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
           <span style={{ font: '500 13px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>Layanan</span>
           <span style={{ font: '600 13px/1.4 var(--font-sans)' }}>{bookingSuccess.serviceTitle}</span>
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
           <span style={{ font: '500 13px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>Waktu</span>
           <span style={{ font: '600 13px/1.4 var(--font-sans)', textAlign: 'right' }}>
             {new Date(bookingSuccess.startAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
            </span>
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
           <span style={{ font: '500 13px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>Nomor WhatsApp</span>
           <span style={{ font: '600 13px/1.4 var(--font-sans)' }}>{formatPhoneDisplay(phoneRaw)}</span>
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '2px solid var(--ink)' }}>
           <span style={{ font: '500 13px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>Estimasi biaya</span>
           <span style={{ font: '700 15px/1.3 var(--font-sans)' }}>
             {bookingSuccess.amount >0 ? `Rp ${bookingSuccess.amount.toLocaleString('id-ID')}` : 'Gratis'}
            </span>
         </div>
       </div>

       <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--hv-muted)' }}>
         <strong>Langkah selanjutnya:</strong> promotor akan menghubungi nomor WhatsApp Anda untuk konfirmasi jadwal dan instruksi pembayaran jika berlaku.
        </p>
          </div>
        </div>
      </div>
   );
  }

  return (
    <div className="hv-page" style={{ paddingBottom: 32 }}>
      <div className="hv-column" style={{ maxWidth: 640, paddingTop: 24 }}>
        <div className="hv-kicker-row">
          <span className="hv-kicker">
            <Image
              src="/icons/pwa-192.png"
              alt="Ralivo"
              width={14}
              height={14}
              style={{ borderRadius: '3px', display: 'inline-block', flexShrink: 0 }}
            />
            Ralivo Flow Booking
          </span>
          <span className="hv-stifin-badge">STIFIn OS</span>
        </div>
        <h1 className="hv-page-title">Jadwal Konsultasi STIFIn</h1>
        <div className="hv-card">
       {service ? (
          <div>
            <div style={{ fontWeight: 750, fontSize: 15, color: 'var(--hv-text)' }}>{service.name}</div>
            <div className="hv-contact-card-meta">
             Durasi {service.durationMinutes} menit · {service.priceAmount > 0 ? `Rp ${service.priceAmount.toLocaleString('id-ID')}` : 'Gratis'}
            </div>
           {service.description && (
              <p style={{ fontSize: 12.5, color: 'var(--hv-muted)', marginTop: 8, lineHeight: 1.55 }}>{service.description}</p>
           )}
          </div>
       ) : (
          <p style={{ fontSize: 12.5, color: 'var(--hv-muted)', lineHeight: 1.55 }}>
           Pilih slot waktu dan isi data kontak Anda untuk menjadwalkan sesi konsultasi.
          </p>
       )}
        </div>

     <div className="hv-card">
       {slotUnavailableNotice && (
          <div role="alert" className="hv-message-box" style={{ borderColor: 'var(--hv-danger)', color: 'var(--hv-danger)' }}>
           {slotUnavailableNotice}
          </div>
       )}

        {errorMessage && (
          <div role="alert" className="field-error">{errorMessage}</div>
       )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
         <section>
           <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--hv-muted)', marginBottom: 8 }}>1 · PILIH JADWAL (14 HARI)</div>

           {loadingSlots ? (
              <div className="hv-contact-card-meta" style={{ padding: 12 }}>Memuat slot ketersediaan...</div>
           ) : Object.keys(slotsByDate).length === 0 ? (
              <div className="hv-message-box">
               Belum ada slot waktu yang tersedia dalam 14 hari ke depan. Silakan hubungi promotor langsung.
              </div>
           ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 320, overflowY: 'auto' }}>
               {Object.entries(slotsByDate).map(([dateStr, dateSlots]) =>(
                  <div key={dateStr}>
                   <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hv-muted)', marginBottom: 6 }}>
                     {new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                   <div className="hv-slot-grid">
                     {dateSlots.map((slot) =>{
                        const isSelected = selectedSlot?.startAt === slot.startAt;
                        return (
                          <button
                            type="button"
                            key={slot.startAt}
                            onClick={() =>handleSlotSelect(slot)}
                            aria-pressed={isSelected}
                            className={`hv-slot${isSelected ? ' is-selected' : ''}`}
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
          </section>

         <section style={{ borderTop: '1px solid var(--hv-line)', paddingTop: 14 }}>
           <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--hv-muted)', marginBottom: 8 }}>2 · INFORMASI KONTAK</div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
             <div>
               <label htmlFor="pub-name" className="field-label">Nama lengkap *</label>
               <input id="pub-name" type="text" required className="hv-input" value={name} onChange={(e) =>setName(e.target.value)} placeholder="cth: Budi Santoso" />
             </div>

             <div>
               <label htmlFor="pub-phone" className="field-label">Nomor WhatsApp *</label>
               <input id="pub-phone" type="tel" required className="hv-input" value={phoneRaw} onChange={(e) =>setPhoneRaw(e.target.value)} placeholder="cth: 081234567890" />
             </div>

             <div>
               <label htmlFor="pub-email" className="field-label">Email (opsional)</label>
               <input id="pub-email" type="email" className="hv-input" value={email} onChange={(e) =>setEmail(e.target.value)} placeholder="cth: budi@example.com" />
             </div>

             <div>
               <label htmlFor="pub-loc" className="field-label">Tipe sesi konsultasi</label>
               <select id="pub-loc" className="hv-select" value={locationType} onChange={(e) =>setLocationType(e.target.value as 'ONLINE' | 'ON_SITE' | 'HOME_VISIT')}>
                 <option value="ONLINE">Online (Zoom / Google Meet)</option>
                 <option value="ON_SITE">On-Site (Kantor / Tempat Promotor)</option>
                 <option value="HOME_VISIT">Home Visit (Kunjungan ke Rumah)</option>
               </select>
             </div>

             <div>
               <label htmlFor="pub-notes" className="field-label">Catatan / harapan sesi (opsional)</label>
               <textarea id="pub-notes" className="hv-textarea" rows={3} value={notes} onChange={(e) =>setNotes(e.target.value)} placeholder="cth: ingin konsultasi tes minat bakat untuk anak usia 10 tahun..." />
             </div>
           </div>
         </section>

         <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="hv-wa-btn"
          >
           {submitting ? 'Memproses Booking...' : selectedSlot ? `Konfirmasi Booking (${selectedSlot.localDisplay})` : 'Pilih Slot Waktu Terlebih Dahulu'}
          </button>
       </form>
     </div>
      </div>
    </div>
 );
}
