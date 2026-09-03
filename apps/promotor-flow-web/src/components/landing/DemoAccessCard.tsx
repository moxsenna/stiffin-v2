'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';

export function FlowDemoAccessCard() {
  const router = useRouter();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const demoEmail = 'demo.promotor@stifin.id';
  const demoPassword = 'DemoPromotor123!';
  const bookingUrl = '/p/demo-promotor/book';

  const handleCopy = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleQuickLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await signIn(demoEmail, demoPassword);
      if (res.success) {
        router.push('/app');
      } else {
        setLoginError(res.error || 'Gagal masuk otomatis ke akun demo.');
        setIsLoggingIn(false);
      }
    } catch (e: any) {
      setLoginError(e?.message || 'Terjadi kesalahan saat masuk.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      id="akses-demo"
      style={{
        width: '100%',
        maxWidth: '920px',
        margin: '0 auto 48px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-md)',
        padding: '24px 28px',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--color-divider)',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: '15px',
              fontWeight: 800,
            }}
          >
            ⚡
          </span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              Akses Demo Interaktif Staging
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '2px 0 0', fontWeight: 500 }}>
              Coba alur kerja harian Talira Flow langsung dengan dataset promotor nyata yang terintegrasi.
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 750,
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-primary-border)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          ● Siap Dicoba
        </span>
      </div>

      {loginError && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '16px',
            fontWeight: 600,
          }}
        >
          {loginError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {/* Promotor Dashboard Access Card */}
        <div
          style={{
            padding: '18px',
            backgroundColor: 'var(--color-canvas)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Dashboard Eksekusi Promotor
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Role: Promotor</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Akses antrean follow-up WhatsApp hari ini, kelola kontak prospek, dan atur ketersediaan kalender.
            </p>

            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '10px 12px',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Email:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{demoEmail}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(demoEmail, 'email')}
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {copiedField === 'email' ? '✓ Tersalin' : 'Salin'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Sandi:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{demoPassword}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(demoPassword, 'password')}
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {copiedField === 'password' ? '✓ Tersalin' : 'Salin'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleQuickLogin}
              disabled={isLoggingIn}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: isLoggingIn ? 'wait' : 'pointer',
                textAlign: 'center',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {isLoggingIn ? 'Masuk Otomatis...' : '⚡ Masuk 1-Klik ke Dashboard →'}
            </button>
            <Link
              href="/login"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontWeight: 750,
                fontSize: '13px',
                textDecoration: 'none',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              Form Login
            </Link>
          </div>
        </div>

        {/* Public Booking Link Card */}
        <div
          style={{
            padding: '18px',
            backgroundColor: 'var(--color-canvas)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. Halaman Booking Jadwal Klien
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Role: Calon Klien</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Rasakan kemudahan klien memilih slot konsultasi atau sesi tes STIFIn langsung dari link 14-hari publik.
            </p>

            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '10px 12px',
                fontSize: '12.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Promotor:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Demo Promotor STIFIn</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Layanan:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Tes STIFIn Personal & Parenting</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              href={bookingUrl}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface)',
                border: '2px solid var(--color-primary)',
                color: 'var(--color-primary)',
                fontWeight: 800,
                fontSize: '13px',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              📅 Coba Booking Sesi Konsultasi (Demo) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
