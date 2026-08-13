'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { resolveWorkspaceSlug } from '@/lib/session';
import { getPromoterReferralOverviewQuery } from '@/modules/referrals/queries';
import { PromoterReferralOverview } from '@/modules/referrals/types';

export default function PromotorReferralPage() {
  const [overview, setOverview] = useState<PromoterReferralOverview | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = resolveWorkspaceSlug();
    setResolvedSlug(slug);

    if (slug) {
      getPromoterReferralOverviewQuery(slug)
        .then(res => setOverview(res))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <PromotorShell>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Memuat data referral promotor...
        </div>
      </PromotorShell>
    );
  }

  if (!resolvedSlug || !overview) {
    return (
      <PromotorShell>
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 780, marginBottom: '8px', color: 'var(--color-text-main)' }}>
            Workspace Promotor Tidak Ditemukan
          </h2>
          <p style={{ fontSize: '13px', marginBottom: '16px' }}>
            Silakan pilih atau buka workspace promotor aktif terlebih dahulu di Pengaturan.
          </p>
          <Link
            href="/app/settings"
            style={{
              display: 'inline-block',
              padding: '10px 18px',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              borderRadius: '10px',
              fontWeight: 750,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            ← Buka Pengaturan & Lainnya
          </Link>
        </div>
      </PromotorShell>
    );
  }

  return (
    <PromotorShell>
      <div style={{ padding: '20px 16px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Navigation back to Settings */}
        <div style={{ marginBottom: '16px' }}>
          <Link
            href="/app/settings"
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ← Kembali ke Pengaturan & Lainnya
          </Link>
        </div>

        {/* Prototype Header Banner */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '14px',
            padding: '12px 16px',
            fontSize: '12px',
            color: '#166534',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🎯</span>
          <div>
            <strong>Referral Engine Prototype (Draft B4.5):</strong> Dashboard analitik dan audit fraud referral promotor. Sistem tracking otomatis antar-domain akan berjalan penuh pada milestone B4.5.
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>
            Program Referral Promotor
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Overview performa referral learner, leaderboard referrer teraktif, dan audit fraud pencapaian reward.
          </div>
        </div>

        {/* Campaign Info Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-divider)',
            padding: '18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              Campaign Aktif
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
              {overview.activeProgram.name}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <div>
              Attribution: <strong style={{ color: 'var(--color-text-main)' }}>{overview.activeProgram.attributionWindowDays} Hari</strong>
            </div>
            <div>
              Hold Period: <strong style={{ color: 'var(--color-text-main)' }}>D+{overview.activeProgram.rewardHoldDays}</strong>
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)' }} className="tabular-nums">
              {overview.kpis.totalVisits}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Total Klik Link</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#3B82F6' }} className="tabular-nums">
              {overview.kpis.totalEngaged}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Terdaftar (Engaged)</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-status-success)' }} className="tabular-nums">
              {overview.kpis.totalQualified}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Qualified (Tes/Paid)</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '14px',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#8B5CF6' }} className="tabular-nums">
              {overview.kpis.conversionRate}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Konversi Funnel</div>
          </div>
        </div>

        {/* Top Referrers Leaderboard */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 750, marginBottom: '14px' }}>Top Referrers (Learner Teraktif)</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview.topReferrers.map((ref, idx) => (
              <div
                key={ref.contactId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-canvas)',
                  border: '1px solid var(--color-divider)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#FEF08A' : idx === 1 ? '#E2E8F0' : '#FFEDD5',
                      color: idx === 0 ? '#854D0E' : idx === 1 ? '#475569' : '#9A3412',
                      fontWeight: 800,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 750 }}>{ref.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {ref.invitedCount} Undangan • {ref.engagedCount} Terdaftar
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-status-success)' }}>
                    {ref.qualifiedCount} Qualified
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>Reward Terbit</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud Audit Signals List */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-divider)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 750, marginBottom: '4px' }}>Audit & Sinyal Risiko Anti-Fraud</h2>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
            Daftar atribusi yang membutuhkan verifikasi privasi (Hash Jaringan/Device).
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview.auditList.map(audit => (
              <div
                key={audit.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-canvas)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 750 }}>
                    {audit.referrerName} → {audit.referredName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Tanggal: {new Date(audit.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {audit.riskSignals.length > 0 ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      ⚠️ Sinyal Subnet Sama
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      ✓ Valid
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PromotorShell>
  );
}
