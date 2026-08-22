'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { resolveWorkspaceSlug } from '@/lib/session';
import { getPromoterReferralOverviewQuery } from '@/modules/referrals/queries';
import { PromoterReferralOverview } from '@/modules/referrals/types';
import { isReferralPrototypeEnabled } from '@/lib/feature-flags';

export default function PromotorReferralPage() {
  const [overview, setOverview] = useState<PromoterReferralOverview | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReferralPrototypeEnabled()) return;
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

  if (!isReferralPrototypeEnabled()) {
    return notFound();
  }

  if (loading) {
    return (
      <PromotorShell>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
          Memuat data referral promotor...
        </div>
      </PromotorShell>
    );
  }

  if (!resolvedSlug || !overview) {
    return (
      <PromotorShell>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text-main)' }}>
            Workspace Promotor Tidak Ditemukan
          </h2>
          <p style={{ fontSize: '13.5px', marginBottom: '20px', lineHeight: 1.5 }}>
            Silakan pilih atau buka workspace promotor aktif terlebih dahulu di Pengaturan.
          </p>
          <Link
            href="/app/settings"
            className="touch-target-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 20px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 780,
              fontSize: '13.5px',
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)',
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
      <div style={{ padding: '24px 20px', maxWidth: '880px', margin: '0 auto' }}>
        {/* Navigation back to Settings */}
        <div style={{ marginBottom: '16px' }}>
          <Link
            href="/app/settings"
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              fontWeight: 650,
            }}
          >
            ← Kembali ke Pengaturan & Lainnya
          </Link>
        </div>

        {/* Prototype Header Banner */}
        <div
          style={{
            backgroundColor: 'var(--color-status-info-bg)',
            border: '1px solid var(--color-status-info-border)',
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 16px',
            fontSize: '12.5px',
            color: 'var(--color-status-info)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            lineHeight: 1.5,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <strong>Referral Engine Prototype:</strong> Dashboard analitik performa referral learner dan audit atribusi fraud.
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '4px', color: 'var(--color-text-main)' }}>
            Program Referral Promotor
          </h1>
          <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
            Overview performa referral learner, leaderboard referrer teraktif, dan audit fraud pencapaian reward.
          </div>
        </div>

        {/* Campaign Info Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 650 }}>
              Campaign Aktif
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '2px' }}>
              {overview.activeProgram.name}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
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
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 850, color: 'var(--color-text-main)' }} className="tabular-nums">
              {overview.kpis.totalVisits}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '3px', fontWeight: 600 }}>Total Klik Link</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 850, color: 'var(--color-status-info)' }} className="tabular-nums">
              {overview.kpis.totalEngaged}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '3px', fontWeight: 600 }}>Terdaftar (Engaged)</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 850, color: 'var(--color-status-success)' }} className="tabular-nums">
              {overview.kpis.totalQualified}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '3px', fontWeight: 600 }}>Qualified (Tes/Paid)</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              padding: '16px 12px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '22px', fontWeight: 850, color: '#7C3AED' }} className="tabular-nums">
              {overview.kpis.conversionRate}%
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '3px', fontWeight: 600 }}>Konversi Funnel</div>
          </div>
        </div>

        {/* Top Referrers Leaderboard */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'var(--color-text-main)' }}>Top Referrers (Learner Teraktif)</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview.topReferrers.map((ref, idx) => (
              <div
                key={ref.contactId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'var(--color-canvas)',
                  border: '1px solid var(--color-divider)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-divider)',
                      color: 'var(--color-text-main)',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 780, color: 'var(--color-text-main)' }}>{ref.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {ref.invitedCount} Undangan · {ref.engagedCount} Terdaftar
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-status-success)' }} className="tabular-nums">
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
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px', color: 'var(--color-text-main)' }}>Audit & Sinyal Risiko Anti-Fraud</h2>
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
            Daftar atribusi yang membutuhkan verifikasi privasi (Hash Jaringan/Device).
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {overview.auditList.map(audit => (
              <div
                key={audit.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'var(--color-canvas)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 780, color: 'var(--color-text-main)' }}>
                    {audit.referrerName} → {audit.referredName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Tanggal: {new Date(audit.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {audit.riskSignals.length > 0 ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 750,
                        backgroundColor: 'var(--color-status-danger-bg)',
                        color: 'var(--color-status-danger)',
                        border: '1px solid var(--color-status-danger-border)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Sinyal Subnet Sama
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 750,
                        backgroundColor: 'var(--color-status-success-bg)',
                        color: 'var(--color-status-success)',
                        border: '1px solid var(--color-status-success-border)',
                        padding: '2px 8px',
                        borderRadius: '4px',
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
