'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getPublicStorefrontRepository } from '@/adapters';
import { resetDemoStateCommand } from '@/modules/developer/commands';
import { isReferralPrototypeEnabled } from '@/lib/feature-flags';
import { getSession, signOut, changePassword, UserSession } from '@/lib/auth';
import { PaymentSettingsSection } from '@/components/promotor/PaymentSettingsSection';

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [storefrontProfile, setStorefrontProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });

  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    Promise.all([
      getSession(),
      getPublicStorefrontRepository().getStorefrontProfile(),
    ])
      .then(([sess, prof]) => {
        setSession(sess);
        if (prof) setStorefrontProfile(prof);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Semua kolom kata sandi wajib diisi.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Kata sandi baru minimal harus 8 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    setPasswordStatus({ type: 'loading' });
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordStatus({ type: 'success', message: 'Kata sandi Anda berhasil diperbarui.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordStatus({ type: 'idle' }), 5000);
      } else {
        setPasswordStatus({ type: 'error', message: res.error || 'Gagal mengubah kata sandi.' });
      }
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: err?.message || 'Terjadi kesalahan sistem saat memperbarui kata sandi.' });
    }
  };

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
            PENGATURAN AKUN
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '4px' }}>
            Pengaturan Akun &amp; Workspace
          </h1>
          <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
            Kelola profil operator, keamanan kata sandi, preferensi workspace, dan kontak bantuan support.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KARTU 1: Profil & Identitas Operator */}
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
                Akun Utama
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Nama Lengkap
                </div>
                <div style={{ fontSize: '14px', fontWeight: 750 }}>{userName}</div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', border: '1px solid var(--color-divider)' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Email Login
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
                  Tautan Publik
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>/p/{workspaceSlug}</div>
              </div>
            </div>
          </div>

          {/* KARTU 2: Metode Pembayaran & Rekening Bank */}
          <PaymentSettingsSection />

          {/* KARTU 3: Keamanan & Ubah Kata Sandi */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Keamanan &amp; Kata Sandi</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
              Perbarui kata sandi Anda secara berkala untuk menjaga keamanan data workspace dan peserta.
            </p>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '460px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
                  Kata Sandi Saat Ini:
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: 'var(--color-surface)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
                  Kata Sandi Baru:
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: 'var(--color-surface)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
                  Konfirmasi Kata Sandi Baru:
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: 'var(--color-surface)',
                  }}
                />
              </div>

              {passwordStatus.type === 'error' && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(225, 29, 72, 0.08)',
                    border: '1px solid var(--color-status-danger, #e11d48)',
                    color: 'var(--color-status-danger, #e11d48)',
                    fontSize: '13px',
                    fontWeight: 650,
                  }}
                >
                  ✕ {passwordStatus.message}
                </div>
              )}

              {passwordStatus.type === 'success' && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#eef8f2',
                    border: '1px solid #b8d4c5',
                    color: '#166534',
                    fontSize: '13px',
                    fontWeight: 650,
                  }}
                >
                  ✓ {passwordStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={passwordStatus.type === 'loading'}
                className="touch-target-primary"
                style={{
                  marginTop: '4px',
                  padding: '0 20px',
                  backgroundColor: 'var(--accent-dark)',
                  color: '#FFFFFF',
                  borderRadius: '0px',
                  border: 'none',
                  fontWeight: 750,
                  fontSize: '13.5px',
                  cursor: passwordStatus.type === 'loading' ? 'wait' : 'pointer',
                  height: '42px',
                  alignSelf: 'flex-start',
                }}
              >
                {passwordStatus.type === 'loading' ? 'Menyimpan Kata Sandi...' : 'Perbarui Kata Sandi'}
              </button>
            </form>
          </div>

          {/* KARTU 3: Bantuan & Kontak Support */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Bantuan &amp; Layanan Dukungan</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Butuh panduan operasional atau mengalami kendala teknis? Tim dukungan Talira Class siap mendampingi Anda.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>💬</span>
                    <span style={{ fontSize: '14px', fontWeight: 780 }}>WhatsApp Helpdesk</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                    Konsultasi langsung dengan tim teknis &amp; pendampingan operasional promotor.
                  </div>
                </div>

                <a
                  href="https://wa.me/6281234567890?text=Halo%20Tim%20Support%20Talira%20Class,%20saya%20membutuhkan%20bantuan."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#eef8f2',
                    border: '1px solid #b8d4c5',
                    color: '#166534',
                    fontSize: '13px',
                    fontWeight: 750,
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'inline-block',
                  }}
                >
                  Hubungi via WhatsApp ↗
                </a>
              </div>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-bg-subtle, #f8fafc)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>✉️</span>
                    <span style={{ fontSize: '14px', fontWeight: 780 }}>Email Dukungan Resmi</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                    Kirim pertanyaan, masukan fitur, atau laporan masalah ke email resmi kami.
                  </div>
                </div>

                <a
                  href="mailto:support@stifin.id?subject=Bantuan%20Talira%20Class"
                  style={{
                    padding: '8px 14px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    color: 'var(--color-text-main)',
                    fontSize: '13px',
                    fontWeight: 750,
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'inline-block',
                  }}
                >
                  support@stifin.id ↗
                </a>
              </div>
            </div>
          </div>

          {/* KARTU 4: Storefront & Branding Publik (Akses Cepat) */}
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
                  Kustomisasi identitas visual, logo brand, tema warna, dan narasi bio publik Anda.
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
                {storefrontProfile?.avatarUrl ? '✓ Foto Profil Terpasang' : '• Menggunakan Avatar Default'}
              </div>
            </div>
          </div>

          {/* KARTU 5: Program Referral Promotor (Jika Aktif) */}
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

          {/* KARTU 6: Akun & Sesi */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '0px',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>Sesi Login &amp; Keluar</h2>
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

          {/* KARTU 7: Reset Data Demo (Dev Only) */}
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
