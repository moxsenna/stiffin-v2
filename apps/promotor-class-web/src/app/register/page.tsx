'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth';
import { Wordmark } from '@/components/ui';

function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await signUp(name.trim(), email.trim(), password);
      if (!result.success) {
        setErrorMessage(result.error || 'Pendaftaran gagal.');
        setIsLoading(false);
        return;
      }
      router.replace('/login?registered=1');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat mendaftar.');
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
            Daftar Ralivo Class
          </h1>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)', marginTop: 6 }}>
            Buat akun promotor, verifikasi email, tunggu aktivasi admin
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
              <label className="field-label" htmlFor="class-name">Nama lengkap</label>
              <input
                id="class-name"
                type="text"
                required
                autoComplete="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
              />
            </div>

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

            <div>
              <label className="field-label" htmlFor="class-password">Kata sandi</label>
              <input
                id="class-password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
              {isLoading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 20, font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted)' }}>
          Sudah punya akun? <a href="/login">Masuk</a>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--canvas)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Memuat halaman daftar...</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
