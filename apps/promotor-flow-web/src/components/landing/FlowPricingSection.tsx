'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TALIRA_PLANS } from '@promotor/contracts';

export const FlowPricingSection: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [includeUpsell, setIncludeUpsell] = useState<boolean>(true);

  const baseMonthly = 99000;
  const baseAnnual = 990000;
  const upsellMonthly = 50000;
  const upsellAnnual = 200000;

  const currentPrice = includeUpsell
    ? (billingCycle === 'annual' ? baseAnnual + upsellAnnual : baseMonthly + upsellMonthly)
    : (billingCycle === 'annual' ? baseAnnual : baseMonthly);

  const formattedPrice = currentPrice.toLocaleString('id-ID');

  return (
    <section
      id="harga"
      style={{
        padding: '80px 24px',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 32px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-primary, #059669)',
              marginBottom: '10px',
            }}
          >
            Satu Langganan, Solusi Terpadu
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary, #111827)',
              marginBottom: '14px',
              lineHeight: 1.2,
            }}
          >
            Investasi Terjangkau dengan Hasil Nyata
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary, #4B5563)', lineHeight: 1.6 }}>
            Langganan Talira mencakup <strong>Talira Flow</strong> (CRM & Pipeline WhatsApp) dan <strong>Talira Class</strong> (LMS & Program Edukasi).
          </p>

          {/* Billing Cycle Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '14px',
              padding: '5px',
              marginTop: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                border: 0,
                backgroundColor: billingCycle === 'monthly' ? '#059669' : 'transparent',
                color: billingCycle === 'monthly' ? '#FFFFFF' : '#4B5563',
                fontWeight: 750,
                fontSize: '13.5px',
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
                padding: '9px 20px',
                borderRadius: '10px',
                border: 0,
                backgroundColor: billingCycle === 'annual' ? '#059669' : 'transparent',
                color: billingCycle === 'annual' ? '#FFFFFF' : '#4B5563',
                fontWeight: 750,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Tahunan</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 850,
                  backgroundColor: billingCycle === 'annual' ? '#FDE68A' : '#FEF08A',
                  color: '#854D0E',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  letterSpacing: '0.02em',
                }}
              >
                🔥 Hemat s/d 33%
              </span>
            </button>
          </div>
        </div>

        {/* Prominent Annual Savings Callout Banner */}
        {billingCycle === 'monthly' ? (
          <div
            onClick={() => {
              setBillingCycle('annual');
              setIncludeUpsell(true);
            }}
            style={{
              cursor: 'pointer',
              margin: '0 auto 36px',
              maxWidth: '820px',
              padding: '16px 22px',
              backgroundColor: '#FEFCE8',
              border: '2px solid #FACC15',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 14px rgba(234, 179, 8, 0.15)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <span style={{ fontSize: '28px', flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: '13.5px', color: '#713F12', lineHeight: 1.5 }}>
                <strong style={{ color: '#854D0E', fontSize: '14px', display: 'block', marginBottom: '2px' }}>
                  Ingin Jauh Lebih Hemat? Pilih Paket Tahunan!
                </strong>
                Upsell Paket Lengkap (Flow + Class) di opsi tahunan <strong>cukup tambah Rp 200.000/tahun</strong> (bukan 12 × Rp 50.000 = Rp 600.000). Total Anda hemat <strong>Rp 598.000/tahun</strong>!
              </div>
            </div>
            <button
              type="button"
              style={{
                flexShrink: 0,
                padding: '9px 16px',
                backgroundColor: '#854D0E',
                color: '#FFFFFF',
                borderRadius: '10px',
                border: 0,
                fontWeight: 800,
                fontSize: '12.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(133, 77, 14, 0.3)',
              }}
            >
              Lihat Paket Tahunan →
            </button>
          </div>
        ) : (
          <div
            style={{
              margin: '0 auto 36px',
              maxWidth: '820px',
              padding: '14px 20px',
              backgroundColor: '#ECFDF5',
              border: '2px solid #10B981',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
            }}
          >
            <span style={{ fontSize: '24px', flexShrink: 0 }}>🎉</span>
            <div style={{ fontSize: '13.5px', color: '#065F46', lineHeight: 1.5 }}>
              <strong style={{ color: '#047857', fontWeight: 800 }}>Tarif Super Hemat Tahunan Aktif:</strong> Paket Lengkap Flow + Class hanya <strong>Rp 1.190.000/tahun</strong> (setara ~Rp 99.000/bln). Anda menghemat <strong>Rp 598.000</strong> per tahun!
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'stretch',
          }}
        >
          {/* Card 1: Free */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E5E7EB',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
                Talira Free
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.5 }}>
                Mulai kelola prospek dan kenalkan materi edukasi pengantar Anda tanpa biaya investasi awal.
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
                <span style={{ fontSize: '36px', fontWeight: 850, color: '#111827' }}>Rp0</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>/ gratis selamanya</span>
              </div>

              <div style={{ display: 'grid', gap: '12px', borderTop: '1px solid #F3F4F6', paddingTop: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  Hingga 250 Kontak CRM
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  1 Program Kelas Terpublikasi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  Hingga 50 Peserta Belajar Aktif
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  Antrean Eksekusi Harian (Work Queue)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  Tombol 1-Tap Kirim WhatsApp
                </div>
              </div>
            </div>

            <Link
              href="/app"
              style={{
                width: '100%',
                minHeight: '48px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                border: '1px solid #D1D5DB',
                fontWeight: 750,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Mulai Gratis Sekarang
            </Link>
          </div>

          {/* Card 2: Solo */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '2px solid #059669',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 24px -4px rgba(5, 150, 105, 0.15)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-13px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 14px',
                borderRadius: '999px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {includeUpsell ? '★ Paling Populer · Ekosistem Lengkap' : 'PromotorFlow Solo Standalone'}
            </div>

            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
                {includeUpsell ? 'Talira Solo — Ekosistem Lengkap' : 'PromotorFlow Solo'}
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.5 }}>
                {includeUpsell
                  ? 'CRM PromotorFlow + LMS PromotorClass terpadu dengan modul belajar & penjualan kelas berbayar.'
                  : 'Fokus penuh pada CRM, antrean tindakan follow-up WhatsApp harian, dan konversi prospek STIFIn.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                {billingCycle === 'annual' && includeUpsell && (
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#9CA3AF', textDecoration: 'line-through' }}>
                    Rp 1.788.000
                  </span>
                )}
                <span style={{ fontSize: '36px', fontWeight: 850, color: '#059669' }}>
                  Rp {formattedPrice}
                </span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  {billingCycle === 'annual' ? '/ tahun' : '/ bulan'}
                </span>
                {billingCycle === 'annual' && includeUpsell && (
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '6px' }}>
                    Hemat Rp 598.000
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11.5px', color: '#6B7280', marginBottom: '14px' }}>
                {includeUpsell ? (
                  billingCycle === 'annual'
                    ? 'Rp 990.000 (Flow) + Rp 200.000 (Class Upsell — Hemat Rp 400.000!)'
                    : 'Rp 99.000 (Flow) + Rp 50.000 (Class Upsell) · Batal kapan saja'
                ) : (
                  billingCycle === 'annual'
                    ? 'Rp 990.000/tahun (setara Rp 82.500/bulan — hemat 2 bulan)'
                    : 'Rp 99.000/bulan · Batalkan kapan saja'
                )}
              </div>

              {/* Monthly comparison pill */}
              {billingCycle === 'monthly' && includeUpsell && (
                <div
                  onClick={() => setBillingCycle('annual')}
                  style={{
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#92400E',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span>
                    ⚡ <strong>Bandingkan:</strong> Paket Tahunan lengkap hanya <strong>Rp 1.190.000/thn</strong> (Hemat Rp 598.000!)
                  </span>
                  <span style={{ fontWeight: 800, textDecoration: 'underline', whiteSpace: 'nowrap' }}>Pilih Tahunan →</span>
                </div>
              )}

              {/* Interactive Upsell Box */}
              <div
                onClick={() => setIncludeUpsell(!includeUpsell)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: includeUpsell ? '#F0FDF4' : '#F9FAFB',
                  border: `2px solid ${includeUpsell ? '#059669' : '#E5E7EB'}`,
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '24px',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={includeUpsell}
                    onChange={(e) => setIncludeUpsell(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: '3px', accentColor: '#059669', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                        + Tambah PromotorClass (LMS Edukasi)
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                        {billingCycle === 'annual' ? '+Rp 200.000/thn' : '+Rp 50.000/bln'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#4B5563', margin: '4px 0 0', lineHeight: 1.45 }}>
                      Buka fitur jual kelas berbayar, modul materi video, form refleksi pengunci, dan sinyal belajar Hot/Warm otomatis.
                    </p>
                    {billingCycle === 'monthly' ? (
                      <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#B45309', fontWeight: 700 }}>
                        🔥 <strong>Trik Hemat:</strong> Di paket tahunan, cukup tambah <strong>Rp 200.000/thn</strong> untuk 1 tahun penuh (bukan Rp 600.000)!
                      </div>
                    ) : (
                      <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>
                        ✓ <strong>Super Hemat:</strong> Hanya tambah Rp 200rb/thn (~Rp 16.600/bln) — hemat Rp 400.000 dibanding bulanan!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '12px', borderTop: '1px solid #F3F4F6', paddingTop: '20px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#111827', fontWeight: 700 }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  Hingga 2.500 Kontak CRM Terhubung
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  Antrean Eksekusi Harian (Work Queue) & 1-Tap WA
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                  <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                  Halaman Booking Publik & Siklus Aftercare Otomatis
                </div>
                {includeUpsell ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#111827', fontWeight: 700 }}>
                      <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                      Buka Penjualan Program Kelas Berbayar
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                      <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                      Hingga 10 Program Kelas & 500 Peserta Belajar
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151' }}>
                      <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                      Integrasi Sinyal Belajar Real-Time (Hot/Warm/Cold)
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', paddingLeft: '24px' }}>
                      * + Rp3.000 flat per transaksi kelas berbayar (0% komisi persentase)
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#9CA3AF' }}>
                    <span>—</span>
                    <span>PromotorClass pada paket Free (1 program, 50 peserta)</span>
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/login"
              style={{
                width: '100%',
                minHeight: '48px',
                borderRadius: '12px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              }}
            >
              {includeUpsell ? 'Pilih Paket Lengkap (Flow + Class) Sekarang' : 'Pilih PromotorFlow Solo Sekarang'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
