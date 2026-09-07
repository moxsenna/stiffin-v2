'use client';

import React from 'react';
import Link from 'next/link';
import { LightningIcon, CheckIcon, UsersIcon, ExternalLinkIcon, MessageSquareIcon } from '../foundation/icons';

export const FlowClassIntegrationSection: React.FC = () => {
  const pillars = [
    {
      badge: 'Client Education OS',
      title: 'LMS & Storefront Edukasi Khusus STIFIn',
      description:
        'Bangun kelas kilat (parenting, tes minat bakat anak, produktivitas kerja) dalam hitungan menit. Calon klien belajar mandiri melalui portal resmi Anda tanpa Anda harus menjelaskan berulang kali secara manual.',
      highlights: [
        'Katalog publik & storefront personal promotor',
        'Materi video terstruktur (YouTube unlisted / publik)',
        'Dukungan kelas lead magnet gratis maupun program berbayar',
      ],
    },
    {
      badge: 'Algoritma Scoring',
      title: 'Intent Engine Cerdas (HOT / WARM / COLD)',
      description:
        'Bukan sekadar melihat jumlah penonton video. Ralivo Class mewajibkan refleksi pengunci pemahaman. Sistem secara otomatis menganalisis kesiapan beli peserta dan memberi label HOT bagi yang siap mengambil tes STIFIn.',
      highlights: [
        'Skor kesiapan 0–100 dihitung otomatis per progres belajar',
        'Label HOT langsung tersemat saat peserta menyelesaikan materi kunci',
        'Peringatan learner macet agar promotor dapat menyapa tepat waktu',
      ],
    },
    {
      badge: 'Sinergi Otomatis',
      title: 'Alirkan Prospek Matang Langsung ke Antrean Flow',
      description:
        'Begitu peserta di Ralivo Class terdeteksi HOT, profil dan nomor kontak mereka langsung muncul di antrean tindakan harian (Today Work Queue) Ralivo Flow Anda lengkap dengan draf pesan WhatsApp personal.',
      highlights: [
        'Database kontak tersinkronisasi instan (tanpa export-import CSV)',
        '1-tap kirim pesan WhatsApp dengan konteks materi yang baru dipelajari',
        'Arahkan langsung ke link booking kalender 14-hari untuk sesi tes',
      ],
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      platform: 'Ralivo Class',
      platformColor: '#2563EB',
      title: 'Calon Klien Belajar',
      detail: 'Prospek mendaftar di storefront promotor dan mengikuti modul video singkat tentang STIFIn.',
    },
    {
      step: '02',
      platform: 'Ralivo Class',
      platformColor: '#2563EB',
      title: 'Sinyal Intent HOT Terpicu',
      detail: 'Peserta mengisi lembar refleksi. Sistem otomatis menilai prospek telah teredukasi dan siap tes.',
    },
    {
      step: '03',
      platform: 'Ralivo Flow',
      platformColor: '#059669',
      title: 'Muncul di Today Queue',
      detail: 'Data masuk ke antrean harian promotor. 1-tap buka WA dengan draf personal sesuai materi.',
    },
    {
      step: '04',
      platform: 'Ralivo Flow',
      platformColor: '#059669',
      title: 'Booking & Aftercare D+7',
      detail: 'Klien memilih slot tes di link booking mandiri. Selesai tes, sistem jadwalkan Aftercare D+7 otomatis.',
    },
  ];

  return (
    <section
      id="class"
      style={{
        padding: '80px 24px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 56px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              color: '#1D4ED8',
              fontSize: '12.5px',
              fontWeight: 800,
              marginBottom: '16px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
            Sinergi Ekosistem: Ralivo Class + Ralivo Flow
          </div>

          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              marginBottom: '16px',
              lineHeight: 1.2,
            }}
          >
            Lengkapi Pipeline Anda dengan <span style={{ color: '#2563EB' }}>Ralivo Class</span> — Mesin Edukasi Calon Klien
          </h2>

          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0 }}>
            Mengapa harus lelah menjelaskan dari nol di chat? Dengan <strong>Ralivo Class</strong>, Anda mengedukasi calon klien terlebih dahulu melalui program video terstruktur. Begitu mereka paham pentingnya STIFIn, <strong>Ralivo Flow</strong> siap mengeksekusi penutupan sesi tes dengan cepat.
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '48px',
          }}
        >
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              style={{
                backgroundColor: 'var(--color-canvas)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-divider)',
                padding: '32px 26px',
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
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#2563EB',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    marginBottom: '14px',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  {pillar.badge}
                </div>

                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 850,
                    color: 'var(--color-text-primary)',
                    marginBottom: '12px',
                    lineHeight: 1.3,
                  }}
                >
                  {pillar.title}
                </h3>

                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {pillar.description}
                </p>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--color-divider)',
                  paddingTop: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {pillar.highlights.map((h) => (
                  <div key={h} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                    <span style={{ color: '#2563EB', marginTop: '1px' }}>✓</span>
                    <span style={{ lineHeight: 1.45 }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Workflow Diagram */}
        <div
          style={{
            backgroundColor: 'var(--color-canvas)',
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-xl)',
            padding: '36px 28px',
            marginBottom: '40px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Alur Kerja Terpadu: Dari Belajar Menjadi Closing Tes
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Bagaimana data mengalir otomatis dari Ralivo Class ke Ralivo Flow tanpa input ganda.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {workflowSteps.map((s) => (
              <div
                key={s.step}
                style={{
                  padding: '20px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--color-text-tertiary)' }}>{s.step}</span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: s.platformColor,
                      backgroundColor: s.platformColor === '#2563EB' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                      border: `1px solid ${s.platformColor === '#2563EB' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`,
                      padding: '2px 7px',
                      borderRadius: '4px',
                    }}
                  >
                    {s.platform}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {s.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ecosystem Synergy Callout Banner */}
        <div
          style={{
            padding: '24px 28px',
            backgroundColor: 'rgba(37, 99, 235, 0.04)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div style={{ maxWidth: '720px' }}>
            <div style={{ fontSize: '16px', fontWeight: 850, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Satu Akun, Satu Langganan — Keduanya Sudah Termasuk
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Anda tidak perlu berlangganan dua aplikasi berbeda. Paket <strong>Ralivo Solo</strong> sudah mencakup akses penuh ke <strong>Ralivo Flow</strong> (CRM & WhatsApp) dan <strong>Ralivo Class</strong> (LMS & Intent Scoring).
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="#harga"
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                fontSize: '13.5px',
                fontWeight: 750,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Lihat Paket Terpadu →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
