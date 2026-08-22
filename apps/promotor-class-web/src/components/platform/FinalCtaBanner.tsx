'use client';

import React from 'react';
import Link from 'next/link';

export function FinalCtaBanner() {
  return (
    <section
      style={{
        paddingTop: '72px',
        paddingBottom: '80px',
        backgroundColor: 'var(--color-primary)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        <div
          style={{
            maxWidth: '820px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(32px, 4.5vw, 52px)',
              letterSpacing: '-0.045em',
              fontWeight: 850,
              lineHeight: 1.1,
              marginBottom: '20px',
              color: '#FFFFFF',
            }}
          >
            Siap mengubah materi edukasi Anda menjadi aliran klien yang loyal?
          </h2>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              lineHeight: 1.65,
              color: '#D4E7DC',
              maxWidth: '680px',
              margin: '0 auto 36px',
            }}
          >
            Bergabunglah dengan ratusan promotor STIFIn dan praktisi edukasi yang telah membebaskan diri dari kerumitan teknis dan menikmati follow-up klien yang lebih manusiawi.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '28px',
            }}
          >
            <Link
              href="/login"
              style={{
                minHeight: '52px',
                padding: '0 32px',
                borderRadius: '13px',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-primary)',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.15s ease',
              }}
            >
              Mulai Buat Ruang Belajar Gratis →
            </Link>

            <Link
              href="/p/rina-prameswari"
              style={{
                minHeight: '52px',
                padding: '0 24px',
                borderRadius: '13px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              Lihat Demo Toko Publik
            </Link>
          </div>

          <div style={{ fontSize: '12px', color: '#B8D4C5' }}>
            ✓ Tanpa biaya setup · ✓ Tanpa kartu kredit · ✓ Setup &lt; 2 menit
          </div>
        </div>
      </div>
    </section>
  );
}
