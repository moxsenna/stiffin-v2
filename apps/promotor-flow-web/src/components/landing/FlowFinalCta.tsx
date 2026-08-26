'use client';

import React from 'react';
import Link from 'next/link';
import { LightningIcon } from '../foundation/icons';

export const FlowFinalCta: React.FC = () => {
  return (
    <section
      style={{
        padding: '96px 24px',
        backgroundColor: 'var(--color-primary-hover)',
        color: '#FFFFFF',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '840px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <LightningIcon size={28} color="#FFFFFF" />
        </div>

        <h2
          style={{
            fontSize: 'clamp(28px, 4.5vw, 44px)',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.035em',
            marginBottom: '16px',
            color: '#FFFFFF',
          }}
        >
          Siap Mengubah Chat WhatsApp Menjadi Mesin Konversi Tes STIFIn yang Teratur?
        </h2>

        <p
          style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: '0 auto 40px',
          }}
        >
          Bergabung bersama promotor dan cabang STIFIn di seluruh Indonesia. Mulai kelola antrean tindakan harian Anda dengan nol risiko.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center' }}>
          <Link
            href="/app"
            className="touch-target-primary"
            style={{
              padding: '16px 36px',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-primary-dark)',
              borderRadius: 'var(--radius-full)',
              fontWeight: 850,
              fontSize: '16px',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            Buka App Demo Sekarang →
          </Link>

          <Link
            href="/login"
            className="touch-target"
            style={{
              padding: '16px 28px',
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              fontWeight: 750,
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            Masuk ke Akun Promotor
          </Link>
        </div>
      </div>
    </section>
  );
};
