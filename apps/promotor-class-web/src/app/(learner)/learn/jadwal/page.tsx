'use client';

import React from 'react';
import { PwaAppHeader, PwaDock } from '@/components/pwa/pwa';
import { resolveWorkspaceSlug } from '@/lib/session';

export default function JadwalPage() {
  const [slug, setSlug] = React.useState<string | null>(null);
  React.useEffect(() => {
    setSlug(resolveWorkspaceSlug());
  }, []);

  return (
    <div className="pwa-screen">
      <PwaAppHeader title="Jadwal Live" subtitle="COHORT & MENTORING" showCart={false} workspaceSlug={slug ?? undefined} />
      <main className="pwa-wrap pwa-screen-pad-dock">
        <div className="pwa-card pwa-card-pad" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="pwa-pill pwa-pill-live"><span className="pwa-dot-live" /> HARI INI • 19:30 - 21:30 WIB</span>
            <span className="pwa-pill pwa-pill-amber">Mulai dlm 1j 45m</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 850, marginTop: 8 }}>Live Coding: Fine-Tuning Llama 3 with LoRA & Unsloth</div>
          <div className="pwa-muted">Pemateri: Fahri Ramadhan • Zoom Room ID: 884-219-030 • Pass: RLV2025</div>
          <button type="button" className="pwa-cta" style={{ marginTop: 10 }}>Gabung Sesi Live</button>
        </div>
        <div className="pwa-card pwa-card-pad" style={{ marginTop: 8 }}>
          <span className="pwa-pill pwa-pill-blue">BESOK • 20:00 WIB</span>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 8 }}>Office Hours: Code Review & Konsultasi Milestone 2</div>
          <div className="pwa-muted">Mentor: Alex Pratama • Google Meet • Pengingat Aktif ✓</div>
        </div>
        <div className="pwa-card pwa-card-pad" style={{ marginTop: 8 }}>
          <span className="pwa-pill pwa-pill-cyan">MINGGU • 10:00 WIB</span>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 8 }}>Weekend Intensive: Demo & Portfolio Review</div>
          <div className="pwa-muted">Batch 04 • Sabtu & Minggu, 10.00-12.30 WIB</div>
        </div>
      </main>
      <PwaDock workspaceSlug={slug ?? undefined} />
    </div>
  );
}
