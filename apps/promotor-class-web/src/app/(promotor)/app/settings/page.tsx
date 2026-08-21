'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getIntegrationHealthQuery } from '@/modules/promotorflow/queries';
import { resetDemoStateCommand } from '@/modules/developer/commands';
import { IntegrationHealth } from '@promotor/contracts';
import { StorefrontSettingsClient } from '@/components/promotor/StorefrontSettingsClient';
import { isReferralPrototypeEnabled } from '@/lib/feature-flags';
import { signOut } from '@/lib/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [health, setHealth] = useState<IntegrationHealth>({ promotorFlow: 'AVAILABLE' });
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    getIntegrationHealthQuery().then(setHealth);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const handleResetDemo = async () => {
    if (confirm('Apakah Anda yakin ingin meriset seluruh data demo ke kondisi awal (seeds)?')) {
      await resetDemoStateCommand();
      window.location.reload();
    }
  };

  return (
    <PromotorShell>
      <div style={{ padding: '20px 16px', maxWidth: '840px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '2px' }}>
            Pengaturan & Lainnya
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Kelola branding storefront publik, profil promotor, dan status koneksi sistem
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Main Storefront Settings Section */}
          <StorefrontSettingsClient />

          {/* Program Referral Entry Card (Prototype Gate) */}
          {isReferralPrototypeEnabled() && (
            <div
              style={{
                padding: '20px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '18px',
                border: '1px solid var(--color-divider)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Program Referral Promotor</h3>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Pantau performa referral learner, leaderboard referrer teraktif, dan audit sinyal risiko.
                  </div>
                </div>
                <Link
                  href="/app/referrals"
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    borderRadius: '10px',
                    fontWeight: 750,
                    fontSize: '13px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Buka Referral →
                </Link>
              </div>
            </div>
          )}

          {/* Integration Health Card */}
          <div
            style={{
              padding: '20px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '18px',
              border: '1px solid var(--color-divider)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Koneksi PromotorFlow</h3>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Menghubungkan sinyal belajar peserta dengan sistem aksi PromotorFlow
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #b8d4c5',
                backgroundColor: 'var(--color-primary-light)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-primary)',
              }}
            >
              <div>Status Integrasi: {health.promotorFlow === 'AVAILABLE' ? '✓ Aktif Terhubung' : 'Terpisah'}</div>
            </div>
          </div>

          {/* Reset Demo State (Development Only) */}
          {isDev && (
            <div
              style={{
                padding: '20px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '18px',
                border: '1px solid var(--color-divider)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px', color: 'var(--color-status-danger)' }}>
                Reset Data Demo
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                Kembalikan seluruh data ke kondisi seed awal.
              </p>
              <button
                onClick={handleResetDemo}
                className="touch-target-primary"
                style={{
                  padding: '0 20px',
                  border: '1px solid var(--color-status-danger)',
                  backgroundColor: 'var(--color-status-danger-bg)',
                  color: 'var(--color-status-danger)',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                }}
              >
                Reset State Demo
              </button>
            </div>
          )}

          {/* Logout Action Card */}
          <div
            style={{
              padding: '20px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '18px',
              border: '1px solid var(--color-divider)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Akun & Sesi</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Keluar dari sesi PromotorClass pada perangkat ini.
            </p>
            <button
              onClick={handleLogout}
              className="touch-target-primary"
              style={{
                padding: '0 20px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-status-danger)',
                borderRadius: '12px',
                fontWeight: 750,
                cursor: 'pointer',
                fontSize: '13.5px',
              }}
            >
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    </PromotorShell>
  );
}
