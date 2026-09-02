'use client';

import React from 'react';
import { LightningIcon, CalendarIcon, UsersIcon, CheckIcon, MessageSquareIcon } from '../foundation/icons';

export const FlowFeatureGrid: React.FC = () => {
  const features = [
    {
      icon: <LightningIcon size={24} color="var(--color-primary)" />,
      title: 'Antrean Tindakan Hari Ini (Today Work Queue)',
      description: 'Hilangkan keraguan siapa yang harus dihubungi. Sistem memprioritaskan prospek paling siap beli, mengingatkan jadwal jatuh tempo, dan menyediakan tombol 1-tap kirim pesan WhatsApp.',
      highlights: ['Prioritas otomatis berdasarkan urgensi', 'Peringatan lead terlambat (Overdue alert)', 'Pemisahan jelas jadwal hari ini vs mendatang'],
    },
    {
      icon: <CalendarIcon size={24} color="var(--color-primary)" />,
      title: 'Halaman Booking Publik 14-Hari',
      description: 'Bagikan 1 tautan personal kepada calon klien. Mereka dapat memilih sendiri slot jam konsultasi yang masih kosong tanpa perlu tanya jawab manual yang bertele-tele.',
      highlights: ['Pilihan tipe lokasi (On-Site, Home Visit, Online)', 'Sinkronisasi jam kerja & ketersediaan mingguan', 'Struk konfirmasi & instruksi persiapan tes otomatis'],
    },
    {
      icon: <UsersIcon size={24} color="var(--color-primary)" />,
      title: 'Pusat Komando CRM & 6-Tahap Lifecycle',
      description: 'Lacak perjalanan setiap keluarga dari prospek awal hingga promotor loyal. Simpan profil anak, catatan kendala belajar, serta histori pembayaran tes secara rapi.',
      highlights: ['6 tahap jelas: NEW, CONTACTED, INTERESTED, BOOKED, COMPLETED, LOST', 'Audit alasan pembatalan (Lost Reason Analysis)', 'Rekam catatan keluarga & preferensi komunikasi'],
    },
    {
      icon: <MessageSquareIcon size={24} color="var(--color-primary)" />,
      title: 'Siklus Otomatis Aftercare D+7 & Referral',
      description: 'Jangan biarkan hubungan putus setelah tes selesai. Sistem secara otomatis menjadwalkan follow-up tepat 7 hari pasca tes untuk evaluasi hasil dan penawaran kelas parenting lanjutan.',
      highlights: ['Jadwal evaluasi D+7 terpasang otomatis', 'Integrasi sinyal belajar PromotorClass', 'Peluang repeat order & permohonan referral keluarga'],
    },
  ];

  return (
    <section
      style={{
        padding: '80px 24px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 56px' }}>
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
            Fitur Lengkap yang Dirancang Khusus untuk Alur Kerja Promotor STIFIn
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Bukan CRM generik yang rumit. Talira Flow dibangun dari pengalaman nyata para praktisi dan konsultan STIFIn terbaik di lapangan.
          </p>
        </div>

        {/* 2x2 Feature Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {features.map((feat) => (
            <div
              key={feat.title}
              style={{
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-divider)',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                  }}
                >
                  {feat.icon}
                </div>

                <h3 style={{ fontSize: '18.5px', fontWeight: 850, color: 'var(--color-text-primary)', marginBottom: '10px', lineHeight: 1.3 }}>
                  {feat.title}
                </h3>

                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {feat.description}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {feat.highlights.map((h) => (
                  <div key={h} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                    <span style={{ color: 'var(--color-primary)' }}>✓</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
