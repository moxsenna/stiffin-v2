'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getPlatformApiClient } from '@/adapters';
import { OrganizationPlanAccess } from '@promotor/contracts';
import { formatIDR } from '@promotor/platform-core';
import { signOut } from '@/lib/auth';

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
              border: '1px solid #E5E7EB',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: isSolo ? '#EEF2FF' : '#F3F4F6',
                    color: isSolo ? '#4F46E5' : '#4B5563',
                    marginBottom: '8px',
                  }}
                >
                  PAKET AKTIF: {planAccess?.plan?.name?.toUpperCase() || 'RALIVO FREE'}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Kapasitas & Penggunaan Akun
                </h2>
              </div>

              {planAccess?.subscription?.currentPeriodEnd && (
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>
                  Berlaku hingga:
                  <div style={{ fontWeight: 700, color: '#111827' }}>
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
              <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '12px 0' }}>Memuat status paket...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '14px' }}>
                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>PROGRAM TERPUBLIKASI</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                    {planAccess?.usage?.publishedPrograms ?? 0}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#9CA3AF' }}>
                      {' '}/ {planAccess?.limits?.maxPublishedPrograms ?? 1}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>PESERTA BELAJAR AKTIF</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                    {planAccess?.usage?.activeLearners ?? 0}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#9CA3AF' }}>
                      {' '}/ {planAccess?.limits?.maxActiveLearners ?? 50}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: '#F9FAFB', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>KONTAK CRM TERHUBUNG</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>
                    {planAccess?.usage?.contacts ?? 0}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#9CA3AF' }}>
                      {' '}/ {planAccess?.limits?.maxContacts ?? 250}
                    </span>
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
                border: '2px solid #6366F1',
                padding: '24px',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
                    Tingkatkan ke Ralivo Solo
                  </h3>
                  <p style={{ fontSize: '13px', color: '#4B5563', maxWidth: '480px', lineHeight: 1.5, margin: 0 }}>
                    Buka akses ke fitur penjualan <strong>Kelas Berbayar</strong>, kustomisasi branding storefront penuh, hingga 10 program terpublikasi, 500 peserta aktif, dan 2.500 kontak CRM.
                  </p>
                </div>

                {/* Billing Cycle Toggle */}
                <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MONTHLY')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 0,
                      backgroundColor: billingCycle === 'MONTHLY' ? '#FFFFFF' : 'transparent',
                      color: billingCycle === 'MONTHLY' ? '#111827' : '#6B7280',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: billingCycle === 'MONTHLY' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    Bulanan (Rp149rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('YEARLY')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 0,
                      backgroundColor: billingCycle === 'YEARLY' ? '#FFFFFF' : 'transparent',
                      color: billingCycle === 'YEARLY' ? '#111827' : '#6B7280',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      boxShadow: billingCycle === 'YEARLY' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    Tahunan (Hemat 17%)
                  </button>
                </div>
              </div>

              {upgradeError && (
                <div style={{ marginTop: '14px', padding: '10px 14px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '12px', borderRadius: '8px' }}>
                  {upgradeError}
                </div>
              )}

              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 850, color: '#111827' }}>
                    {billingCycle === 'YEARLY' ? 'Rp 1.490.000' : 'Rp 149.000'}
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>
                      {billingCycle === 'YEARLY' ? ' / tahun' : ' / bulan'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                    + Rp3.000 flat per transaksi kelas berbayar berhasil (tanpa komisi persentase)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 0,
                    backgroundColor: '#4F46E5',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                >
                  {isUpgrading ? 'Menyiapkan Checkout...' : 'Upgrade Sekarang →'}
                </button>
              </div>
            </div>
          )}

          {/* 3. Help & Support */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E5E7EB',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
              Bantuan & Kontak Dukungan
            </h3>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.5 }}>
              Membutuhkan bantuan teknis, pertanyaan seputar pembayaran, atau konsultasi pengaturan program?
            </p>
            <a
              href="https://wa.me/6281234567890?text=Halo%20Tim%20Support%20Ralivo,%20saya%20butuh%20bantuan%20terkait%20akun%20saya"
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
              border: '1px solid #E5E7EB',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
              Akun & Keamanan
            </h3>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>
              Sesi aktif promotor pada peramban ini.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '10px 18px',
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
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
