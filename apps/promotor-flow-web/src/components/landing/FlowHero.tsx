'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WhatsAppIcon, CheckIcon, LightningIcon, CalendarIcon, UsersIcon } from '../foundation/icons';

export const FlowHero: React.FC = () => {
  const [activeDemoTab, setActiveDemoTab] = useState<'today' | 'pipeline' | 'booking'>('today');

  const demoTabs = [
    {
      id: 'today' as const,
      label: 'Hari ini',
      badge: 'Work Queue',
      icon: <LightningIcon size={13} />,
      url: 'app.ralivo.com/flow',
      desktopSrc: '/images/previews/flow-today-cockpit.webp',
      mobileSrc: '/images/previews/flow-today-mobile.webp',
      captionTitle: 'Antrean Tindakan Hari Ini — Zero Guesswork',
      captionDesc: 'Sistem menyusun siapa yang harus dikontak hari ini berdasarkan prioritas dan jatuh tempo dengan tombol 1-Tap WA.',
    },
    {
      id: 'pipeline' as const,
      label: 'Pipeline CRM',
      badge: 'Kanban',
      icon: <UsersIcon size={13} />,
      url: 'app.ralivo.com/pipeline',
      desktopSrc: '/images/previews/flow-kanban-pipeline.webp',
      captionTitle: 'Papan Visual Prospek 7-Tahap',
      captionDesc: 'Pantau posisi setiap kontak dari Lead Baru, Dihubungi, Minat Tinggi, Booking Terkunci, hingga Klien Selesai.',
    },
    {
      id: 'booking' as const,
      label: 'Booking 14-Hari',
      badge: 'Kalender',
      icon: <CalendarIcon size={13} />,
      url: 'promotorflow.id/p/rina/book',
      desktopSrc: '/images/previews/flow-booking-calendar.webp',
      captionTitle: 'Halaman Booking Mandiri Tanpa Saling Tanya',
      captionDesc: 'Klien memilih slot waktu konsultasi/tes sendiri. Terkunci otomatis ke kalender promotor tanpa double booking.',
    },
  ];

  const currentTab = demoTabs.find((t) => t.id === activeDemoTab) || demoTabs[0];

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
        <span>Dirancang untuk Promotor & Cabang STIFIn di Seluruh Indonesia</span>
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
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary)' }}>
            1-Tap
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
            Follow-Up via WhatsApp
          </div>
        </div>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary)' }}>
            14-Hari
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
            Slot Booking Publik Otomatis
          </div>
        </div>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary)' }}>
            D+7
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
            Aftercare Terjadwal Otomatis
          </div>
        </div>
      </div>

      {/* Interactive Hero Visual Showcase */}
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-divider)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          textAlign: 'left',
          marginTop: '12px',
        }}
      >
        {/* Mockup Header Controls */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--color-canvas)',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
            <div
              style={{
                marginLeft: '8px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11.5px',
                color: 'var(--color-text-secondary)',
                fontFamily: 'monospace',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ color: '#10b981', fontSize: '10px' }}>🔒</span>
              <span style={{ opacity: 0.6 }}>https://</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{currentTab.url}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {demoTabs.map((tab) => {
              const isActive = activeDemoTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDemoTab(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                    border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-divider)',
                    fontSize: '12px',
                    fontWeight: 750,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all var(--duration-fast) ease',
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : 'var(--color-canvas)',
                        color: isActive ? '#FFFFFF' : 'var(--color-primary)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Screenshot Viewport Container */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#0F172A',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <img
            src={currentTab.desktopSrc}
            alt={currentTab.captionTitle}
            width={1280}
            height={800}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              aspectRatio: '16/10',
              objectFit: 'cover',
              objectPosition: 'top left',
            }}
            loading="lazy"
          />

          {/* Floating Mobile Inset Phone Preview (Only for tabs with mobileSrc) */}
          {currentTab.mobileSrc && (
            <div
              className="flow-preview-mobile-inset"
              style={{
                position: 'absolute',
                right: '24px',
                bottom: '-24px',
                width: '170px',
                backgroundColor: 'var(--color-surface)',
                border: '3px solid #0F172A',
                borderRadius: '24px',
                boxShadow: '0 20px 35px -8px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                zIndex: 2,
              }}
            >
              <div style={{ backgroundColor: '#0F172A', padding: '4px 0', textAlign: 'center' }}>
                <span style={{ width: '32px', height: '3px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '2px', display: 'inline-block' }} />
              </div>
              <img
                src={currentTab.mobileSrc}
                alt={`${currentTab.label} Mobile`}
                width={390}
                height={844}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Feature Caption Underneath Frame */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-divider)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: '260px', flex: 1 }}>
            <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
              {currentTab.captionTitle}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {currentTab.captionDesc}
            </div>
          </div>
          <Link
            href="/app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 750,
              textDecoration: 'none',
              border: '1px solid var(--color-primary-border)',
            }}
          >
            <span>Buka Demo Langsung</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .flow-preview-mobile-inset {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
};
