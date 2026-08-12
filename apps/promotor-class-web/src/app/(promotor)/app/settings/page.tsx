'use client';

import React, { useState, useEffect } from 'react';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { promotorFlowAdapter } from '@/adapters/mock/promotorflow-adapter';
import { IntegrationMode } from '@promotor/contracts';

export default function SettingsPage() {
  const [user, setUser] = useState(MockStateStore.getState().user);
  const [org, setOrg] = useState(MockStateStore.getState().organization);
  const [mode, setMode] = useState<IntegrationMode>('BUNDLE_AVAILABLE');

  useEffect(() => {
    setMode(promotorFlowAdapter.getIntegrationMode());
  }, []);

  const handleModeChange = (newMode: IntegrationMode) => {
    promotorFlowAdapter.setIntegrationMode(newMode);
    setMode(newMode);
  };

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
          Profil promotor & status koneksi PromotorFlow
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Profile */}
          <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-divider)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Profil Promotor</h3>
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Nama:</strong> {user.name}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>No. HP (E.164):</strong> {user.phone}</div>
              <div><strong>Organisasi / Brand:</strong> {org.name}</div>
            </div>
          </div>

          {/* PromotorFlow Integration Setup */}
          <div style={{ padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-divider)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Integrasi PromotorFlow</h3>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              Menghubungkan sinyal belajar peserta dengan sistem aksi PromotorFlow
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(['CLASS_ONLY', 'BUNDLE_AVAILABLE', 'BUNDLE_FLOW_UNAVAILABLE'] as IntegrationMode[]).map(m => (
                <label
                  key={m}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: mode === m ? 'var(--color-primary-light)' : 'var(--color-canvas)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="integrationMode"
                    checked={mode === m}
                    onChange={() => handleModeChange(m)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{m}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {m === 'CLASS_ONLY' && 'Mode mandiri PromotorClass (rekomendasi aksi lokal)'}
                      {m === 'BUNDLE_AVAILABLE' && 'Terhubung penuh dengan PromotorFlow (otomatis kirim NextAction)'}
                      {m === 'BUNDLE_FLOW_UNAVAILABLE' && 'PromotorFlow offline (antrekan sync outbox)'}
                    </div>
                  </div>
                </label>
              ))}
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
              Reset Demo State
            </button>
          </div>
        </div>
      </div>
    </PromotorShell>
  );
}
