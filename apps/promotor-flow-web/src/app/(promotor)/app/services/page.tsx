'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { serviceQueries } from '@/lib/container';
import { FlowService } from '@promotor/promotor-flow-fixtures';
import { ChevronLeftIcon } from '@/components/foundation/icons';
import { useRouter } from 'next/navigation';

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<FlowService[]>([]);

  const loadServices = useCallback(async () => {
    const list = await serviceQueries.listServices();
    setServices(list);
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  return (
    <AppShell showBottomNav={true}>
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={() => router.push('/app/more')}
          className="touch-target"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--color-text-secondary)',
            fontWeight: 650,
            fontSize: '13px',
            marginBottom: '8px',
          }}
        >
          <ChevronLeftIcon size={16} />
          <span>Kembali ke Lainnya</span>
        </button>

        <h1 style={{ fontSize: '24px', fontWeight: 850, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
          Katalog Layanan STIFIn
        </h1>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '2px', marginBottom: '16px' }}>
          Daftar paket tes biometrik & sesi konsultasi aktif
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {services.map((srv) => (
          <div
            key={srv.id}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-text-primary)' }}>
                {srv.title}
              </div>
              <span className="tabular-nums" style={{ fontWeight: 850, fontSize: '15px', color: 'var(--color-primary)' }}>
                Rp {srv.priceAmount.toLocaleString('id-ID')}
              </span>
            </div>

            <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {srv.description}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 750,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                }}
              >
                {srv.category}
              </span>
              <span className="tabular-nums" style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                · Durasi: {srv.durationMinutes} Menit
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
