'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getTemplatesQuery } from '@/modules/templates/queries';
import { ProgramTemplate } from '@/modules/templates/ports';
import { isTemplatesEnabled } from '@/lib/feature-flags';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);

  useEffect(() => {
    if (isTemplatesEnabled()) {
      getTemplatesQuery().then(setTemplates);
    }
  }, []);

  if (!isTemplatesEnabled()) {
    return notFound();
  }

  return (
    <PromotorShell>
      <div style={{ padding: '24px 20px', maxWidth: '880px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '4px', color: 'var(--color-text-main)' }}>
            Template Program Edukasi
          </h1>
          <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
            Jalur tercepat membuat program edukasi berkualitas dari struktur teruji
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {templates.map(tmpl => (
            <div
              key={tmpl.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid var(--color-divider)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 750,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    display: 'inline-block',
                    marginBottom: '10px',
                    border: '1px solid var(--color-primary-border)',
                  }}
                >
                  {tmpl.priceType === 'free' ? 'Gratis (Lead Magnet)' : 'Program Berbayar'}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text-main)' }}>{tmpl.title}</h3>
                <p style={{ fontSize: '13.5px', color: 'var(--color-text-body)', marginBottom: '16px', lineHeight: 1.55 }}>
                  {tmpl.description}
                </p>
              </div>

              <Link
                href={`/app/programs/new?templateId=${tmpl.id}`}
                className="touch-target-primary"
                style={{
                  marginTop: '16px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  fontWeight: 780,
                  fontSize: '13.5px',
                  borderRadius: 'var(--border-radius-md)',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                Gunakan Template Ini →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </PromotorShell>
  );
}
