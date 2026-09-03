'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { PageHeader, EmptyState, LoadingRows } from '@/components/ui';
import { getTemplatesQuery } from '@/modules/templates/queries';
import { ProgramTemplate } from '@/modules/templates/ports';
import { isTemplatesEnabled } from '@/lib/feature-flags';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ProgramTemplate[] | null>(null);

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
      <div style={{ padding: '24px 16px', maxWidth: '840px', margin: '0 auto' }}>
        <PageHeader
          kicker="Talira Class"
          title="Template Program Edukasi"
          sub="Jalur tercepat membuat program edukasi berkualitas dari struktur kurikulum teruji"
        />

        <div style={{ marginTop: '20px' }}>
          {templates === null ? (
            <LoadingRows rows={3} />
          ) : templates.length === 0 ? (
            <EmptyState
              title="Belum ada template tersedia"
              explanation="Template kurikulum dan program terstandar akan muncul di sini."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {templates.map(tmpl => (
                <div
                  key={tmpl.id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 750,
                        padding: '3px 8px',
                        borderRadius: '0px',
                        backgroundColor: '#ffe0d9',
                        color: 'var(--accent-dark)',
                        display: 'inline-block',
                        marginBottom: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {tmpl.priceType === 'free' ? 'Lead Magnet (Gratis)' : 'Paid Program (Berbayar)'}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '6px' }}>{tmpl.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                      {tmpl.description}
                    </p>
                  </div>

                  <Link
                    href={`/app/programs/new?templateId=${tmpl.id}`}
                    className="touch-target-primary"
                    style={{
                      marginTop: '8px',
                      backgroundColor: 'var(--accent-dark)',
                      color: '#FFF',
                      fontWeight: 750,
                      borderRadius: '0px',
                      textAlign: 'center',
                      fontSize: '13.5px',
                    }}
                  >
                    Gunakan Template Ini →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PromotorShell>
  );
}
