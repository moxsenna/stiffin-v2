'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TALIRA_PLANS } from '@promotor/contracts';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const freePlan = TALIRA_PLANS.FREE;
  const soloPlan = TALIRA_PLANS.SOLO;

  return (
    <section
      id="harga"
      style={{
        paddingTop: '64px',
        paddingBottom: '72px',
        backgroundColor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div className="container">
        <div style={{ maxWidth: '780px', margin: '0 auto 36px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              marginBottom: '10px',
            }}
          >
            Satu Langganan, Dua Solusi Terpadu
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              letterSpacing: '-0.04em',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '14px',
              color: 'var(--color-text-main)',
            }}
          >
            Investasi transparan untuk pertumbuhan bisnis edukasi Anda.
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Talira adalah satu ekosistem: <strong>Talira Class</strong> (LMS & Program Edukasi) dan <strong>Talira Flow</strong> (CRM & Pipeline Prospek) sudah termasuk bersama dalam satu paket.
          </p>

          {/* Billing Cycle Switcher */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-divider)',
              borderRadius: '12px',
              padding: '4px',
              marginTop: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 0,
                backgroundColor: billingCycle === 'monthly' ? 'var(--color-primary)' : 'transparent',
                color: billingCycle === 'monthly' ? '#FFFFFF' : 'var(--color-text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 0,
                backgroundColor: billingCycle === 'annual' ? 'var(--color-primary)' : 'transparent',
                color: billingCycle === 'annual' ? '#FFFFFF' : 'var(--color-text-muted)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Tahunan <span style={{ fontSize: '11px', opacity: 0.9 }}>· Hemat 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            maxWidth: '920px',
            margin: '0 auto',
            alignItems: 'stretch',
          }}
        >
          {/* Plan 1: Free */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid var(--color-divider)',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                Talira Free
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                Mulai validasi materi edukasi pengantar Anda tanpa biaya investasi awal.
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
                <span style={{ fontSize: '36px', fontWeight: 850, color: 'var(--color-text-main)' }}>Rp0</span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>/ gratis selamanya</span>
              </div>

              {/* Feature List */}
              <div style={{ display: 'grid', gap: '12px', borderTop: '1px solid var(--color-divider)', paddingTop: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  1 Program Terpublikasi Aktif
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Hingga 50 Peserta Belajar Aktif
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Hingga 250 Kontak CRM
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Form Refleksi & Video Player Mobile
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Koneksi Terpadu Talira Class & Flow
                </div>
              </div>
            </div>

            <Link
              href="/login"
              style={{
                width: '100%',
                minHeight: '48px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-text-main)',
                border: '1px solid var(--color-divider)',
                fontWeight: 750,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease',
              }}
            >
              Mulai Gratis Sekarang
            </Link>
          </div>

          {/* Plan 2: Solo (Highlighted) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '2px solid var(--color-primary)',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 36px rgba(40, 99, 68, 0.12)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-13px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 14px',
                borderRadius: '999px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Rekomendasi Utama
            </div>

            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '6px' }}>
                Talira Solo
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                Untuk promotor aktif yang ingin menjual kelas berbayar dan mengelola multi-program edukasi.
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: 850, color: 'var(--color-primary)' }}>
                  {billingCycle === 'annual' ? 'Rp 1.490.000' : 'Rp 149.000'}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {billingCycle === 'annual' ? '/ tahun' : '/ bulan'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#6B7280', marginBottom: '24px' }}>
                + Rp3.000 flat per transaksi kelas berbayar (0% komisi persentase)
              </div>

              {/* Feature List */}
              <div style={{ display: 'grid', gap: '12px', borderTop: '1px solid var(--color-divider)', paddingTop: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 700 }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Buka Penjualan Kelas Berbayar
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Hingga 10 Program Terpublikasi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Hingga 500 Peserta Belajar Aktif
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Hingga 2.500 Kontak CRM Terhubung
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Kustomisasi Tema & Branding Storefront
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--color-text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                  Siklus Ekosistem Penuh (Class + Flow)
                </div>
              </div>
            </div>

            <Link
              href="/login"
              style={{
                width: '100%',
                minHeight: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                transition: 'background-color 0.15s ease',
              }}
            >
              Mulai Paket Solo Sekarang
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
