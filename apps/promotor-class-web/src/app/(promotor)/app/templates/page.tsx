'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getTemplatesQuery } from '@/modules/templates/queries';
import { ProgramTemplate } from '@/modules/templates/ports';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);

  useEffect(() => {
    getTemplatesQuery().then(setTemplates);
  }, []);

  return (
    <PromotorShell>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Template Program</h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Jalur tercepat membuat program edukasi berkualitas dari struktur teruji
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {templates.map(tmpl => (
            <div
              key={tmpl.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    display: 'inline-block',
                    marginBottom: '8px',
                  }}
                >
                  {tmpl.priceType === 'free' ? 'Lead Magnet' : 'Paid Program'}
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{tmpl.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
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
                  fontWeight: 600,
                  borderRadius: 'var(--border-radius-sm)',
                  textAlign: 'center',
                }}
              >
                Gunakan Template Ini
              </Link>
            </div>
          ))}
        </div>
      </div>
    </PromotorShell>
  );
}
