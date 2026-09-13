'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SectionHead, EmptyState, LoadingRows } from '@/components/ui';
import { messagingQueries } from '@/lib/container';
import { MessageTemplate } from '@promotor/promotor-flow-fixtures';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>('ALL');

  useEffect(() => {
    messagingQueries
      .listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!templates) return null;
    if (selectedTone === 'ALL') return templates;
    if (selectedTone === 'NETRAL') return templates.filter((t) => !t.tone);
    return templates.filter((t) => t.tone === selectedTone);
  }, [templates, selectedTone]);

  return (
    <AppShell showBottomNav={true}>
      <PageHeader kicker="Ralivo Flow" title="Template Pesan WhatsApp" sub="Draft pesan standar untuk tindak lanjut cepat." />

      <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)' }}>
        <label htmlFor="tone-filter" style={{ font: '600 13px/1.4 var(--font-sans)', color: 'var(--muted-strong)', flexShrink: 0 }}>
          Nada pesan:
        </label>
        <select
          id="tone-filter"
          className="input"
          value={selectedTone}
          onChange={(e) => setSelectedTone(e.target.value)}
          style={{ height: 38 }}
        >
          <option value="ALL">Semua nada</option>
          <option value="FORMAL">Formal</option>
          <option value="HANGAT">Hangat</option>
          <option value="URGENT">Urgent</option>
          <option value="NETRAL">Netral (kosong)</option>
        </select>
      </div>

      {!filteredTemplates && <LoadingRows rows={3} />}

      {filteredTemplates && filteredTemplates.length > 0 && (
        <>
          <SectionHead label="Template" count={`${filteredTemplates.length}`} />
          {filteredTemplates.map((tmpl) => (
            <div key={tmpl.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ font: '700 15px/1.25 var(--font-sans)' }}>{tmpl.title}</div>
                <span className="badge" style={{ fontSize: 11 }}>
                  {tmpl.tone === 'FORMAL' ? 'Formal' : tmpl.tone === 'HANGAT' ? 'Hangat' : tmpl.tone === 'URGENT' ? 'Urgent' : 'Netral'}
                </span>
              </div>
              <div style={{ marginTop: 6, borderLeft: '2px solid var(--ink)', paddingLeft: 12, font: '400 13px/1.55 var(--font-sans)', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {tmpl.templateText}
              </div>
            </div>
          ))}
        </>
      )}

      {filteredTemplates && filteredTemplates.length === 0 && (
        <EmptyState title="Belum ada template" explanation="Tidak ada template yang cocok dengan filter nada yang dipilih." />
      )}
      <div style={{ height: 24 }} />
    </AppShell>
  );
}
