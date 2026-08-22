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
          borderRadius: '20px',
          border: '1px solid var(--color-divider)',
          padding: '32px 24px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: '24px',
              marginBottom: '12px',
            }}
          >
            📖
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Masuk ke PromotorClass
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
            Platform edukasi dan storefront materi STIFIn
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
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
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--color-divider)',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'var(--color-surface)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
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
                padding: '11px 14px',
                borderRadius: '10px',
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
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: isLoading ? 'var(--color-divider)' : 'var(--color-primary)',
              color: '#FFF',
              fontSize: '14px',
              fontWeight: 780,
              border: 0,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
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
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Memuat halaman masuk...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
