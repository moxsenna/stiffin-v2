'use client';

import React, { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root application error:', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
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
        Terjadi Kesalahan Tampilan
      </h2>
      <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '400px', marginBottom: '24px' }}>
        {error?.message || 'Halaman mengalami kendala saat memuat data.'}
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
        Coba Muat Ulang
      </button>
    </div>
  );
}
