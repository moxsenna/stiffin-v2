'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#F8FAFC',
          color: '#0F172A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          !
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Sistem Sedang Mengalami Kendala
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '400px', marginBottom: '24px' }}>
          {error?.message || 'Terjadi kesalahan sistem yang tidak terduga.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Muat Ulang Aplikasi
        </button>
      </body>
    </html>
  );
}
