'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function RoiCalculator() {
  const [leadsPerMonth, setLeadsPerMonth] = useState(50);
  const [pricePerSession, setPricePerSession] = useState(500000);

  // Conversion math
  const activeLearners = Math.round(leadsPerMonth * 0.85); // 85% participation
  const highIntentLeads = Math.round(activeLearners * 0.35); // 35% high intent
  const estimatedNewClients = Math.max(1, Math.round(highIntentLeads * 0.45)); // 45% closing rate on warm high-intent
  const monthlyRevenueUplift = estimatedNewClients * pricePerSession;
  const annualRevenueUplift = monthlyRevenueUplift * 12;

  return (
    <section
      id="kalkulator-roi"
      style={{
        paddingTop: '64px',
        paddingBottom: '72px',
        backgroundColor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div className="container">
        <div style={{ maxWidth: '780px', margin: '0 auto 40px', textAlign: 'center' }}>
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
            Hitung potensi pertumbuhan omzet edukasi Anda.
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Geser angka di bawah untuk melihat bagaimana edukasi terarah dan sinyal intent meningkatkan konversi closing tes atau konsultasi Anda.
          </p>
        </div>

        {/* Calculator Card */}
        <div
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid var(--color-divider)',
            padding: '40px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.05)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* Sliders Column */}
          <div>
            {/* Slider 1: Leads */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <label htmlFor="leads-input" style={{ fontSize: '14px', fontWeight: 750, color: 'var(--color-text-main)' }}>
                  Jumlah Peserta Edukasi / Bulan
                </label>
                <span style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-primary)' }}>
                  {leadsPerMonth} orang
                </span>
              </div>
              <input
                id="leads-input"
                type="range"
                min="10"
                max="500"
                step="5"
                value={leadsPerMonth}
                onChange={(e) => setLeadsPerMonth(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer',
                  height: '6px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                <span>10 orang</span>
                <span>250 orang</span>
                <span>500 orang</span>
              </div>
            </div>

            {/* Slider 2: Average Ticket Price */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <label htmlFor="price-input" style={{ fontSize: '14px', fontWeight: 750, color: 'var(--color-text-main)' }}>
                  Biaya Tes / Sesi Konsultasi Anda
                </label>
                <span style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-primary)' }}>
                  Rp{pricePerSession.toLocaleString('id-ID')}
                </span>
              </div>
              <input
                id="price-input"
                type="range"
                min="200000"
                max="2500000"
                step="50000"
                value={pricePerSession}
                onChange={(e) => setPricePerSession(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer',
                  height: '6px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                <span>Rp200.000</span>
                <span>Rp1.250.000</span>
                <span>Rp2.500.000</span>
              </div>
            </div>

            <div style={{ marginTop: '28px', padding: '16px', backgroundColor: 'var(--color-canvas)', borderRadius: '12px', border: '1px solid var(--color-divider)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              💡 <strong>Formula Konversi:</strong> Dari <strong>{leadsPerMonth} peserta</strong>, sistem mendeteksi sekitar <strong>{highIntentLeads} lead hangat</strong> yang siap menerima rekomendasi solusi via WhatsApp.
            </div>
          </div>

          {/* Results Summary Box */}
          <div
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 8px 24px rgba(40, 99, 68, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B8D4C5', marginBottom: '8px' }}>
                Estimasi Tambahan Omzet
              </div>

              <div style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 850, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '6px' }}>
                Rp{monthlyRevenueUplift.toLocaleString('id-ID')}
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#B8D4C5', marginLeft: '4px' }}>/bulan</span>
              </div>

              <div style={{ fontSize: '13px', color: '#D4E7DC', marginBottom: '24px' }}>
                setara dengan <strong>Rp{annualRevenueUplift.toLocaleString('id-ID')}</strong> per tahun
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#B8D4C5', display: 'block' }}>High-Intent Leads</span>
                  <strong style={{ fontSize: '18px', fontWeight: 800 }}>{highIntentLeads} orang</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#B8D4C5', display: 'block' }}>Estimasi Closing</span>
                  <strong style={{ fontSize: '18px', fontWeight: 800 }}>+{estimatedNewClients} klien</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '28px' }}>
              <Link
                href="/login"
                style={{
                  width: '100%',
                  minHeight: '46px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Mulai Uji Coba Sekarang Gratis →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
