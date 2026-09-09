'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/auth';
import { Wordmark } from '@/components/ui';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setStatus('error');
        setErrorMessage('Token verifikasi tidak valid.');
        return;
      }
      const result = await verifyEmail(token);
      if (cancelled) return;
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Verifikasi email gagal.');
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
            Verifikasi email
          </h1>
        </div>

        <div style={{ background: 'var(--surface)', border: 'var(--sep-strong)', padding: 22 }}>
          {status === 'loading' && <p style={{ font: '400 13px/1.5 var(--font-sans)' }}>Memverifikasi...</p>}
          {status === 'success' && (
            <p role="status" style={{ font: '400 13px/1.5 var(--font-sans)' }}>
              Email terverifikasi. Silakan <a href="/login">masuk</a>.
            </p>
          )}
          {status === 'error' && (
            <p role="alert" className="field-error">
              {errorMessage} Minta link baru dengan mendaftar ulang atau hubungi administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--canvas)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Memuat...</div>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
