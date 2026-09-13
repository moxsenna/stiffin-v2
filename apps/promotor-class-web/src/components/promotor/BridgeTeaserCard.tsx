'use client';
import React, { useEffect, useState } from 'react';
import { getPlatformApiClient } from '@/adapters';
import type { BridgeTeaser } from '@promotor/contracts';
import { UpsellSheet } from './UpsellSheet';

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="#1D4ED8" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BridgeTeaserCard() {
  const [teaser, setTeaser] = useState<BridgeTeaser | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);

  useEffect(() => {
    const api = getPlatformApiClient();
    api
      .getBridgeTeaser()
      .then((t) => {
        setTeaser(t);
        if (t.available && !t.dismissedAt) {
          api.recordBridgeMetric('teaser_viewed', { surface: 'beranda' }).catch(() => null);
        }
      })
      .catch(() => null);
  }, []);

  if (!teaser || !teaser.available || teaser.dismissedAt) return null;

  const handleUpgrade = () => {
    const api = getPlatformApiClient();
    api.recordBridgeMetric('teaser_cta_clicked', { surface: 'beranda' }).catch(() => null);
    api.recordBridgeMetric('upgrade_started', { product: 'FLOW', surface: 'beranda' }).catch(() => null);
    setUpsellOpen(true);
  };

  const handleDismiss = async () => {
    await getPlatformApiClient().dismissBridgeTeaser().catch(() => null);
    setTeaser({ ...teaser, dismissedAt: new Date().toISOString() });
  };

  return (
    <section
      style={{
        border: '1px solid #BFDBFE',
        background: '#EFF6FF',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '800 12px/1.4 var(--font-sans)', color: '#1D4ED8' }}>
            {teaser.signalsCount} sinyal siap jadi tindak lanjut otomatis di Ralivo Flow
          </div>
          {teaser.preview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 10,
                background: '#FFFFFF',
                border: '1px solid #DBEAFE',
              }}
            >
              <LockIcon />
              <span style={{ font: '600 12px/1.35 var(--font-sans)', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {teaser.preview.title}
              </span>
              <span style={{ font: '600 10px/1 var(--font-sans)', color: '#94A3B8', flex: 'none' }}>
                {teaser.preview.dueLabel}
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Abaikan teaser"
          style={{ border: 0, background: 'none', color: '#94A3B8', fontSize: 16, cursor: 'pointer', flex: 'none', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        onClick={handleUpgrade}
        style={{
          marginTop: 10,
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          border: 0,
          background: '#2563EB',
          color: '#FFFFFF',
          font: '800 13px/1 var(--font-sans)',
          cursor: 'pointer',
        }}
      >
        Aktifkan Ralivo Flow
      </button>
      {upsellOpen && <UpsellSheet product="FLOW" onClose={() => setUpsellOpen(false)} />}
    </section>
  );
}
