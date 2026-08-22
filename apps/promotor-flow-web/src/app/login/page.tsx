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
        backgroundColor: '#F7F7F5',
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
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E8E7E3',
          padding: '32px 24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
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
              backgroundColor: '#eef5f1',
              color: '#167A68',
              fontSize: '22px',
              marginBottom: '12px',
            }}
          >
            ⚡
          </div>
          <h1 style={{ font: '700 22px/28px Inter, sans-serif', color: '#191918', marginBottom: '4px' }}>
            Masuk ke PromotorFlow
          </h1>
          <p style={{ font: '400 13px/18px Inter, sans-serif', color: '#71706B', margin: 0 }}>
            Sistem eksekusi pipeline harian promotor STIFIn
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              font: '500 13px/18px Inter, sans-serif',
              marginBottom: '20px',
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', font: '600 13px Inter, sans-serif', color: '#191918', marginBottom: '6px' }}>
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
                borderRadius: '8px',
                border: '1px solid #D5D3CE',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', font: '600 13px Inter, sans-serif', color: '#191918', marginBottom: '6px' }}>
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
                borderRadius: '8px',
                border: '1px solid #D5D3CE',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isLoading ? '#D5D3CE' : '#167A68',
              color: '#FFFFFF',
              font: '600 14px Inter, sans-serif',
              border: 0,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', font: '400 12px/16px Inter, sans-serif', color: '#9C9A94' }}>
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
          <div style={{ color: '#71706B', fontSize: '14px' }}>Memuat halaman masuk...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
