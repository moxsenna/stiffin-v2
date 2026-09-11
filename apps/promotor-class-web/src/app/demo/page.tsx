'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { setActiveLearnerSession } from '@/lib/session';
import { Wordmark } from '@/components/ui';

export default function DemoAccessPage() {
  const router = useRouter();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleInstantPromotorLogin = async (redirectPath = '/app') => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await signIn('rina@stifin.id', 'password123');
      if (res.success) {
        router.push(redirectPath);
      } else {
        setLoginError(res.error || 'Gagal login otomatis.');
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Terjadi kesalahan sistem.');
      setIsLoggingIn(false);
    }
  };

  const handleLearnerLogin = (contactId: string, redirectPath: string) => {
    setActiveLearnerSession({ contactId, workspaceSlug: 'rina' });
    router.push(redirectPath);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        padding: '36px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        {/* Navigation & Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Wordmark class={true} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href="/p/rina"
              target="_blank"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#2563eb',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Lihat Storefront Publik ↗
            </Link>
            <Link
              href="/"
              style={{
                fontSize: 13,
                fontWeight: 650,
                color: '#64748b',
                textDecoration: 'none',
                padding: '6px 12px',
              }}
            >
              ← Beranda
            </Link>
          </div>
        </div>

        {/* Page Title & Intro */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
              marginBottom: 10,
            }}
          >
            Pusat Eksplorasi Demo Lengkap
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0 }}>
            Seluruh Potensi Ralivo dalam Satu Akun Demo
          </h1>
          <p style={{ fontSize: 15, color: '#475569', marginTop: 10, lineHeight: 1.6 }}>
            Akun ini telah diisi data operasional nyata: mulai dari <strong>Cockpit Sinyal Belajar</strong>, <strong>Katalog 4 Program & Multi-Tier Pricing</strong>, <strong>Pesanan & Omzet Rp 1.946.000</strong>, <strong>Voucher Diskon</strong>, <strong>Pengingat WhatsApp 1-Tap</strong>, hingga <strong>Sertifikat Digital Terverifikasi</strong>.
          </p>
        </div>

        {/* SECTION 1: AKUN PROMOTOR (COCKPIT DASHBOARD) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '26px',
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                💼
              </div>
              <div>
                <h2 style={{ fontSize: 19, fontWeight: 850, margin: 0 }}>Akun Promotor (Cockpit / Dashboard)</h2>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  Akses penuh sebagai <strong>Owner (Promotor Berlisensi STIFIn)</strong>
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 20,
                backgroundColor: '#dcfce7',
                color: '#15803d',
              }}
            >
              ● Status: SOLO Aktif
            </span>
          </div>

          {/* Credentials Display */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              marginBottom: 18,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid #e2e8f0',
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Email Promotor:</span>{' '}
                <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>rina@stifin.id</strong>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('rina@stifin.id', 'email')}
                style={{
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copiedKey === 'email' ? 'Tersalin ✓' : 'Salin'}
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid #e2e8f0',
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Kata Sandi:</span>{' '}
                <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>password123</strong>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('password123', 'password')}
                style={{
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copiedKey === 'password' ? 'Tersalin ✓' : 'Salin'}
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                fontSize: 13,
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Workspace Slug:</span>{' '}
                <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>rina</strong>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('rina', 'slug')}
                style={{
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copiedKey === 'slug' ? 'Tersalin ✓' : 'Salin'}
              </button>
            </div>
          </div>

          {loginError && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              {loginError}
            </div>
          )}

          {/* Action Button Primary */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={() => handleInstantPromotorLogin('/app')}
              style={{
                padding: '12px 22px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 750,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
            >
              ⚡ {isLoggingIn ? 'Memproses Masuk...' : 'Masuk 1-Tap ke Dashboard Promotor'}
            </button>
          </div>

          {/* Quick Deep Links to features inside Cockpit */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Jelajahi Langsung Modul Cockpit:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <button
                type="button"
                onClick={() => handleInstantPromotorLogin('/app')}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 650,
                  color: '#0f172a',
                }}
              >
                📊 <strong>Beranda</strong>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Sinyal minat HOT & peserta macet</div>
              </button>

              <button
                type="button"
                onClick={() => handleInstantPromotorLogin('/app/programs')}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 650,
                  color: '#0f172a',
                }}
              >
                📚 <strong>Program (4 Program)</strong>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Multi-tier pricing & kurikulum</div>
              </button>

              <button
                type="button"
                onClick={() => handleInstantPromotorLogin('/app/learners')}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 650,
                  color: '#0f172a',
                }}
              >
                👥 <strong>Peserta & Follow-up</strong>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Filter HOT/WARM/COLD & WA</div>
              </button>

              <button
                type="button"
                onClick={() => handleInstantPromotorLogin('/app/orders')}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 650,
                  color: '#0f172a',
                }}
              >
                💳 <strong>Pesanan & Omzet</strong>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Omzet Rp 1.946.000 lunas</div>
              </button>

              <button
                type="button"
                onClick={() => handleInstantPromotorLogin('/app/coupons')}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 650,
                  color: '#0f172a',
                }}
              >
                🏷️ <strong>Kupon Diskon (4 Kupon)</strong>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>DISKON50, AYAHHEBAT, dsb</div>
              </button>

              <button
                type="button"
                onClick={() => handleInstantPromotorLogin('/app/activity')}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 650,
                  color: '#0f172a',
                }}
              >
                📝 <strong>Aktivitas & Refleksi</strong>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>Jejak jawaban refleksi peserta</div>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: AKUN PESERTA (PENGALAMAN PESERTA) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '26px',
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🎓
            </div>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 850, margin: 0 }}>Pengalaman Belajar Peserta (Aplikasi Peserta)</h2>
              <div style={{ fontSize: 13, color: '#475569' }}>
                Simulasikan pengalaman belajar mobile tanpa ribet password, video interaktif, dan refleksi pengunci.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14 }}>
            {/* Ayu Lestari */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 15 }}>Ayu Lestari</strong>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                    }}
                  >
                    Progres 33% (HOT 85%)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  WhatsApp: <strong>081987654321</strong>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                  Program: <em>7 Hari Mengenal Cara Belajar Anak</em>
                  <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 11.5, color: '#1e293b' }}>
                    &ldquo;Anak pertama Sensing, anak kedua Thinking...&rdquo;
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleLearnerLogin('1eb44a72-df9d-48f2-90f3-808aee17a790', '/learn')}
                style={{
                  padding: '9px 14px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 750,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ▶ Masuk Sebagai Ayu (/learn)
              </button>
            </div>

            {/* Budi Santoso (Graduated + Certificate) */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 15 }}>Budi Santoso</strong>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: '#ecfdf5',
                      color: '#059669',
                    }}
                  >
                    Progres 100% (Lulus)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  WhatsApp: <strong>081298765432</strong>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                  Sertifikat Terbit: <strong style={{ fontFamily: 'monospace' }}>STIFIN-2026-CERT-001</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleLearnerLogin('6ef2f46c-73fc-4507-bbe4-6ceb420d6b03', '/learn')}
                  style={{
                    flex: 1,
                    padding: '9px 10px',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  ▶ Ruang Belajar
                </button>
                <Link
                  href="/verify/STIFIN-2026-CERT-001"
                  target="_blank"
                  style={{
                    flex: 1,
                    padding: '9px 10px',
                    backgroundColor: '#ffffff',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  📜 Sertifikat ↗
                </Link>
              </div>
            </div>

            {/* Dewi Sartika (At-Risk) */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 15 }}>Dewi Sartika</strong>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                    }}
                  >
                    Macet 4 Hari (15%)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  WhatsApp: <strong>081311223344</strong>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                  Program: <em>Mentoring STIFIn Parenting</em> (Macet di modul 1, sasaran 1-tap nudge WhatsApp).
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleLearnerLogin('f8ac7229-af8e-44f8-bbe1-eb5461179a2a', '/learn')}
                style={{
                  padding: '9px 14px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 750,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ▶ Masuk Sebagai Dewi (/learn)
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: STOREFRONT & HALAMAN PUBLIK */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '26px',
            marginBottom: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(234, 88, 12, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🏪
            </div>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 850, margin: 0 }}>Toko Online & Halaman Publik Promotor</h2>
              <div style={{ fontSize: 13, color: '#475569' }}>
                Halaman publik resmi siap jual yang bisa langsung dibagikan ke calon peserta / klien WhatsApp.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14 }}>
            {/* Storefront Utama */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '18px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: 4 }}>
                Storefront Resmi Promotor
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>STIFIn Promotor Jakarta</h3>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
                Profil profesional berlisensi, rating 4.9, 250+ keluarga terbantu, kontak WhatsApp, dan katalog program lengkap.
              </p>
              <Link
                href="/p/rina"
                target="_blank"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 750,
                  textDecoration: 'none',
                }}
              >
                Buka Storefront (/p/rina) ↗
              </Link>
            </div>

            {/* Landing Page Program Flagship with Multi-Tier */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '18px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', marginBottom: 4 }}>
                Multi-Tier Pricing & Checkout
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>Mentoring STIFIn Parenting</h3>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
                Program berbayar dengan 3 pilihan paket: Paket Basic (Rp 199rb), Paket Lengkap (Rp 499rb), dan VIP Family (Rp 999rb).
              </p>
              <Link
                href="/p/rina/mentoring-stifin-parenting-eksklusif"
                target="_blank"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 750,
                  textDecoration: 'none',
                }}
              >
                Buka Landing Page & Harga ↗
              </Link>
            </div>

            {/* Landing Page Free Lead Magnet */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '18px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: 4 }}>
                Lead Magnet Penangkap Kontak
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>7 Hari Mengenal Cara Belajar</h3>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px', lineHeight: 1.5 }}>
                Program gratis 7 hari untuk mengumpulkan nomor WhatsApp orang tua potensial secara otomatis.
              </p>
              <Link
                href="/p/rina/7-hari-mengenal-cara-belajar-anak"
                target="_blank"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 750,
                  textDecoration: 'none',
                }}
              >
                Buka Halaman Kursus ↗
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 4: RINGKASAN KAPABILITAS */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '26px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 850, margin: '0 0 16px' }}>Apa Saja yang Bisa Anda Buat & Lakukan di Ralivo?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ padding: '12px', borderLeft: '3px solid #2563eb', backgroundColor: '#f8fafc', borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>🎯 Multi-Tier & Bundling</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Jual kelas dengan beberapa varian paket (Basic, Best Seller, VIP) plus bundling tes sidik jari.
              </div>
            </div>

            <div style={{ padding: '12px', borderLeft: '3px solid #10b981', backgroundColor: '#f8fafc', borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>💬 Sinyal Minat AI & WA Follow-up</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Deteksi otomatis peserta HOT dari jawaban refleksi & follow-up langsung via template WhatsApp 1-tap.
              </div>
            </div>

            <div style={{ padding: '12px', borderLeft: '3px solid #f59e0b', backgroundColor: '#f8fafc', borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>⚡ Broadcast Peserta Macet</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Kirim pesan penyemangat ramah ke peserta yang terhenti belajarnya dalam 1 kali klik.
              </div>
            </div>

            <div style={{ padding: '12px', borderLeft: '3px solid #8b5cf6', backgroundColor: '#f8fafc', borderRadius: '0 8px 8px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>📜 Sertifikat Digital Publik</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Terbitkan sertifikat resmi otomatis dengan nomor seri unik yang bisa dicek keasliannya secara publik.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
