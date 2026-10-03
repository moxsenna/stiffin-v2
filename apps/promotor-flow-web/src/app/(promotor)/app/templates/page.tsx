'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { BrandKicker, EmptyState, LoadingRows } from '@/components/ui';
import { messagingQueries } from '@/lib/container';
import { MessageTemplate } from '@promotor/promotor-flow-fixtures';

const TONE_TABS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'HANGAT', label: 'Hangat' },
  { value: 'FORMAL', label: 'Formal' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'CLASS', label: 'Sinyal Class' },
];

const SMART_TOKENS = ['[Nama]', '[Layanan]', '[Tanggal]', '[LinkBooking]', '[HasilSTIFIn]'];

function toneBadgeClass(tmpl: MessageTemplate): string {
  if (tmpl.category === 'AFTERCARE') return 'hv-tone-badge-retensi';
  if (tmpl.tone === 'HANGAT') return 'hv-tone-badge-hangat';
  if (tmpl.tone === 'FORMAL') return 'hv-tone-badge-formal';
  if (tmpl.tone === 'URGENT') return 'hv-tone-badge-urgent';
  return 'hv-tone-badge-class';
}

function toneLabel(tmpl: MessageTemplate): string {
  if (tmpl.id === 'tmpl_followup_class_signal') return 'Sinyal Class';
  if (tmpl.category === 'AFTERCARE') return 'Retensi';
  if (tmpl.tone === 'HANGAT') return 'Hangat';
  if (tmpl.tone === 'FORMAL') return 'Formal';
  if (tmpl.tone === 'URGENT') return 'Urgent';
  return 'Netral';
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    messagingQueries
      .listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!templates) return null;
    if (selectedTone === 'ALL') return templates;
    if (selectedTone === 'CLASS') {
      return templates.filter((t) => t.id === 'tmpl_followup_class_signal' || t.category === 'AFTERCARE');
    }
    return templates.filter((t) => t.tone === selectedTone);
  }, [templates, selectedTone]);

  const handleCopy = async (tmpl: MessageTemplate) => {
    try {
      await navigator.clipboard.writeText(tmpl.templateText);
      setCopiedId(tmpl.id);
      setTimeout(() => setCopiedId((id) => (id === tmpl.id ? null : id)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleOneTap = (tmpl: MessageTemplate) => {
    const waUrl = messagingQueries.buildWhatsAppUrl('', tmpl.templateText);
    window.open(waUrl, '_blank', 'noopener');
  };

  return (
    <AppShell showBottomNav={true}>
      <div className="hv-page">
        <div className="hv-topnav">
          <div>
            <BrandKicker />
            <h1 className="hv-page-title">Template WhatsApp Cerdas</h1>
            <div className="hv-page-sub">Draft standar + token otomatis untuk tindak lanjut 1-tap.</div>
          </div>
        </div>

        <div className="hv-column">
          <div className="hv-hero-card">
            <div className="hv-hero-kicker">Smart token injection</div>
            <div className="hv-hero-title">Token terisi otomatis saat kirim</div>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: '#cbd5e1' }}>
              Pilih kartu, tekan 1-tap, nama + layanan + link booking terisi sendiri.
            </div>
            <div className="hv-token-pills">
              {SMART_TOKENS.map((t) => (
                <span key={t} className="hv-token-pill">{t}</span>
              ))}
            </div>
          </div>

          <div className="hv-pill-row" role="group" aria-label="Filter nada">
            {TONE_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`hv-pill${selectedTone === t.value ? ' is-active' : ''}`}
                aria-pressed={selectedTone === t.value}
                onClick={() => setSelectedTone(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!filteredTemplates && <LoadingRows rows={3} />}

          {filteredTemplates && filteredTemplates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--hv-muted)' }}>
                {filteredTemplates.length} template
              </div>
              {filteredTemplates.map((tmpl) => (
                <article key={tmpl.id} className="hv-card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 750, fontSize: 14, color: 'var(--hv-text)' }}>{tmpl.title}</div>
                    <span className={`hv-tone-badge ${toneBadgeClass(tmpl)}`}>{toneLabel(tmpl)}</span>
                  </div>
                  <div className="hv-message-box" style={{ marginTop: 8 }}>
                    {tmpl.templateText}
                  </div>
                  <div className="hv-actions-row" style={{ marginTop: 8 }}>
                    <button type="button" className="hv-wa-btn" onClick={() => handleOneTap(tmpl)}>
                      Kirim ke WhatsApp (1-Tap)
                    </button>
                    <button type="button" className="hv-btn-sec" onClick={() => handleCopy(tmpl)}>
                      {copiedId === tmpl.id ? 'Tersalin ✓' : 'Salin'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {filteredTemplates && filteredTemplates.length === 0 && (
            <EmptyState title="Belum ada template" explanation="Tidak ada template yang cocok dengan filter nada yang dipilih." />
          )}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </AppShell>
  );
}
