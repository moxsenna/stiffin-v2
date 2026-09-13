'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getPlatformApiClient } from '@/adapters';
import { BankAccountsSection } from '@/components/promotor/BankAccountsSection';
import { OrganizationPlanAccess } from '@promotor/contracts';
import { formatIDR } from '@promotor/platform-core';
import { signOut } from '@/lib/auth';
import { supportWaUrl } from '@/config/support';

export default function SettingsPage() {
  const router = useRouter();
  const [planAccess, setPlanAccess] = useState<OrganizationPlanAccess | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    const api = getPlatformApiClient();
    api
      .getPlanAccess()
      .then((data: OrganizationPlanAccess) => {
        setPlanAccess(data);
      })
      .catch((err: unknown) => {
        console.warn('Failed to load plan access:', err);
      })
      .finally(() => {
        setIsLoadingPlan(false);
      });
  }, []);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setUpgradeError(null);
    try {
      const api = getPlatformApiClient();
      const res = await api.createSubscriptionCheckout({
        planCode: 'SOLO',
        billingCycle,
        returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/app/settings` : undefined,
      });

      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        setUpgradeError('Gagal mendapatkan tautan pembayaran.');
      }
    } catch (err: any) {
      setUpgradeError(err.message || 'Gagal memulai upgrade langganan');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const isSolo = planAccess?.plan?.code === 'SOLO';

  return (
    <PromotorShell>
      <div style={{ padding: '20px 16px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '4px', color: '#111827' }}>
            Pengaturan Akun & Langganan
          </h1>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            Kelola paket langganan Ralivo, kapasitas akun, dan bantuan dukungan
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. Plan & Capacity Overview Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: isSolo ? '#EFF6FF' : '#F1F5F9',
                    color: isSolo ? '#1D4ED8' : '#475569',
                    marginBottom: '8px',
                    letterSpacing: '0.04em',
                  }}
                >
                  PAKET AKTIF: {planAccess?.plan?.name?.toUpperCase() || 'RALIVO FREE'}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  Kapasitas & Penggunaan Akun
                </h2>
              </div>

              {planAccess?.subscription?.currentPeriodEnd && (
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                  Berlaku hingga:
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {new Date(planAccess.subscription.currentPeriodEnd).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Capacity meters */}
            {isLoadingPlan ? (
              <div style={{ fontSize: '13px', color: '#94A3B8', padding: '12px 0' }}>Memuat status paket...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginTop: '14px' }}>
                {/* Program Terpublikasi */}
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>PROGRAM TERPUBLIKASI</div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>
                      {Math.round(((planAccess?.usage?.publishedPrograms ?? 0) / (planAccess?.limits?.maxPublishedPrograms ?? 1)) * 100)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                    {planAccess?.usage?.publishedPrograms ?? 0}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#94A3B8' }}>
                      {' '}/ {planAccess?.limits?.maxPublishedPrograms ?? 1}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '9999px', marginTop: '10px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: '#2563EB',
                        width: `${Math.min(100, Math.round(((planAccess?.usage?.publishedPrograms ?? 0) / (planAccess?.limits?.maxPublishedPrograms ?? 1)) * 100))}%`,
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                </div>

                {/* Peserta Belajar Aktif */}
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>PESERTA BELAJAR AKTIF</div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>
                      {Math.round(((planAccess?.usage?.activeLearners ?? 0) / (planAccess?.limits?.maxActiveLearners ?? 50)) * 100)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                    {planAccess?.usage?.activeLearners ?? 0}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#94A3B8' }}>
                      {' '}/ {planAccess?.limits?.maxActiveLearners ?? 50}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '9999px', marginTop: '10px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: '#2563EB',
                        width: `${Math.min(100, Math.round(((planAccess?.usage?.activeLearners ?? 0) / (planAccess?.limits?.maxActiveLearners ?? 50)) * 100))}%`,
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                </div>

                {/* Kontak CRM Terhubung */}
                <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>KONTAK CRM TERHUBUNG</div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>
                      {Math.round(((planAccess?.usage?.contacts ?? 0) / (planAccess?.limits?.maxContacts ?? 250)) * 100)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                    {planAccess?.usage?.contacts ?? 0}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#94A3B8' }}>
                      {' '}/ {planAccess?.limits?.maxContacts ?? 250}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '9999px', marginTop: '10px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: '#2563EB',
                        width: `${Math.min(100, Math.round(((planAccess?.usage?.contacts ?? 0) / (planAccess?.limits?.maxContacts ?? 250)) * 100))}%`,
                        borderRadius: '9999px',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Upgrade to Solo Card (Shown for Free plan or downgrade) */}
          {!isSolo && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #93C5FD',
                padding: '24px',
                boxShadow: '0 4px 16px -2px rgba(37, 99, 235, 0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      marginBottom: '8px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    PAKET LENGKAP KELAS &amp; PIPELINE
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    Tingkatkan ke Ralivo Solo
                  </h3>
                  <p style={{ fontSize: '13px', color: '#475569', maxWidth: '520px', lineHeight: 1.55, margin: 0 }}>
                    Buka akses fitur lengkap: <strong>Ralivo Class</strong> (kelas berbayar, kupon, materi tak terbatas) &amp; <strong>Ralivo Flow</strong> (pipeline prospek, automasi WhatsApp, kalender konsultasi) hingga 10 program, 500 peserta aktif, dan 2.500 kontak CRM.
                  </p>
                </div>

                {/* Billing Cycle Toggle */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MONTHLY')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 0,
                      backgroundColor: billingCycle === 'MONTHLY' ? '#FFFFFF' : 'transparent',
                      color: billingCycle === 'MONTHLY' ? '#0F172A' : '#64748B',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: billingCycle === 'MONTHLY' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Bulanan (Rp149rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('YEARLY')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 0,
                      backgroundColor: billingCycle === 'YEARLY' ? '#FFFFFF' : 'transparent',
                      color: billingCycle === 'YEARLY' ? '#0F172A' : '#64748B',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: billingCycle === 'YEARLY' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Tahunan (Hemat 17%)
                  </button>
                </div>
              </div>

              {upgradeError && (
                <div style={{ marginTop: '14px', padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '12px', borderRadius: '8px', fontWeight: 600 }}>
                  {upgradeError}
                </div>
              )}

              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#94A3B8', textDecoration: 'line-through' }}>
                      {billingCycle === 'YEARLY' ? 'Rp 1.788.000' : 'Rp 198.000'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                      {billingCycle === 'YEARLY' ? 'Hemat s/d 33%' : 'Add-on cuma nambah Rp 50rb'}
                    </span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 850, color: '#0F172A', letterSpacing: '-0.02em', marginTop: '2px' }}>
                    {billingCycle === 'YEARLY' ? 'Rp 1.490.000' : 'Rp 149.000'}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                      {billingCycle === 'YEARLY' ? ' / tahun' : ' / bulan'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '3px' }}>
                    Aktivasi instan via Paycore (QRIS, VA Bank, Transfer).
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  style={{
                    padding: '11px 22px',
                    borderRadius: '10px',
                    border: 0,
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isUpgrading ? 'Menyiapkan Checkout Paycore...' : 'Aktifkan via Paycore →'}
                </button>
              </div>
            </div>
          )}

          <BankAccountsSection />

          {/* 3. Help & Support */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#ECFDF5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Bantuan & Kontak Dukungan
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', lineHeight: 1.5 }}>
              Membutuhkan bantuan teknis, kendala pembayaran, atau konsultasi pengaturan program Ralivo Anda?
            </p>
            <a
              href={supportWaUrl('Halo Tim Support Ralivo, saya butuh bantuan terkait akun saya')}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
              }}
            >
              Chat Support via WhatsApp ↗
            </a>
          </div>

          {/* 4. Account & Sign Out */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              Akun & Keamanan
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
              Sesi aktif promotor pada peramban ini.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '9px 18px',
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    </PromotorShell>
  );
}
