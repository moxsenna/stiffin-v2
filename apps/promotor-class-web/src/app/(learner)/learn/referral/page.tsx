'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLearnerReferralSummaryQuery } from '@/modules/referrals/queries';
import { LearnerReferralSummary } from '@/modules/referrals/types';
import { LearnerTabBar } from '@/components/layout/LearnerTabBar';
import { MobileAppHeader } from '@/components/layout/MobileAppHeader';

export default function LearnerReferralPage() {
  const [summary, setSummary] = useState<LearnerReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getLearnerReferralSummaryQuery().then(res => setSummary(res));
  }, []);

  const handleCopyLink = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!summary) return;
    const url = `https://wa.me/?text=${encodeURIComponent(summary.whatsappShareText)}`;
    window.open(url, '_blank');
  };

  if (!summary) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
        Memuat Program Referral...
      </div>
    );
  }

  return (
    <div
      className="page-wrapper-with-bottom-nav"
      style={{
        backgroundColor: 'var(--color-canvas)',
        minHeight: '100vh',
        color: 'var(--color-text-main)',
      }}
    >
      <MobileAppHeader title="Referral & Reward" showBack={true} backHref="/learn/profile" />

      <div style={{ padding: '20px 16px', maxWidth: '640px', margin: '0 auto' }}>
        {/* Prototype Info Alert */}
        <div
          style={{
            backgroundColor: 'var(--color-status-info-bg)',
            border: '1px solid var(--color-status-info-border)',
            borderRadius: 'var(--border-radius-md)',
            padding: '12px 14px',
            fontSize: '12.5px',
            color: 'var(--color-status-info)',
            marginBottom: '20px',
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
            <strong>Referral Prototype:</strong> Pratinjau antarmuka referral. Penukaran reward nyata diaktifkan pada milestone berikutnya.
          </div>
        </div>

        {/* Hero Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-main)',
            borderRadius: 'var(--border-radius-xl)',
            border: '1px solid var(--color-divider)',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 850, marginBottom: '8px', lineHeight: 1.25, letterSpacing: '-0.025em' }}>
            Ajak Rekan & Keluarga Belajar Bersama
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-body)', lineHeight: 1.6, marginBottom: '20px' }}>
            Bagikan tautan referral unik Anda. Dapatkan reward voucher workshop dan akses modul eksklusif untuk setiap teman yang menyelesaikan program.
          </p>

          {/* Referral Code & Actions */}
          <div
            style={{
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Kode Referral Anda:</span>
              <span style={{ fontSize: '17px', fontWeight: 850, letterSpacing: '1.5px', color: 'var(--color-primary)' }} className="tabular-nums">
                {summary.code}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCopyLink}
                className="touch-target"
                style={{
                  backgroundColor: copied ? 'var(--color-status-success)' : 'var(--color-surface)',
                  color: copied ? '#FFF' : 'var(--color-text-main)',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {copied ? '✓ Tersalin!' : 'Salin Tautan'}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="touch-target"
                style={{
                  backgroundColor: '#25D366',
                  color: '#FFF',
                  border: 0,
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                Bagikan WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-md)',
              padding: '14px 8px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-primary)' }} className="tabular-nums">
              {summary.stats.totalInvited}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>Diajak</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-md)',
              padding: '14px 8px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-status-info)' }} className="tabular-nums">
              {summary.stats.engagedCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>Terdaftar</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-md)',
              padding: '14px 8px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-status-success)' }} className="tabular-nums">
              {summary.stats.qualifiedCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>Qualified</div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--border-radius-md)',
              padding: '14px 8px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 850, color: '#7C3AED' }} className="tabular-nums">
              {summary.stats.rewardsEarned}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600 }}>Reward</div>
          </div>
        </div>

        {/* How It Works Section */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px', color: 'var(--color-text-main)' }}>Cara Kerja Referral</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.45, color: 'var(--color-text-body)' }}>
                <strong>Bagikan Tautan:</strong> Kirim kode atau link referral unik Anda ke rekan atau grup WhatsApp.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.45, color: 'var(--color-text-body)' }}>
                <strong>Teman Mendaftar:</strong> Teman Anda mendaftar program gratis melalui tautan Anda.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontWeight: 800,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.45, color: 'var(--color-text-body)' }}>
                <strong>Terima Reward:</strong> Saat teman menyelesaikan program berbayar/tes STIFIn, Anda memperoleh voucher reward.
              </div>
            </div>
          </div>
        </div>

        {/* Masked History Table */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px', color: 'var(--color-text-main)' }}>Riwayat Referral Saya</h2>

          {summary.history.length === 0 ? (
            <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>
              Belum ada riwayat undangan. Mulai bagikan tautan Anda!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {summary.history.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--border-radius-sm)',
                    backgroundColor: 'var(--color-canvas)',
                    border: '1px solid var(--color-divider)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 780, fontSize: '13.5px' }}>{item.maskedName}</div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 750,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          item.status === 'QUALIFIED'
                            ? 'var(--color-status-success-bg)'
                            : item.status === 'PENDING'
                            ? 'var(--color-status-warning-bg)'
                            : 'var(--color-surface)',
                        color:
                          item.status === 'QUALIFIED'
                            ? 'var(--color-status-success)'
                            : item.status === 'PENDING'
                            ? 'var(--color-status-warning)'
                            : 'var(--color-text-muted)',
                        border: '1px solid var(--color-divider)',
                      }}
                    >
                      {item.status === 'QUALIFIED' ? '✓ Qualified' : item.status === 'PENDING' ? 'Pending D+7' : 'Terdaftar'}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Program: {item.programTitle}
                  </div>

                  {item.rewardTitle && (
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
                      Reward: {item.rewardTitle}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LearnerTabBar />
    </div>
  );
}
