'use client';

import React from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { isTemplatesEnabled, isReferralPrototypeEnabled } from '@/lib/feature-flags';

export default function MorePage() {
  const moreLinks = [
    {
      label: 'Storefront & Branding',
      href: '/app/storefront',
      note: 'Kustomisasi logo, tema visual, foto profil & narasi publik',
      icon: '🎨',
    },
    {
      label: 'Aktivitas Pembelajaran',
      href: '/app/activity',
      note: 'Sinyal belajar dan refleksi terbaru dari peserta',
      icon: '⚡',
    },
    ...(isTemplatesEnabled()
      ? [
          {
            label: 'Template Program',
            href: '/app/templates',
            note: 'Template kurikulum instan siap pakai',
            icon: '📋',
          },
        ]
      : []),
    ...(isReferralPrototypeEnabled()
      ? [
          {
            label: 'Program Referral',
            href: '/app/referrals',
            note: 'Performa referral dan leaderboard afiliasi',
            icon: '👥',
          },
        ]
      : []),
    {
      label: 'Pengaturan Workspace & Akun',
      href: '/app/settings',
      note: 'Identitas operator, status integrasi sistem, dan sesi',
      icon: '⚙️',
    },
  ];

  return (
    <PromotorShell>
      <div style={{ padding: '24px 16px', maxWidth: '840px', margin: '0 auto' }}>
        <PageHeader
          kicker="Talira Class"
          title="Menu &amp; Fitur Lainnya"
          sub="Akses cepat ke pengaturan storefront, aktivitas belajar, dan konfigurasi sistem"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          {moreLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: '0px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '20px' }}>{link.icon}</span>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 750, color: 'var(--color-text-main)', marginBottom: '2px' }}>
                    {link.label}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                    {link.note}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--color-text-subtle)', fontWeight: 700 }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </PromotorShell>
  );
}
