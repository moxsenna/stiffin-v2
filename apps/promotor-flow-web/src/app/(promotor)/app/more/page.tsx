'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ChevronRightIcon } from '@/components/foundation/icons';

export default function MorePage() {
  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '12px 16px 8px' }}>
        <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Lainnya</h1>
        <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>
          Pengaturan layanan, template pesan, dan konfigurasi profil.
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3', marginTop: '12px' }}>
        {[
          { title: 'Katalog Layanan STIFIn', href: '/app/services', subtitle: 'Atur jenis tes, durasi, dan harga' },
          { title: 'Template Pesan WhatsApp', href: '/app/templates', subtitle: 'Atur isi draft follow-up cepat' },
          { title: 'Pengaturan Profil & Ketersediaan', href: '/app/settings', subtitle: 'Info promotor, organisasi, dan jam kerja' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #E8E7E3',
              textDecoration: 'none',
            }}
          >
            <div>
              <div style={{ font: '600 15px Inter, sans-serif', color: '#191918' }}>{item.title}</div>
              <div style={{ font: '400 13px Inter, sans-serif', color: '#71706B', paddingTop: '2px' }}>{item.subtitle}</div>
            </div>
            <ChevronRightIcon size={16} color="#C6C4BE" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
