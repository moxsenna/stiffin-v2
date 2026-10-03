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
     <PageHeader kicker="Ralivo Flow" title="Layanan STIFIn" sub="Katalog layanan tes biometrik & sesi konsultasi aktif." />

     {loadError && <ErrorState title="Gagal memuat layanan" detail={loadError} onRetry={() =>loadServices()} />}

      {!services && !loadError && <LoadingRows rows={3} />}

      {services && services.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ margin: '14px 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-light)' }}>
            Katalog Layanan Aktif ({services.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {services.map((srv) => (
              <div key={srv.id} className="hv-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ font: '700 15px/1.3 var(--font-sans)', color: 'var(--ink)' }}>{srv.title}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                      <span className="hv-pill" style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                        {srv.category}
                      </span>
                      <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--muted-strong)' }}>
                        {srv.durationMinutes} menit
                      </span>
                    </div>
                  </div>
                  <div style={{ font: '800 15px/1 var(--font-sans)', color: 'var(--ink)', flex: 'none' }}>
                    Rp {srv.priceAmount.toLocaleString('id-ID')}
                  </div>
                </div>
                {srv.description && (
                  <div style={{ marginTop: 10, font: '400 12px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
                    {srv.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {services && services.length === 0 && !loadError && (
        <EmptyState title="Belum ada layanan aktif" explanation="Layanan dikelola dari katalog organisasi." />
     )}
      <div style={{ height: 24 }} />
   </AppShell>
 );
}
