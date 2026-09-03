'use client';

import React from 'react';
import { CheckIcon } from '../foundation/icons';

export const FrictionVsFlow: React.FC = () => {
  const comparisons = [
    {
      title: 'Tindak Lanjut Prospek Chat',
      friction: 'Chat WhatsApp menumpuk dan tenggelam. Promotor lupa siapa yang harus dihubungi kembali hari ini, hingga prospek dingin dan hilang.',
      flow: 'Antrean Hari Ini (Today Work Queue) menyusun prioritas tindakan harian. 1-tap langsung membuka WhatsApp dengan draf pesan terpersonalisasi.',
    },
    {
      title: 'Penjadwalan Sesi Konsultasi',
      friction: 'Bolak-balik tanya jadwal kosong via chat hingga 5-10 pesan ("Hari Sabtu bisa jam berapa ya kak?"), memakan waktu dan melelahkan.',
      flow: 'Bagikan 1 link booking publik instan. Klien memilih slot waktu 14-hari yang masih tersedia sesuai jam kerja yang Anda atur.',
    },
    {
      title: 'Hubungan Pasca Tes (Aftercare)',
      friction: 'Setelah tes STIFIn selesai, klien tidak pernah dihubungi lagi. Kehilangan potensi mentoring lanjutan, kelas edukasi, dan referral keluarga.',
      flow: 'Sistem otomatis menjadwalkan tindakan Aftercare D+7 setelah sesi tes selesai untuk evaluasi penerapan dan penawaran kelas lanjutan.',
    },
    {
      title: 'Pencatatan Data & Status Pipeline',
      friction: 'Catatan berserakan di buku tulis atau spreadsheet manual yang tidak pernah dibuka, tidak tahu siapa lead dengan minat tertinggi.',
      flow: 'Pusat Komando CRM 6-tahap lifecycle terintegrasi dengan sinyal aktivitas belajar PromotorClass secara real-time.',
    },
  ];

  return (
    <section
      id="fitur"
      style={{
        padding: '72px 24px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              marginBottom: '14px',
              lineHeight: 1.2,
            }}
          >
            Mengapa Promotor STIFIn Berkinerja Tinggi Beralih ke Talira Flow?
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Bandingkan cara lama yang menguras energi dan membuat prospek bocor dengan sistem operasi eksekusi otomatis Talira Flow.
          </p>
        </div>

        {/* Comparison Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {comparisons.map((item) => (
            <div
              key={item.title}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-divider)',
              }}
            >
              {/* Problem Column */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-danger-soft)',
                  border: '1px solid var(--color-danger-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Cara Lama / Manual
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-danger)', marginBottom: '4px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '13px', color: '#7F1D1D', lineHeight: 1.55 }}>
                  {item.friction}
                </div>
              </div>

              {/* Solution Column */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Dengan Talira Flow
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-primary)', marginBottom: '4px' }}>
                  Otomatis, Cepat & Terukur
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-primary-hover)', lineHeight: 1.55 }}>
                  {item.flow}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
