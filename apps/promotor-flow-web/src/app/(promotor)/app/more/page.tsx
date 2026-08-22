'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ChevronRightIcon, BriefcaseIcon, MessageSquareIcon, SettingsIcon } from '@/components/foundation/icons';

export default function MorePage() {
  const menuItems = [
    {
      title: 'Katalog Layanan STIFIn',
      href: '/app/services',
      subtitle: 'Atur paket tes biometrik, durasi, dan harga',
      icon: <BriefcaseIcon size={20} color="var(--color-primary)" />,
    },
    {
      title: 'Template Pesan WhatsApp',
      href: '/app/templates',
      subtitle: 'Atur draf pesan tindak lanjut cepat',
      icon: <MessageSquareIcon size={20} color="var(--color-primary)" />,
    },
    {
      title: 'Pengaturan & Ketersediaan',
      href: '/app/settings',
      subtitle: 'Profil promotor, jadwal jam kerja, dan integrasi',
      icon: <SettingsIcon size={20} color="var(--color-primary)" />,
    },
  ];

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '20px 16px 0' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
          Menu Lainnya
        </h1>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '2px', marginBottom: '16px' }}>
          Pengaturan layanan, template pesan, dan jadwal kerja
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '16px 18px',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              textDecoration: 'none',
              transition: 'transform var(--duration-fast) var(--ease-spring)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {item.subtitle}
                </div>
              </div>
            </div>
            <ChevronRightIcon size={16} color="var(--color-text-tertiary)" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
