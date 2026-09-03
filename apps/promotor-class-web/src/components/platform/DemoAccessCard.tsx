'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';

export function DemoAccessCard() {
  const router = useRouter();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const demoEmail = 'demo.promotor@stifin.id';
  const demoPassword = 'DemoPromotor123!';
  const learnerTokenUrl = '/learn?token=demo-ayu-rahma-token-secret-2026';
  const storefrontUrl = '/p/demo-promotor/catalog';

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
        maxWidth: '920px',
        margin: '0 auto 48px',
        backgroundColor: '#FFFFFF',
        border: '2px solid #0F172A',
        boxShadow: '6px 6px 0px #0F172A',
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
          borderBottom: '1px solid #E2E8F0',
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
              width: '28px',
              height: '28px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
            }}
          >
            ⚡
          </span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 850, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Akses Demo Interaktif Staging
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0', fontWeight: 500 }}>
              Coba langsung seluruh fitur Talira Class tanpa perlu mendaftar atau setup materi baru.
            </p>
          </div>
        </div>

        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 750,
            padding: '4px 10px',
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            border: '1px solid #BBF7D0',
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
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
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
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Dashboard Promotor
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Role: Promotor</span>
            </div>
            <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 14px', lineHeight: 1.5 }}>
              Kelola kelas edukasi, pantau matriks intent HOT/WARM/COLD learner, dan kirim draf WA 1-tap.
            </p>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
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
                <span style={{ color: '#64748B' }}>Email:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{demoEmail}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(demoEmail, 'email')}
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    border: '1px solid #CBD5E1',
                    background: '#F1F5F9',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {copiedField === 'email' ? '✓ Tersalin' : 'Salin'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Sandi:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{demoPassword}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(demoPassword, 'password')}
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    border: '1px solid #CBD5E1',
                    background: '#F1F5F9',
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
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: isLoggingIn ? 'wait' : 'pointer',
                textAlign: 'center',
                transition: 'opacity 150ms ease',
              }}
            >
              {isLoggingIn ? 'Masuk Otomatis...' : '⚡ Masuk 1-Klik ke Dashboard →'}
            </button>
            <Link
              href="/login"
              style={{
                padding: '10px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #0F172A',
                color: '#0F172A',
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

        {/* Learner Portal & Public Storefront */}
        <div
          style={{
            padding: '18px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. Pengalaman Peserta (Learner)
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Role: Ayu Rahmawati</span>
            </div>
            <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 14px', lineHeight: 1.5 }}>
              Lihat tampilan modul belajar mandiri, isi form refleksi, dan amati bagaimana sistem mengunci progres.
            </p>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                padding: '10px 12px',
                fontSize: '12.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Peserta Demo:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Ayu Rahmawati (0812-9900-1122)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Akses Otentikasi:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>Token Magic Link (Tanpa Password)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              href={learnerTokenUrl}
              style={{
                padding: '10px 14px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              🎓 Buka Portal Belajar Peserta (Demo) →
            </Link>
            <Link
              href={storefrontUrl}
              style={{
                padding: '8px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontWeight: 700,
                fontSize: '12.5px',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              🌐 Buka Katalog Storefront Publik
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
