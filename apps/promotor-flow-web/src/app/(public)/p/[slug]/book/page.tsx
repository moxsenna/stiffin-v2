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

  const [name, setName] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [locationType, setLocationType] = useState<'ONLINE' | 'ON_SITE' | 'HOME_VISIT'>('ONLINE');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slotUnavailableNotice, setSlotUnavailableNotice] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessData | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

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
      setErrorMessage(err.message || 'Terjadi kesalahan saat memuat jadwal');
    } finally {
      setLoadingSlots(false);
    }
  }, [baseUrl, slug]);

  useEffect(() =>{
    if (initialServiceId) {
      fetchSlots(initialServiceId);
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
      <div style={{ maxWidth: 540, margin: '40px auto', padding: 24, background: 'var(--surface)', border: 'var(--sep-strong)', fontFamily: 'var(--font-sans)' }}>
       <div className="kicker kicker-accent">Booking berhasil</div>
       <h1 style={{ font: '800 28px/1.1 var(--font-sans)', letterSpacing: '-0.03em', marginTop: 12 }}>
         Booking Berhasil Terkirim!
        </h1>
       <p style={{ fontSize: 14, color: 'var(--muted-strong)', marginTop: 8, lineHeight: 1.55 }}>
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

       <p className="muted-note" style={{ marginTop: 16 }}>
         <strong>Langkah selanjutnya:</strong>promotor akan menghubungi nomor WhatsApp Anda untuk konfirmasi jadwal dan instruksi pembayaran jika berlaku.
        </p>
     </div>
   );
  }

  return (
    <div style={{ maxWidth: 640, margin: '30px auto', padding: '0 18px', fontFamily: 'var(--font-sans)' }}>
     <header style={{ borderBottom: 'var(--sep-strong)', paddingBottom: 18 }}>
       <div className="kicker kicker-accent">Jadwal konsultasi</div>
       <h1 style={{ font: '800 26px/1.05 var(--font-sans)', letterSpacing: '-0.03em', marginTop: 8 }}>
         Jadwal Konsultasi STIFIn
        </h1>
       {service ? (
          <div style={{ marginTop: 10 }}>
           <div style={{ font: '700 16px/1.3 var(--font-sans)' }}>{service.name}</div>
           <div className="row-meta">
             Durasi {service.durationMinutes} menit · {service.priceAmount >0 ? `Rp ${service.priceAmount.toLocaleString('id-ID')}` : 'Gratis'}
            </div>
           {service.description && (
              <p style={{ fontSize: 13.5, color: 'var(--muted-strong)', marginTop: 8, lineHeight: 1.5 }}>{service.description}</p>
           )}
          </div>
       ) : (
          <p className="muted-note" style={{ marginTop: 8 }}>
           Pilih slot waktu dan isi data kontak Anda untuk menjadwalkan sesi konsultasi.
          </p>
       )}
      </header>

     <div style={{ background: 'var(--surface)', borderLeft: 'var(--sep-strong)', borderRight: 'var(--sep-strong)', borderBottom: 'var(--sep-strong)', padding: 22 }}>
       {slotUnavailableNotice && (
          <div role="alert" style={{ marginBottom: 16, border: '2px solid var(--accent-dark)', color: 'var(--accent-dark)', font: '600 13px/1.5 var(--font-sans)', padding: '10px 12px' }}>
           {slotUnavailableNotice}
          </div>
       )}

        {errorMessage && (
          <div role="alert" className="field-error" style={{ marginBottom: 16 }}>{errorMessage}</div>
       )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
         <section>
           <div className="field-label">1 · Pilih jadwal waktu konsultasi</div>

           {loadingSlots ? (
              <div style={{ padding: 20, font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted)' }}>Memuat slot ketersediaan...</div>
           ) : Object.keys(slotsByDate).length === 0 ? (
              <div style={{ padding: 16, background: 'var(--surface-muted)', border: '1px solid var(--line)', font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
               Belum ada slot waktu yang tersedia dalam 14 hari ke depan. Silakan hubungi promotor langsung.
              </div>
           ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 300, overflowY: 'auto' }}>
               {Object.entries(slotsByDate).map(([dateStr, dateSlots]) =>(
                  <div key={dateStr}>
                   <div style={{ font: '700 10px/1 var(--font-sans)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                     {new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                     {dateSlots.map((slot) =>{
                        const isSelected = selectedSlot?.startAt === slot.startAt;
                        return (
                          <button
                            type="button"
                            key={slot.startAt}
                            onClick={() =>handleSlotSelect(slot)}
                            aria-pressed={isSelected}
                            style={{
                              minHeight: 44,
                              padding: '10px',
                              border: isSelected ? '2px solid var(--ink)' : '1px solid var(--line)',
                              backgroundColor: isSelected ? 'var(--ink)' : 'var(--surface)',
                              color: isSelected ? 'var(--on-ink)' : 'var(--ink)',
                              font: `${isSelected ? 700 : 500} 13px/1.2 var(--font-sans)`,
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
          </section>

         <section style={{ borderTop: 'var(--sep-strong)', paddingTop: 18 }}>
           <div className="field-label">2 · Informasi kontak</div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
             <div>
               <label htmlFor="pub-name" className="field-label">Nama lengkap *</label>
               <input id="pub-name" type="text" required className="input" value={name} onChange={(e) =>setName(e.target.value)} placeholder="cth: Budi Santoso" />
             </div>

             <div>
               <label htmlFor="pub-phone" className="field-label">Nomor WhatsApp *</label>
               <input id="pub-phone" type="tel" required className="input" value={phoneRaw} onChange={(e) =>setPhoneRaw(e.target.value)} placeholder="cth: 081234567890" />
             </div>

             <div>
               <label htmlFor="pub-email" className="field-label">Email (opsional)</label>
               <input id="pub-email" type="email" className="input" value={email} onChange={(e) =>setEmail(e.target.value)} placeholder="cth: budi@example.com" />
             </div>

             <div>
               <label htmlFor="pub-loc" className="field-label">Tipe sesi konsultasi</label>
               <select id="pub-loc" className="select" value={locationType} onChange={(e) =>setLocationType(e.target.value as 'ONLINE' | 'ON_SITE' | 'HOME_VISIT')}>
                 <option value="ONLINE">Online (Zoom / Google Meet)</option>
                 <option value="ON_SITE">On-Site (Kantor / Tempat Promotor)</option>
                 <option value="HOME_VISIT">Home Visit (Kunjungan ke Rumah)</option>
               </select>
             </div>

             <div>
               <label htmlFor="pub-notes" className="field-label">Catatan / harapan sesi (opsional)</label>
               <textarea id="pub-notes" className="textarea" rows={3} value={notes} onChange={(e) =>setNotes(e.target.value)} placeholder="cth: ingin konsultasi tes minat bakat untuk anak usia 10 tahun..." />
             </div>
           </div>
         </section>

         <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="btn btn-accent btn-block"
          >
           {submitting ? 'Memproses Booking...' : selectedSlot ? `Konfirmasi Booking (${selectedSlot.localDisplay})` : 'Pilih Slot Waktu Terlebih Dahulu'}
          </button>
       </form>
     </div>
   </div>
 );
}
