'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckIcon } from '../foundation/icons';

export const FlowPricingSection: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const plans = [
    {
      name: 'Promotor Mandiri',
      badge: null,
      description: 'Untuk promotor solo yang ingin merapikan pipeline dan meningkatkan konversi tes.',
      priceMonthly: 149000,
      priceAnnualPerMonth: 99000,
      features: [
        'Kontak CRM & Prospek Tanpa Batas',
        'Antrean Eksekusi Harian (Today Work Queue)',
        'Tombol 1-Tap Kirim Pesan WhatsApp',
        'Halaman Booking Publik 14-Hari (On-Site & Home Visit)',
        'Siklus Otomatis Aftercare D+7',
        'Katalog Template Pesan WhatsApp Kustom',
        'Dukungan WebApp PWA Mobile & Desktop',
      ],
      popular: false,
      ctaText: 'Mulai Uji Coba Gratis 14 Hari',
      href: '/app',
    },
    {
      name: 'Ekosistem Lengkap (Flow + Class)',
      badge: 'Paling Populer & Hemat',
      description: 'Solusi lengkap integrasi CRM operasional harian + Client Education OS PromotorClass.',
      priceMonthly: 299000,
      priceAnnualPerMonth: 199000,
      features: [
        'Seluruh Fitur PromotorFlow Mandiri',
        'Integrasi Penuh PromotorClass (LMS Edukasi Klien)',
        'Deteksi Sinyal Intent Belajar Real-Time (Hot / Warm / Cold)',
        'Storefront Katalog Program & Modul Refleksi',
        'Sertifikat Kelulusan & Booking Tes Lanjutan Terkoneksi',
        'Sinkronisasi Status Pembayaran & Referral Klien',
        'Prioritas Pembaruan Fitur & Dukungan Teknis',
      ],
      popular: true,
      ctaText: 'Pilih Paket Ekosistem Lengkap',
      href: '/app',
    },
    {
      name: 'Cabang & Organisasi',
      badge: null,
      description: 'Untuk kantor cabang atau yayasan dengan banyak promotor dan tim admin.',
      priceMonthly: 699000,
      priceAnnualPerMonth: 499000,
      features: [
        'Hingga 5 Akun Promotor / Konsultan Aktif',
        'Penyaluran Lead Otomatis ke Tim Promotor',
        'Dashboard Analisis Kinerja Cabang Terpusat',
        'Kustomisasi Branding Cabang & Logo',
        'Export Laporan Keuangan & Rekap Sesi Tes',
        'Dedicated WhatsApp Onboarding & Pelatihan Tim',
      ],
      popular: false,
      ctaText: 'Hubungi Konsultasi Cabang',
      href: '/app',
    },
  ];

  return (
    <section
      id="harga"
      style={{
        padding: '80px 24px',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 40px' }}>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
              marginBottom: '14px',
              lineHeight: 1.2,
            }}
          >
            Investasi Terjangkau dengan ROI yang Langsung Terasa
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Hanya butuh 1 tambahan klien tes STIFIn per bulan untuk menutup seluruh biaya langganan PromotorFlow.
          </p>

          {/* Billing Cycle Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border-strong)',
              padding: '4px',
              marginTop: '24px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: billingCycle === 'monthly' ? 'var(--color-primary)' : 'transparent',
                color: billingCycle === 'monthly' ? '#FFFFFF' : 'var(--color-text-secondary)',
                border: 'none',
                fontWeight: 780,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) ease',
              }}
            >
              Bulanan
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: billingCycle === 'annual' ? 'var(--color-primary)' : 'transparent',
                color: billingCycle === 'annual' ? '#FFFFFF' : 'var(--color-text-secondary)',
                border: 'none',
                fontWeight: 780,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all var(--duration-fast) ease',
              }}
            >
              <span>Tahunan</span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  backgroundColor: billingCycle === 'annual' ? 'rgba(255,255,255,0.25)' : 'var(--color-primary-light)',
                  color: billingCycle === 'annual' ? '#FFFFFF' : 'var(--color-primary)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                Hemat 33%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.priceAnnualPerMonth : plan.priceMonthly;
            return (
              <div
                key={plan.name}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-xl)',
                  border: plan.popular ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                  padding: '36px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '24px',
                  position: 'relative',
                  boxShadow: plan.popular ? 'var(--shadow-lg)' : 'var(--shadow-xs)',
                  transform: plan.popular ? 'scale(1.02)' : 'none',
                  transition: 'transform var(--duration-fast) ease',
                }}
              >
                <div>
                  {plan.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '4px 14px',
                        backgroundColor: 'var(--color-primary)',
                        color: '#FFFFFF',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        boxShadow: 'var(--shadow-sm)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ★ {plan.badge}
                    </div>
                  )}

                  <h3 style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    {plan.name}
                  </h3>

                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
                    {plan.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Rp</span>
                    <span className="tabular-nums" style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                      {price.toLocaleString('id-ID')}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>/bulan</span>
                  </div>

                  {billingCycle === 'annual' && (
                    <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '20px' }}>
                      Ditagih tahunan (Rp {(price * 12).toLocaleString('id-ID')} / thn)
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.45 }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={plan.href}
                  className="touch-target-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: plan.popular ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                    color: plan.popular ? '#FFFFFF' : 'var(--color-text-primary)',
                    border: plan.popular ? 'none' : '1px solid var(--color-border-strong)',
                    fontWeight: 800,
                    fontSize: '14px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: plan.popular ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {plan.ctaText} →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
