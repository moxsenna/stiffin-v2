'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';
import { Wordmark } from '@/components/ui';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Token reset tidak valid. Minta link baru di halaman lupa kata sandi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(token, newPassword);
      if (!result.success) {
        setErrorMessage(result.error || 'Reset kata sandi gagal.');
        setIsLoading(false);
        return;
      }
      router.replace('/login?reset=1');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem.');
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
        backgroundColor: 'var(--canvas)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: 28 }}>
          <Wordmark flow />
          <h1 style={{ font: '800 26px/1.1 var(--font-sans)', letterSpacing: '-0.03em', marginTop: 18 }}>
            Reset kata sandi
          </h1>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)', marginTop: 6 }}>
            Buat kata sandi baru Anda
          </p>
        </div>

        <div style={{ background: 'var(--surface)', border: 'var(--sep-strong)', padding: 22 }}>
          {errorMessage && (
            <div className="field-error" role="alert" style={{ marginBottom: 16 }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="field-label" htmlFor="flow-new-password">Kata sandi baru</label>
              <input
                id="flow-new-password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="flow-confirm-password">Konfirmasi kata sandi</label>
              <input
                id="flow-confirm-password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
              {isLoading ? 'Menyimpan...' : 'Simpan kata sandi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--canvas)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Memuat...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
