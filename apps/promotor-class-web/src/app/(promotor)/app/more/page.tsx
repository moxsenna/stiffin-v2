'use client';

import React from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';

const MORE_LINKS: Array<{ label: string; href: string; note: string }> = [
  { label: 'Pesanan', href: '/app/orders', note: 'Kelola transaksi & status pembelian kelas berbayar' },
  { label: 'Aktivitas', href: '/app/activity', note: 'Sinyal belajar terbaru dari learner' },
  { label: 'Storefront', href: '/app/storefront', note: 'Halaman publik dan katalog program' },
  { label: 'Pengaturan', href: '/app/settings', note: 'Akun, organisasi, dan preferensi' },
];

export default function MorePage() {
  return (
    <PromotorShell>
     <PageHeader kicker="PromotorClass" title="Lainnya" sub="Aktivitas, storefront, dan pengaturan" />
     <div>
       {MORE_LINKS.map((link) =>(
          <Link key={link.href} href={link.href} className="list-row">
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
             <span style={{ font: '600 13px/1 var(--font-sans)' }}>{link.label}</span>
             <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted-light)' }}>→</span>
           </div>
           <div className="row-meta">{link.note}</div>
         </Link>
       ))}
        <div style={{ height: 24 }} />
     </div>
   </PromotorShell>
 );
}
