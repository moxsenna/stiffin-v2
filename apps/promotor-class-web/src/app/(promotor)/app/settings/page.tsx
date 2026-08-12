'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { promotorFlowAdapter } from '@/adapters/mock/promotorflow-adapter';
import { IntegrationHealth } from '@promotor/contracts';

export default function SettingsPage() {
  const [org, setOrg] = useState(MockStateStore.getState().organization);
  const [health, setHealth] = useState<IntegrationHealth>({ promotorFlow: 'AVAILABLE' });

  useEffect(() => {
    promotorFlowAdapter.getIntegrationHealth().then(setHealth);
  }, []);

  const handleResetDemo = () => {
    if (confirm('Apakah Anda yakin ingin meriset seluruh data demo ke kondisi awal (seeds)?')) {
      MockStateStore.resetDemo();
      window.location.reload();
    }
  };

  return (
    <PromotorShell>
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Pengaturan & Integrasi</h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Profil promotor & status koneksi sistem
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Profile */}
          <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-divider)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Profil Promotor</h3>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Nama:</strong> Rina Wulandari</div>
              <div><strong>Email:</strong> rina@stifinpromotor.id</div>
              <div><strong>No. HP (E.164):</strong> +6281234567890</div>
              <div><strong>Organisasi / Brand:</strong> {org.name}</div>
            </div>
          </div>

          {/* Integration Health Card */}
          <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-divider)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Koneksi PromotorFlow</h3>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              Menghubungkan sinyal belajar peserta dengan sistem aksi PromotorFlow
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-primary-light)', fontSize: '13px' }}>
              <div><strong>Status Integrasi:</strong> {health.promotorFlow === 'AVAILABLE' ? 'Aktif Terhubung (AVAILABLE)' : 'Terpisah (UNAVAILABLE)'}</div>
            </div>
          </div>

          {/* Reset Demo State */}
          <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-divider)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Reset Data Demo</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              Kembalikan seluruh data LocalStorage ke kondisi seed awal.
            </p>
            <button
              onClick={handleResetDemo}
              className="touch-target-primary"
              style={{
                padding: '0 16px',
                border: '1px solid var(--color-status-danger)',
                color: 'var(--color-status-danger)',
                borderRadius: 'var(--border-radius-sm)',
                fontWeight: 600,
              }}
            >
              Reset State Demo
            </button>
          </div>
        </div>
      </div>
    </PromotorShell>
  );
}
