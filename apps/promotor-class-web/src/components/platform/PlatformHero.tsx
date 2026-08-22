'use client';

import React from 'react';
import Link from 'next/link';

export function PlatformHero() {
  return (
    <section
      style={{
        paddingTop: '64px',
        paddingBottom: '48px',
        borderBottom: '1px solid var(--color-divider)',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div className="container">
        <div
          style={{
            maxWidth: '880px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)',
              lineHeight: 1.05,
              letterSpacing: '-0.045em',
              fontWeight: 850,
              color: 'var(--color-text-main)',
              marginBottom: '22px',
            }}
          >
            Ubah materi edukasi Anda menjadi{' '}
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--color-primary)',
              }}
            >
              mesin konversi klien
            </span>{' '}
            otomatis.
          </h1>

          {/* Subtitle / Value Proposition */}
          <p
            style={{
              fontSize: 'clamp(16px, 2vw, 19px)',
              lineHeight: 1.65,
              color: 'var(--color-text-muted)',
              maxWidth: '720px',
              margin: '0 auto 32px',
            }}
          >
            PromotorClass adalah <strong>Client Education OS</strong> yang mengubah video ringkas dan materi pengantar Anda menjadi sinyal niat beli, onboarding aftersales terstruktur, dan tindak lanjut WhatsApp siap closing.
          </p>

          {/* Direct CTA Cluster */}
          <div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '40px',
            }}
          >
            <Link
              href="/login"
              style={{
                minHeight: '52px',
                padding: '0 28px',
                borderRadius: '13px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(40, 99, 68, 0.28)',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
              }}
            >
              Mulai Buat Program Gratis →
            </Link>

            <Link
              href="/p/rina-prameswari"
              style={{
                minHeight: '52px',
                padding: '0 24px',
                borderRadius: '13px',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-text-main)',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '1px solid var(--color-divider)',
                transition: 'background-color 0.15s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              Lihat Live Demo Storefront
            </Link>
          </div>

          {/* Social Proof & Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              paddingTop: '24px',
              borderTop: '1px solid var(--color-divider)',
              maxWidth: '760px',
              margin: '0 auto',
            }}
          >
            <div>
              <strong style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-main)', display: 'block' }}>
                500+
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Keluarga & Klien Teredukasi
              </span>
            </div>

            <div>
              <strong style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-primary)', display: 'block' }}>
                94%
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Tingkat Respon WhatsApp
              </span>
            </div>

            <div>
              <strong style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-main)', display: 'block' }}>
                &lt; 2 Menit
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Setup Program Tanpa Koding
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
