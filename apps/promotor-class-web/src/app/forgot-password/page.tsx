'use client';

import React, { useState, Suspense } from 'react';
import { requestPasswordReset } from '@/lib/auth';
import { Wordmark } from '@/components/ui';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } finally {
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
          <Wordmark class />
          <h1 style={{ font: '800 26px/1.1 var(--font-sans)', letterSpacing: '-0.03em', marginTop: 18 }}>
            Lupa kata sandi
          </h1>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)', marginTop: 6 }}>
            Masukkan email akun Anda
          </p>
        </div>

        <div style={{ background: 'var(--surface)', border: 'var(--sep-strong)', padding: 22 }}>
          {sent ? (
            <p role="status" style={{ font: '400 13px/1.5 var(--font-sans)' }}>
              Jika email terdaftar, link reset telah terkirim. Periksa kotak masuk Anda.
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="class-email">Email promotor</label>
                <input
                  id="class-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="promotor@stifin.id"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
                {isLoading ? 'Mengirim...' : 'Kirim link reset'}
              </button>
            </form>
          )}
        </div>

        <div style={{ marginTop: 20, font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted)' }}>
          <a href="/login">Kembali masuk</a>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--canvas)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Memuat...</div>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
