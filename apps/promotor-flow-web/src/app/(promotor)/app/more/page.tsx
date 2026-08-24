'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui';

const MORE_LINKS = [
  { title: 'Katalog Layanan STIFIn', href: '/app/services', subtitle: 'Atur jenis tes, durasi, dan harga' },
  { title: 'Template Pesan WhatsApp', href: '/app/templates', subtitle: 'Atur isi draft follow-up cepat' },
  { title: 'Pengaturan Profil & Ketersediaan', href: '/app/settings', subtitle: 'Info promotor, organisasi, dan jam kerja' },
];

export default function MorePage() {
  return (
    <AppShell showBottomNav={true}>
     <PageHeader kicker="Akun" title="Lainnya" sub="Pengaturan layanan, template pesan, dan konfigurasi profil." />
     <div>
       {MORE_LINKS.map((item) =>(
          <Link key={item.href} href={item.href} className="list-row">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
             <span style={{ font: '600 13px/1.3 var(--font-sans)' }}>{item.title}</span>
             <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted-light)', flex: 'none' }}>→</span>
           </div>
           <div className="row-meta">{item.subtitle}</div>
         </Link>
       ))}
        <div style={{ height: 24 }} />
     </div>
   </AppShell>
 );
}
