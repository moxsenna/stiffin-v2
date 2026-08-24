'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WhatsAppIcon, CheckIcon, LightningIcon, CalendarIcon, UsersIcon } from '../foundation/icons';

export const FlowHero: React.FC = () => {
  const [activeDemoTab, setActiveDemoTab] = useState<'today' | 'booking' | 'aftercare'>('today');

  return (
    <section
      style={{
        padding: '56px 24px 72px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Social Proof Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary-border)',
          color: 'var(--color-primary)',
          fontSize: '12.5px',
          fontWeight: 780,
          marginBottom: '24px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
        <span>Dipercaya 500+ Promotor & Cabang STIFIn di Seluruh Indonesia</span>
      </div>

      {/* Main Punchy Editorial Headline */}
      <h1
        style={{
          fontSize: 'clamp(32px, 5.5vw, 56px)',
          fontWeight: 900,
          lineHeight: 1.12,
          letterSpacing: '-0.035em',
          color: 'var(--color-text-primary)',
          maxWidth: '920px',
          margin: '0 0 20px',
        }}
      >
        Tutup Lebih Banyak Sesi Tes STIFIn Tanpa Kehilangan Prospek di WhatsApp.
      </h1>

      {/* Subheadline with clear value proposition */}
      <p
        style={{
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          maxWidth: '740px',
          margin: '0 0 36px',
          fontWeight: 450,
        }}
      >
        Sistem operasi pipeline harian promotor STIFIn. Mengubah chat WhatsApp yang berserakan menjadi <strong>antrean follow-up 1-tap</strong>, <strong>link booking jadwal 14-hari</strong>, dan <strong>retensi aftercare otomatis</strong>.
      </p>

      {/* Hero CTA Group */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          justifyContent: 'center',
          marginBottom: '56px',
        }}
      >
        <Link
          href="/app"
          className="touch-target-primary"
          style={{
            padding: '14px 32px',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-full)',
            fontWeight: 800,
            fontSize: '15.5px',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-md)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Coba Demo Interaktif Sekarang</span>
          <span>→</span>
        </Link>

        <a
          href="#simulasi"
          className="touch-target"
          style={{
            padding: '14px 28px',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border-strong)',
            fontWeight: 750,
            fontSize: '15px',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          Lihat Cara Kerja Pipeline
        </a>
      </div>

      {/* Key Proof Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          width: '100%',
          maxWidth: '880px',
          padding: '20px 24px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-divider)',
          boxShadow: 'var(--shadow-xs)',
          marginBottom: '56px',
          textAlign: 'center',
        }}
      >
        <div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary)' }}>
            98.4%
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
            Follow-Up Tepat Waktu
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary)' }}>
            3.2x
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
            Peningkatan Konversi Tes
          </div>
        </div>
        <div>
          <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary)' }}>
            15+ Jam
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
            Waktu Admin Dihemat / Minggu
          </div>
        </div>
      </div>

      {/* Interactive Hero Visual Showcase */}
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-divider)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          textAlign: 'left',
        }}
      >
        {/* Mockup Header Controls */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--color-canvas)',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-tertiary)', marginLeft: '8px' }}>
              PromotorFlow App Preview · Daily Execution OS
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'today', label: 'Hari ini', icon: <LightningIcon size={13} /> },
              { id: 'booking', label: 'Booking 14-Hari', icon: <CalendarIcon size={13} /> },
              { id: 'aftercare', label: 'Aftercare D+7', icon: <UsersIcon size={13} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemoTab(tab.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeDemoTab === tab.id ? 'var(--color-primary)' : 'transparent',
                  color: activeDemoTab === tab.id ? '#FFFFFF' : 'var(--color-text-secondary)',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mockup Dynamic Content */}
        <div style={{ padding: '24px 20px' }}>
          {activeDemoTab === 'today' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 850, fontSize: '16px', color: 'var(--color-text-primary)' }}>
                  Antrean Tindakan Hari Ini
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 780, color: 'var(--color-danger)' }}>
                  1 Terlambat · 2 Tepat Waktu
                </span>
              </div>

              {/* Sample Action 1: Overdue */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-danger-border)',
                  backgroundColor: 'var(--color-surface)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--color-text-primary)' }}>
                      Ibu Ratna (Mama Kevin)
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 780, padding: '2px 7px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                      Terlambat 1 Hari
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Instagram DM · Tanya Tes STIFIn Pasutri & Paket Anak
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 650, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                    Kirim link jadwal konsultasi akhir pekan
                  </div>
                </div>

                <Link
                  href="/app"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 780,
                    fontSize: '12.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <WhatsAppIcon size={16} color="#FFFFFF" />
                  <span>1-Tap WA</span>
                </Link>
              </div>

              {/* Sample Action 2: Today Schedule */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-canvas)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--color-text-primary)' }}>
                      Pak Hendra Wijaya
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 750, padding: '2px 7px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      Hot Lead
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Selesai Modul Edukasi Mesin Kecerdasan Sensing · PromotorClass Signal
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 650, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                    Tawarkan sesi Tes STIFIn Personal & Pembahasan Hasil
                  </div>
                </div>

                <Link
                  href="/app"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 780,
                    fontSize: '12.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    flexShrink: 0,
                  }}
                >
                  <WhatsAppIcon size={16} color="#FFFFFF" />
                  <span>1-Tap WA</span>
                </Link>
              </div>
            </div>
          )}

          {activeDemoTab === 'booking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-text-primary)' }}>
                Halaman Booking Publik Klien (Tautan Otomatis 14-Hari)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Klien memilih langsung slot waktu luang tanpa harus saling tanya berkali-kali di chat:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginTop: '6px' }}>
                {['Sabtu, 10:00 WIB', 'Sabtu, 14:00 WIB', 'Minggu, 09:30 WIB', 'Minggu, 13:00 WIB'].map((slot, i) => (
                  <div
                    key={slot}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: i === 0 ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                      backgroundColor: i === 0 ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      fontWeight: 750,
                      fontSize: '12.5px',
                      textAlign: 'center',
                    }}
                  >
                    {slot} {i === 0 ? '✓' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDemoTab === 'aftercare' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-text-primary)' }}>
                Otomasi Aftercare D+7 & Referral Engine
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Tepat 7 hari setelah sesi tes STIFIn selesai, sistem otomatis menjadwalkan tindakan follow-up untuk menanyakan progres implementasi gaya belajar anak dan menawarkan program mentoring lanjutan.
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary-border)',
                  fontSize: '13px',
                  color: 'var(--color-primary-hover)',
                  lineHeight: 1.5,
                }}
              >
                <em>&ldquo;Halo Bu Ratna, bagaimana penerapan panduan belajar Kevin setelah hasil Tes STIFIn pekan lalu? Apakah sudah mulai terasa perubahannya?&rdquo;</em>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
