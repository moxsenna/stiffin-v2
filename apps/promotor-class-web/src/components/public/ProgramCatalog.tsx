'use client';

import React from 'react';
import { PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { ProgramCard } from './ProgramCard';

interface ProgramCatalogProps {
  items: PublicProgramCatalogItem[];
  workspaceSlug: string;
}

export function ProgramCatalog({ items, workspaceSlug }: ProgramCatalogProps) {
  return (
    <section id="programs" className="container" style={{ padding: '72px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '24px',
          alignItems: 'flex-end',
          marginBottom: '28px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '34px', letterSpacing: '-0.035em', margin: 0, fontWeight: 750 }}>
            Program untuk Anda
          </h2>
          <p
            style={{
              maxWidth: '520px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.65,
              margin: '8px 0 0',
              fontSize: '15px',
            }}
          >
            Mulai dari program gratis, lanjut ke materi setelah tes, atau pilih pendampingan yang lebih mendalam.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '28px',
        }}
      >
        {items.map(item => (
          <ProgramCard key={item.program.id} item={item} workspaceSlug={workspaceSlug} />
        ))}
      </div>
    </section>
  );
}
