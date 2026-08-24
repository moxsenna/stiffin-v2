'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, ErrorState, LoadingRows, EmptyState } from '@/components/ui';
import { serviceQueries } from '@/lib/container';
import { FlowService } from '@promotor/promotor-flow-fixtures';

export default function ServicesPage() {
  const [services, setServices] = useState<FlowService[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadServices = async () =>{
    setLoadError(null);
    try {
      const list = await serviceQueries.listServices();
      setServices(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Tidak dapat memuat layanan.');
    }
  };

  useEffect(() =>{
    loadServices();
  }, []);

  return (
    <AppShell showBottomNav={true}>
     <PageHeader kicker="PromotorFlow" title="Layanan STIFIn" sub="Katalog layanan tes biometrik & sesi konsultasi aktif." />

     {loadError && <ErrorState title="Gagal memuat layanan" detail={loadError} onRetry={() =>loadServices()} />}

      {!services && !loadError && <LoadingRows rows={3} />}

      {services && services.length >0 && (
        <>
         <SectionHead label="Katalog" count={`${services.length}`} />
         {services.map((srv) =>(
            <div key={srv.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
               <div style={{ font: '700 15px/1.25 var(--font-sans)' }}>{srv.title}</div>
               <div style={{ font: '700 13px/1 var(--font-sans)', flex: 'none' }}>
                 Rp {srv.priceAmount.toLocaleString('id-ID')}
                </div>
             </div>
             <div style={{ marginTop: 5, font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
               {srv.description}
              </div>
             <div className="row-meta">
               {srv.category} · {srv.durationMinutes} menit
              </div>
           </div>
         ))}
        </>
     )}

      {services && services.length === 0 && !loadError && (
        <EmptyState title="Belum ada layanan aktif" explanation="Layanan dikelola dari katalog organisasi." />
     )}
      <div style={{ height: 24 }} />
   </AppShell>
 );
}
