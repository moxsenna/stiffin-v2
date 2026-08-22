'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession, sanitizeReturnTo } from '@/lib/auth';
import { LightningIcon } from '@/components/foundation/icons';

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

      const session = await getSession();
      if (!session) {
        setErrorMessage('Sesi masuk tidak dapat diverifikasi.');
        setIsLoading(false);
        return;
      }

      if (session.entitlements && !session.entitlements.promotorFlow) {
        setErrorMessage('Akun Anda tidak memiliki akses ke PromotorFlow.');
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
        minHeight: '100vh',
        backgroundColor: 'var(--color-canvas)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
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
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <LightningIcon size={26} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Masuk ke PromotorFlow
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Sistem eksekusi pipeline harian promotor STIFIn
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-danger-soft)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
              lineHeight: 1.45,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
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
                height: '44px',
                padding: '0 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-strong)',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                outline: 'none',
                backgroundColor: 'var(--color-canvas)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
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
                height: '44px',
                padding: '0 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-strong)',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                outline: 'none',
                backgroundColor: 'var(--color-canvas)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="touch-target-primary"
            style={{
              width: '100%',
              backgroundColor: isLoading ? 'var(--color-border-strong)' : 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: 0,
              fontWeight: 780,
              fontSize: '14.5px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk →'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-canvas)' }}>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: '14px', fontWeight: 600 }}>Memuat halaman masuk...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
