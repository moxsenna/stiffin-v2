'use client';

/**
 * Pil status koneksi WhatsApp (dot + label) — tanpa Link, aman
 * diletakkan di dalam elemen interaktif lain (mis. baris Link di /more atau header sheet).
 */

import React from 'react';
import { useWhatsAppStatus } from './use-whatsapp-status';

export interface WaStatusPillProps {
  stageOverride?: string;
}

export function WaStatusPill({ stageOverride }: WaStatusPillProps = {}) {
  const { status } = useWhatsAppStatus(30_000);

  const stage = stageOverride ?? status?.stage ?? 'not_connected';

  const config =
    stage === 'connected'
      ? { label: 'WA aktif', color: '#067647', bg: 'rgba(6,118,71,.08)' }
      : stage === 'disconnected' || stage === 'connecting'
        ? { label: 'WA menghubungkan…', color: '#B54708', bg: 'rgba(181,71,8,.08)' }
        : stage === 'error'
          ? { label: 'WA', color: '#71706B', bg: 'rgba(113,112,107,.08)' }
          : { label: 'WA belum aktif', color: '#71706B', bg: 'rgba(113,112,107,.08)' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 26,
        padding: '0 10px',
        borderRadius: 13,
        background: config.bg,
        font: '500 12px/16px var(--font-sans, Inter, system-ui, sans-serif)',
        color: config.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: config.color,
          flex: 'none',
        }}
      />
      {config.label}
    </span>
  );
}
