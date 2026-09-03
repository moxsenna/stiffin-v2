'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export const FlowRoiCalculator: React.FC = () => {
  const [monthlyLeads, setMonthlyLeads] = useState(40);
  const [testFee, setTestFee] = useState(600000);
  const [conversionLift, setConversionLift] = useState(25); // in percent

  // Calculate numbers
  // Baseline conversion without system ~ 20%
  const baselineClients = Math.round(monthlyLeads * 0.20);
  const additionalClients = Math.max(1, Math.round(monthlyLeads * (conversionLift / 100)));
  const totalClientsWithFlow = baselineClients + additionalClients;
  const additionalRevenue = additionalClients * testFee;
  const timeSavedHours = Math.round(monthlyLeads * 0.4); // 24 mins per lead saved in admin

  return (
    <section
      id="kalkulator"
      style={{
        padding: '80px 24px',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
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
            Kalkulator Dampak Bisnis Talira Flow
          </h2>
          <p style={{ fontSize: '15.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Geser angka di bawah untuk melihat estimasi penambahan omzet dan waktu kerja yang dapat Anda selamatkan setiap bulan.
          </p>
        </div>

        {/* Calculator Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-divider)',
            padding: '36px 32px',
            boxShadow: 'var(--shadow-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '36px',
            alignItems: 'center',
          }}
        >
          {/* Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Slider 1: Monthly Leads */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 750, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  Jumlah Prospek Masuk / Bulan:
                </label>
                <span className="tabular-nums" style={{ fontWeight: 850, fontSize: '16px', color: 'var(--color-primary)' }}>
                  {monthlyLeads} Kontak
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={monthlyLeads}
                onChange={(e) => setMonthlyLeads(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                <span>10 Prospek</span>
                <span>200 Prospek</span>
              </div>
            </div>

            {/* Slider 2: Average Fee per Test */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 750, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  Biaya Rata-Rata per Sesi Tes:
                </label>
                <span className="tabular-nums" style={{ fontWeight: 850, fontSize: '16px', color: 'var(--color-primary)' }}>
                  Rp {testFee.toLocaleString('id-ID')}
                </span>
              </div>
              <input
                type="range"
                min={400000}
                max={1500000}
                step={50000}
                value={testFee}
                onChange={(e) => setTestFee(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                <span>Rp 400.000</span>
                <span>Rp 1.500.000</span>
              </div>
            </div>

            {/* Slider 3: Conversion Lift */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 750, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  Kenaikan Konversi Follow-Up:
                </label>
                <span className="tabular-nums" style={{ fontWeight: 850, fontSize: '16px', color: 'var(--color-primary)' }}>
                  +{conversionLift}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={conversionLift}
                onChange={(e) => setConversionLift(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                <span>+10% (Konservatif)</span>
                <span>+50% (Agresif)</span>
              </div>
            </div>
          </div>

          {/* Results Summary Box */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 750, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                POTENSI TAMBAHAN OMZET BULANAN
              </div>
              <div className="tabular-nums" style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 900, color: 'var(--color-primary)', marginTop: '4px' }}>
                +Rp {additionalRevenue.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                dari tambahan <strong style={{ color: 'var(--color-text-primary)' }}>+{additionalClients} sesi tes</strong> yang berhasil ditutup
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '16px', display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-primary)' }}>
                  ~{timeSavedHours} Jam
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Waktu Admin Dihemat
                </div>
              </div>

              <div>
                <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-text-primary)' }}>
                  {totalClientsWithFlow} Klien
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Total Sesi Tes / Bulan
                </div>
              </div>
            </div>

            <Link
              href="/app"
              className="touch-target-primary"
              style={{
                width: '100%',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                fontWeight: 780,
                fontSize: '14.5px',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Mulai Pakai Talira Flow Sekarang →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
