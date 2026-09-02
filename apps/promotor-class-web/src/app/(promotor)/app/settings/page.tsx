'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getIntegrationHealthQuery } from '@/modules/promotorflow/queries';
import { getPublicStorefrontRepository } from '@/adapters';
import { resetDemoStateCommand } from '@/modules/developer/commands';
import { IntegrationHealth } from '@promotor/contracts';
import { isReferralPrototypeEnabled } from '@/lib/feature-flags';
import { getSession, signOut, UserSession } from '@/lib/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [health, setHealth] = useState<IntegrationHealth>({ promotorFlow: 'AVAILABLE' });
  const [storefrontProfile, setStorefrontProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    Promise.all([
      getSession(),
      getIntegrationHealthQuery(),
      getPublicStorefrontRepository().getStorefrontProfile(),
    ])
      .then(([sess, h, prof]) => {
        setSession(sess);
        if (h) setHealth(h);
        if (prof) setStorefrontProfile(prof);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      await signOut();
      router.push('/login');
    }
  };

  const handleResetDemo = async () => {
    if (confirm('Apakah Anda yakin ingin meriset seluruh data demo ke kondisi awal (seeds)?')) {
      await resetDemoStateCommand();
      window.location.reload();
    }
  };

  const orgName = session?.organization?.name || 'Workspace Promotor';
  const userName = session?.user?.name || 'Promotor';
  const userEmail = session?.user?.email || 'promotor@stifin.id';
  const workspaceSlug = storefrontProfile?.workspaceSlug || session?.organization?.slug || 'demo-promotor';
  const brandName = storefrontProfile?.theme?.brandName || storefrontProfile?.displayName || orgName;

  return (
    <PromotorShell>
      <div style={{ padding: '24px 16px', maxWidth: '840px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-dark)', marginBottom: '4px' }}>
            PENGATURAN SISTEM
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '4px' }}>
            Pengaturan Workspace &amp; Akun
          </h1>
          <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
            Kelola identitas operator, konfigurasi sistem, status integrasi, dan preferensi akun Talira Class.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KARTU 1: Identitas Akun & Workspace Operator */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 780, margin: 0 }}>Profil &amp; Identitas Operator</h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 750,
                  padding: '3px 8px',
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-divider)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Operator Shell
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Nama Operator
                </div>
                <div style={{ fontSize: '14px', fontWeight: 750 }}>{userName}</div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Email Akun
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{userEmail}</div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Workspace / Organisasi
                </div>
                <div style={{ fontSize: '14px', fontWeight: 750 }}>{orgName}</div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Workspace Slug
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>/p/{workspaceSlug}</div>
              </div>
            </div>
          </div>

          {/* KARTU 2: Storefront & Branding Publik (Akses Cepat & Status) */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Storefront Publik &amp; Brand Customization</h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Kustomisasi identitas visual, logo, tema warna, dan narasi bio storefront Anda berada di halaman khusus Storefront.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link
                  href={`/p/${workspaceSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-surface)',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  Lihat Publik ↗
                </Link>

                <Link
                  href="/app/storefront"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '0px',
                    backgroundColor: 'var(--accent-dark)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 750,
                    textDecoration: 'none',
                  }}
                >
                  Buka Editor Storefront →
                </Link>
              </div>
            </div>

            {/* Snapshot Ringkas Storefront */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                border: '1px solid var(--color-divider)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: storefrontProfile?.theme?.primaryColor || 'var(--accent-dark)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '15px',
                  }}
                >
                  {brandName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 750 }}>{brandName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Preset: {storefrontProfile?.theme?.stylePreset || 'MODERNIST'} · Font: {storefrontProfile?.theme?.fontPreset || 'ARCHIVO'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                {storefrontProfile?.avatarUrl ? '✓ Foto Profil R2 Terpasang' : '• Menggunakan Avatar Default'}
              </div>
            </div>
          </div>

          {/* KARTU 3: Program Referral Promotor (Jika Aktif) */}
          {isReferralPrototypeEnabled() && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '0px',
                border: '1px solid var(--color-divider)',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Program Referral Promotor</h2>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Pantau performa referral learner, leaderboard referrer teraktif, dan audit sinyal risiko.
                  </div>
                </div>
                <Link
                  href="/app/referrals"
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#ffe0d9',
                    color: 'var(--accent-dark)',
                    borderRadius: '0px',
                    fontWeight: 750,
                    fontSize: '13px',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Buka Dashboard Referral →
                </Link>
              </div>
            </div>
          )}

          {/* KARTU 4: Status Integrasi & Infrastruktur Cloudflare */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Status Integrasi &amp; Infrastruktur</h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Pemeriksaan status koneksi backend, penyimpanan aset R2, dan sinkronisasi sinyal PromotorFlow.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid #b8d4c5', backgroundColor: '#eef8f2' }}>
                <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 750, marginBottom: '2px' }}>
                  Cloudflare R2 Storage
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 750, color: '#14532d' }}>
                  ✓ Aktif &amp; Terhubung
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                  Aset cover &amp; foto profil WebP
                </div>
              </div>

              <div style={{ padding: '12px 14px', border: '1px solid #b8d4c5', backgroundColor: '#eef8f2' }}>
                <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 750, marginBottom: '2px' }}>
                  Hyperdrive DB Pooler
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 750, color: '#14532d' }}>
                  ✓ Operasional Normal
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                  PostgreSQL connection caching
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  border: health.promotorFlow === 'AVAILABLE' ? '1px solid #b8d4c5' : '1px solid var(--color-divider)',
                  backgroundColor: health.promotorFlow === 'AVAILABLE' ? '#eef8f2' : 'var(--color-bg-subtle, #f8fafc)',
                }}
              >
                <div style={{ fontSize: '11px', color: health.promotorFlow === 'AVAILABLE' ? '#166534' : 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 750, marginBottom: '2px' }}>
                  PromotorFlow Sinyal
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 750, color: health.promotorFlow === 'AVAILABLE' ? '#14532d' : 'var(--color-text-main)' }}>
                  {health.promotorFlow === 'AVAILABLE' ? '✓ Aktif Terhubung' : 'Terpisah'}
                </div>
                <div style={{ fontSize: '11px', color: health.promotorFlow === 'AVAILABLE' ? '#166534' : 'var(--color-text-muted)', marginTop: '2px' }}>
                  Sinkronisasi refleksi &amp; lead hot
                </div>
              </div>
            </div>
          </div>

          {/* KARTU 5: Akun & Sesi */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Keamanan &amp; Sesi Login</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Sesi terautentikasi aktif untuk <strong style={{ color: 'var(--color-text-main)' }}>{userEmail}</strong>.
            </p>
            <button
              onClick={handleLogout}
              type="button"
              className="touch-target-primary"
              style={{
                padding: '0 20px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-status-danger, #e11d48)',
                borderRadius: '0px',
                fontWeight: 750,
                cursor: 'pointer',
                fontSize: '13.5px',
                height: '42px',
              }}
            >
              Keluar dari Akun
            </button>
          </div>

          {/* KARTU 6: Reset Data Demo (Dev & Staging Only) */}
          {isDev && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '0px',
                border: '1px dashed var(--color-status-danger, #e11d48)',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px', color: 'var(--color-status-danger, #e11d48)' }}>
                Developer Tools: Reset Data Demo
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Kembalikan seluruh data program, learner, dan storefront demo ke kondisi seed awal.
              </p>
              <button
                onClick={handleResetDemo}
                type="button"
                className="touch-target-primary"
                style={{
                  padding: '0 20px',
                  border: '1px solid var(--color-status-danger, #e11d48)',
                  backgroundColor: 'rgba(225, 29, 72, 0.08)',
                  color: 'var(--color-status-danger, #e11d48)',
                  borderRadius: '0px',
                  fontWeight: 750,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  height: '42px',
                }}
              >
                Reset State Demo
              </button>
            </div>
          )}
        </div>
      </div>
    </PromotorShell>
  );
}
