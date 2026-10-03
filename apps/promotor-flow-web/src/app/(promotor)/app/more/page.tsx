'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui';
import { WaStatusPill } from '@/components/whatsapp';

const MORE_LINKS: Array<{
  title: string;
  href: string;
  subtitle: string;
  badge?: React.ReactNode;
}> = [
  {
    title: 'Koneksi WhatsApp',
    href: '/app/settings/whatsapp',
    subtitle: 'Hubungkan perangkat untuk kirim pesan langsung & terima balasan',
    badge: <WaStatusPill />,
  },
  { title: 'Pipeline Visual (Kanban)', href: '/app/pipeline', subtitle: 'Papan tahap prospek dari lead hingga selesai' },
  { title: 'Katalog Layanan STIFIn', href: '/app/services', subtitle: 'Atur jenis tes, durasi, dan harga' },
  { title: 'Template Pesan WhatsApp', href: '/app/templates', subtitle: 'Atur isi draft follow-up cepat' },
  { title: 'Pengaturan Profil & Ketersediaan', href: '/app/settings', subtitle: 'Info promotor, organisasi, dan jam kerja' },
];

export default function MorePage() {
  return (
    <AppShell showBottomNav={true}>
      <PageHeader kicker="Akun" title="Lainnya" sub="Pengaturan layanan, template pesan, dan konfigurasi profil." />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {MORE_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hv-card"
            style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ font: '700 14px/1.3 var(--font-sans)', color: 'var(--ink)' }}>{item.title}</span>
                {item.badge}
              </div>
              <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--muted-strong)', marginTop: '4px' }}>
                {item.subtitle}
              </div>
            </div>
            <span style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--muted-light)', paddingLeft: '12px' }}>
              ›
            </span>
          </Link>
        ))}
        <div style={{ height: 24 }} />
      </div>
    </AppShell>
  );
}
