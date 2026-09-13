'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader } from '@/components/ui';
import { getPlatformApiClient } from '@/adapters';
import { PARTNER_APP_URL } from '@/config/partner-app';

const MORE_LINKS: Array<{ label: string; href: string; note: string }> = [
  { label: 'Pesanan', href: '/app/orders', note: 'Kelola transaksi & status pembelian kelas berbayar' },
  { label: 'Pencairan', href: '/app/payouts', note: 'Ajukan pencairan dan lacak transfer manual' },
  { label: 'Kupon Promo', href: '/app/coupons', note: 'Kelola voucher diskon & potongan harga program' },
  { label: 'Aktivitas', href: '/app/activity', note: 'Sinyal belajar terbaru dari peserta' },
  { label: 'Storefront', href: '/app/storefront', note: 'Halaman publik dan katalog program' },
  { label: 'Pengaturan', href: '/app/settings', note: 'Akun, organisasi, dan preferensi' },
];

export default function MorePage() {
  const [hasFlow, setHasFlow] = useState<boolean | null>(null);

  useEffect(() => {
    getPlatformApiClient()
      .getPlanAccess()
      .then((p) => setHasFlow(!!(p as any).features?.promotorFlow))
      .catch(() => setHasFlow(null));
  }, []);

  return (
    <PromotorShell>
     <PageHeader kicker="Ralivo Class" title="Lainnya" sub="Aktivitas, storefront, dan pengaturan" />
     <div>
       {hasFlow !== false && (
         <a href={PARTNER_APP_URL} className="list-row" onClick={() => getPlatformApiClient().recordBridgeMetric('bridge_action_executed', { kind: 'switcher_class_to_flow' }).catch(() => null)}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
             <span style={{ font: '600 13px/1 var(--font-sans)' }}>Buka Ralivo Flow ↗</span>
             <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted-light)' }}>→</span>
           </div>
           <div className="row-meta">Pindah ke aplikasi follow-up &amp; pipeline</div>
         </a>
       )}
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
