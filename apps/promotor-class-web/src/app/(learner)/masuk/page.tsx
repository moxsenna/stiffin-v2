'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getPlatformApiClient } from '@/adapters';
import { setActiveLearnerSession } from '@/lib/session';

export default function LearnerLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'PHONE' | 'CODE'>('PHONE');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = getPlatformApiClient();
      await api.requestLearnerOtp(phone);
      setStep('CODE');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim kode. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = getPlatformApiClient();
      const res = await api.verifyLearnerOtp(phone, code);
      setActiveLearnerSession({ contactId: res.contactId, workspaceSlug: res.workspaceSlug });
      router.push('/learn');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kode salah atau kedaluwarsa.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LearnerShell title="Masuk">
      <div style={{ padding: 16 }}>
        <h1 style={{ font: '700 20px/1.3 var(--font-sans)' }}>Masuk dengan Nomor WhatsApp</h1>
        <p className="kicker kicker-muted" style={{ marginTop: 4 }}>
          {step === 'PHONE'
            ? 'Masukkan nomor yang Anda pakai saat mendaftar kelas.'
            : 'Masukkan 6 digit kode yang dikirim via WhatsApp.'}
        </p>
        {error && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: 12,
              border: '1px solid #dc2626',
              color: '#dc2626',
              font: '400 13px/1.5 var(--font-sans)',
            }}
          >
            {error}
          </div>
        )}
        {step === 'PHONE' ? (
          <form onSubmit={handleRequest}>
            <input
              className="input"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-label="Nomor WhatsApp"
              required
            />
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? 'Mengirim...' : 'Kirim Kode via WhatsApp'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <input
              className="input"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              aria-label="Kode verifikasi"
              required
            />
            <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? 'Memeriksa...' : 'Masuk ke Kelas Saya'}
            </button>
            <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setStep('PHONE')}>
              Ganti nomor
            </button>
          </form>
        )}
      </div>
    </LearnerShell>
  );
}
