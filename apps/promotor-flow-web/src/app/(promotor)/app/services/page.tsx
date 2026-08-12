'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { serviceQueries, store } from '@/lib/container';
import { FlowService } from '@promotor/promotor-flow-fixtures';

export default function ServicesPage() {
  const [services, setServices] = useState<FlowService[]>([]);

  const loadServices = useCallback(async () => {
    const list = await serviceQueries.listServices('org_rina_stifin');
    setServices(list);
  }, []);

  useEffect(() => {
    loadServices();
    const unsubscribe = store.subscribe(() => loadServices());
    return () => unsubscribe();
  }, [loadServices]);

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '12px 16px' }}>
        <h1 style={{ font: '700 24px/29px Inter, sans-serif', color: '#191918' }}>Layanan STIFIn</h1>
        <div style={{ font: '400 13.5px Inter, sans-serif', color: '#71706B', paddingTop: '4px' }}>
          Katalog layanan tes biometrik & sesi konsultasi aktif.
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E7E3' }}>
        {services.map((srv) => (
          <div key={srv.id} style={{ padding: '14px 16px', borderBottom: '1px solid #E8E7E3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ font: '600 15.5px Inter, sans-serif', color: '#191918' }}>{srv.title}</div>
              <span style={{ font: '600 14px Inter, sans-serif', color: '#167A68' }}>
                Rp {srv.priceAmount.toLocaleString('id-ID')}
              </span>
            </div>
            <div style={{ font: '400 13px Inter, sans-serif', color: '#71706B', paddingTop: '4px' }}>
              {srv.description}
            </div>
            <div style={{ font: '500 12px Inter, sans-serif', color: '#9C9A94', paddingTop: '6px' }}>
              Kategori: {srv.category} · Durasi: {srv.durationMinutes} Menit
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
