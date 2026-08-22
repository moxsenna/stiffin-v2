'use client';

import React from 'react';
import { PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { ProgramCard } from './ProgramCard';

interface ProgramCatalogProps {
  items: PublicProgramCatalogItem[];
  workspaceSlug: string;
}

export function ProgramCatalog({ items, workspaceSlug }: ProgramCatalogProps) {
  if (!items || items.length === 0) {
    return (
      <section id="programs" className="container" style={{ paddingTop: '40px', paddingBottom: '48px' }}>
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            color: 'var(--color-text-muted)',
            fontSize: '14px',
          }}
        >
          Belum ada program publik yang diterbitkan saat ini.
        </div>
      </section>
    );
  }

  return (
    <section id="programs" className="container" style={{ paddingTop: '40px', paddingBottom: '48px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2
          style={{
            fontSize: 'clamp(24px, 3.5vw, 36px)',
            letterSpacing: '-0.03em',
            fontWeight: 850,
            marginBottom: '8px',
            color: 'var(--color-text-main)',
          }}
        >
          Katalog Program Edukasi
        </h2>
        <p style={{ fontSize: '14.5px', color: 'var(--color-text-muted)', margin: 0, maxWidth: '600px' }}>
          Pilih materi pembelajaran yang sesuai dengan tahap pendampingan anak dan keluarga Anda.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        {items.map((item) => (
          <ProgramCard key={item.program.id} item={item} workspaceSlug={workspaceSlug} />
        ))}
      </div>
    </section>
  );
}
