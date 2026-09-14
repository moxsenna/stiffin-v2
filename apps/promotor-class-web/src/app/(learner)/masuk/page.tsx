'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getPlatformApiClient } from '@/adapters';
import { setActiveLearnerSession, resolveWorkspaceSlug } from '@/lib/session';

type AuthMode = 'LOGIN_EMAIL' | 'REGISTER' | 'LOGIN_WA';

export default function LearnerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('LOGIN_EMAIL');

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // WhatsApp OTP state
  const [waPhone, setWaPhone] = useState('');
  const [waCode, setWaCode] = useState('');
  const [waStep, setWaStep] = useState<'PHONE' | 'CODE'>('PHONE');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = getPlatformApiClient();
      const res = await api.loginLearner({ email, password });
      setActiveLearnerSession({ contactId: res.contactId, workspaceSlug: res.workspaceSlug });
      router.push('/learn');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Email atau kata sandi tidak valid.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = getPlatformApiClient();
      const workspaceSlug = resolveWorkspaceSlug() || undefined;
      const res = await api.registerLearner({
        name: regName,
        email: regEmail,
        password: regPassword,
        phoneRaw: regPhone.trim() || undefined,
        workspaceSlug,
      });
      setActiveLearnerSession({ contactId: res.contactId, workspaceSlug: res.workspaceSlug });
      router.push('/learn');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal. Periksa data Anda.');
    } finally {
      setBusy(false);
    }
  };

  const handleWaRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = getPlatformApiClient();
      await api.requestLearnerOtp(waPhone);
      setWaStep('CODE');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim kode via WhatsApp.');
    } finally {
      setBusy(false);
    }
  };

  const handleWaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = getPlatformApiClient();
      const res = await api.verifyLearnerOtp(waPhone, waCode);
      setActiveLearnerSession({ contactId: res.contactId, workspaceSlug: res.workspaceSlug });
      router.push('/learn');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kode OTP tidak valid atau kedaluwarsa.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LearnerShell title={mode === 'REGISTER' ? 'Daftar Akun Peserta' : 'Masuk Ruang Belajar'}>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '24px 18px 48px' }}>
        {/* Navigation / Mode Pills */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-muted, #F3F4F6)',
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('LOGIN_EMAIL'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 0,
              borderRadius: 8,
              font: '700 13px/1.2 var(--font-sans)',
              background: mode === 'LOGIN_EMAIL' ? '#FFFFFF' : 'transparent',
              color: mode === 'LOGIN_EMAIL' ? '#111827' : '#6B7280',
              boxShadow: mode === 'LOGIN_EMAIL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 0,
              borderRadius: 8,
              font: '700 13px/1.2 var(--font-sans)',
              background: mode === 'REGISTER' ? '#FFFFFF' : 'transparent',
              color: mode === 'REGISTER' ? '#111827' : '#6B7280',
              boxShadow: mode === 'REGISTER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            Daftar Baru
          </button>
          <button
            type="button"
            onClick={() => { setMode('LOGIN_WA'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 0,
              borderRadius: 8,
              font: '700 13px/1.2 var(--font-sans)',
              background: mode === 'LOGIN_WA' ? '#FFFFFF' : 'transparent',
              color: mode === 'LOGIN_WA' ? '#111827' : '#6B7280',
              boxShadow: mode === 'LOGIN_WA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            WhatsApp
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #FCA5A5',
              background: '#FEF2F2',
              color: '#B91C1C',
              font: '500 13px/1.4 var(--font-sans)',
            }}
          >
            {error}
          </div>
        )}

        {/* 1. Login with Email & Password */}
        {mode === 'LOGIN_EMAIL' && (
          <form onSubmit={handleLoginEmail}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                Alamat Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                Kata Sandi
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 700,
              }}
            >
              {busy ? 'Memverifikasi...' : 'Masuk ke Ruang Belajar'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 18, font: '400 12.5px/1.4 var(--font-sans)', color: '#6B7280' }}>
              Belum punya akun peserta?{' '}
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setError(null); }}
                style={{ background: 'none', border: 0, color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Daftar sekarang
              </button>
            </p>
          </form>
        )}

        {/* 2. Register with Name, Email & Password */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                Nama Lengkap
              </label>
              <input
                className="input"
                type="text"
                placeholder="Nama Anda"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                Alamat Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="nama@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                Kata Sandi (minimal 6 karakter)
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                minLength={6}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                Nomor WhatsApp <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opsional)</span>
              </label>
              <input
                className="input"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                background: '#16A34A',
                color: '#FFFFFF',
                fontWeight: 700,
              }}
            >
              {busy ? 'Mendaftarkan...' : 'Daftar & Masuk ke Kelas'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 18, font: '400 12.5px/1.4 var(--font-sans)', color: '#6B7280' }}>
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={() => { setMode('LOGIN_EMAIL'); setError(null); }}
                style={{ background: 'none', border: 0, color: '#2563EB', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Masuk di sini
              </button>
            </p>
          </form>
        )}

        {/* 3. Login with WhatsApp (OTP fallback) */}
        {mode === 'LOGIN_WA' && (
          <div>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: '#6B7280', marginBottom: 16 }}>
              {waStep === 'PHONE'
                ? 'Masukkan nomor WhatsApp yang terdaftar saat membeli atau mengikuti program.'
                : 'Masukkan 6 digit kode verifikasi yang dikirim ke nomor WhatsApp Anda.'}
            </p>

            {waStep === 'PHONE' ? (
              <form onSubmit={handleWaRequest}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                    Nomor WhatsApp
                  </label>
                  <input
                    className="input"
                    inputMode="tel"
                    placeholder="08xxxxxxxxxx"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={busy}
                  style={{ width: '100%', padding: '12px', borderRadius: 8 }}
                >
                  {busy ? 'Mengirim kode...' : 'Kirim Kode via WhatsApp'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleWaVerify}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', font: '600 12.5px/1 var(--font-sans)', marginBottom: 6, color: '#374151' }}>
                    Kode 6 Digit
                  </label>
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={waCode}
                    onChange={(e) => setWaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    style={{ width: '100%', textAlign: 'center', fontSize: 20, letterSpacing: '0.2em' }}
                  />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  type="submit"
                  disabled={busy}
                  style={{ width: '100%', padding: '12px', borderRadius: 8 }}
                >
                  {busy ? 'Memeriksa...' : 'Verifikasi & Masuk'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => { setWaStep('PHONE'); setWaCode(''); }}
                    style={{ background: 'none', border: 0, color: '#6B7280', fontSize: 12, cursor: 'pointer' }}
                  >
                    Ganti nomor WhatsApp
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
