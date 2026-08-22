'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession, sanitizeReturnTo } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo');
  const returnTo = sanitizeReturnTo(rawReturnTo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await signIn(email.trim(), password);
      if (!result.success) {
        setErrorMessage(result.error || 'Email atau kata sandi tidak cocok.');
        setIsLoading(false);
        return;
      }

      // Verify session and entitlements
      const session = await getSession();
      if (!session) {
        setErrorMessage('Sesi masuk tidak dapat diverifikasi.');
        setIsLoading(false);
        return;
      }

      if (session.entitlements && !session.entitlements.promotorClass) {
        setErrorMessage('Akun Anda tidak memiliki akses ke PromotorClass.');
        setIsLoading(false);
        return;
      }

      router.replace(returnTo);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat masuk.');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-xl)',
          border: '1px solid var(--color-divider)',
          padding: '36px 28px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              marginBottom: '16px',
              border: '1px solid var(--color-primary-border)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px', color: 'var(--color-text-main)' }}>
            Masuk ke PromotorClass
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Platform edukasi dan storefront materi STIFIn
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: 'var(--color-status-danger-bg)',
              border: '1px solid var(--color-status-danger-border)',
              color: 'var(--color-status-danger)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
              lineHeight: 1.4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Email Promotor
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="promotor@stifin.id"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'var(--color-surface)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Kata Sandi
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'var(--color-surface)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="touch-target-primary"
            style={{
              width: '100%',
              minHeight: '48px',
              borderRadius: 'var(--border-radius-md)',
              backgroundColor: isLoading ? 'var(--color-text-subtle)' : 'var(--color-primary)',
              color: '#FFF',
              fontSize: '14.5px',
              fontWeight: 780,
              border: 0,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
          Butuh bantuan akses akun? Hubungi administrator cabang Anda.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-canvas)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', fontWeight: 600 }}>Memuat halaman masuk...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
