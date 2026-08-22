'use client';

import React from 'react';
import Link from 'next/link';
import { LightningIcon } from '../foundation/icons';

export const FlowLandingFooter: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-canvas)',
        borderTop: '1px solid var(--color-divider)',
        padding: '64px 24px 40px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Brand Col */}
          <div>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                color: 'var(--color-text-primary)',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LightningIcon size={18} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: '17px', fontWeight: 850, letterSpacing: '-0.03em' }}>
                PromotorFlow
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Sistem operasi eksekusi harian promotor STIFIn. Merapikan pipeline prospek, jadwal booking 14-hari, dan siklus retensi aftercare.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fitur Utama
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
              <a href="#fitur" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Today Work Queue (1-Tap WA)</a>
              <a href="#fitur" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Booking Jadwal Publik 14-Hari</a>
              <a href="#fitur" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Pusat Komando CRM Kontak</a>
              <a href="#fitur" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Siklus Otomatis Aftercare D+7</a>
            </div>
          </div>

          {/* Ekosistem STIFIn */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ekosistem Terintegrasi
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>PromotorFlow (Daily Execution OS)</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>PromotorClass (Client Education OS)</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>STIFIn Biometric Intelligence</span>
            </div>
          </div>

          {/* Portal Akses */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Portal Akses
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
              <Link href="/app" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
                Buka WebApp Demo →
              </Link>
              <Link href="/login" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                Masuk ke Akun
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div
          style={{
            borderTop: '1px solid var(--color-divider)',
            paddingTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12.5px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <div>
            © {new Date().getFullYear()} PromotorFlow. Hak cipta dilindungi undang-undang.
          </div>
          <div>
            Dibuat untuk praktisi, promotor, dan cabang STIFIn di seluruh Indonesia.
          </div>
        </div>
      </div>
    </footer>
  );
};
