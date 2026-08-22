'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { messagingQueries } from '@/lib/container';
import { MessageTemplate } from '@promotor/promotor-flow-fixtures';
import { ChevronLeftIcon, WhatsAppIcon } from '@/components/foundation/icons';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    messagingQueries.listTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
          Template Pesan WhatsApp
        </h1>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', marginTop: '2px', marginBottom: '16px' }}>
          Draf pesan standar untuk follow-up cepat dan konsisten
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-divider)',
              padding: '18px',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '15.5px', color: 'var(--color-text-primary)' }}>
                {tmpl.title}
              </div>
              <button
                onClick={() => handleCopy(tmpl.templateText, tmpl.id)}
                className="touch-target"
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: copiedId === tmpl.id ? 'var(--color-success-soft)' : 'var(--color-surface-hover)',
                  color: copiedId === tmpl.id ? 'var(--color-success)' : 'var(--color-text-secondary)',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {copiedId === tmpl.id ? '✓ Tersalin' : 'Salin Draf'}
              </button>
            </div>

            <div
              style={{
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-canvas)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-divider)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}
            >
              {tmpl.templateText}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
