'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { PublicWorkspaceProfile, PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PwaAppHeader, PwaChips, PwaDock, PwaSearchBar, PwaSectionHead, PwaStars } from '@/components/pwa/pwa';
import { formatIDR } from '@promotor/platform-core';

interface CatalogClientProps {
  profile: PublicWorkspaceProfile;
  catalog: PublicProgramCatalogItem[];
}

export function CatalogClient({ profile, catalog }: CatalogClientProps) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Semua');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      const hay = `${item.program.title} ${item.program.subtitle ?? ''} ${item.presentation.shortOutcome ?? ''}`.toLowerCase();
      if (cat === 'Gratis' && item.program.priceAmount !== 0 && item.program.programType !== 'lead_magnet') return false;
      if (cat === 'Berbayar' && !(item.program.priceAmount > 0)) return false;
      return !q || hay.includes(q);
    });
  }, [catalog, search, cat]);

  return (
    <div className="pwa-screen">
      <PwaAppHeader workspaceSlug={profile.workspaceSlug} brandName="Ralivo" />

      <main className="pwa-wrap pwa-screen-pad-dock">
        <div style={{ paddingTop: 12 }}>
          <PwaSearchBar value={search} onChange={setSearch} placeholder="Cari e-course, materi, atau program..." onFilterClick={() => setCat('Semua')} />
        </div>
        <div style={{ marginTop: 10 }}>
          <PwaChips items={['Semua', 'Gratis', 'Berbayar']} active={cat} onChange={setCat} />
        </div>

        <PwaSectionHead title={`Katalog Program (${filtered.length})`} />

        {filtered.length === 0 ? (
          <div className="pwa-card pwa-card-pad pwa-muted" style={{ textAlign: 'center' }}>
            Tidak ada program yang sesuai dengan kriteria pencarian.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((item) => {
              const paid = item.program.pricing === 'one_time' && item.program.priceAmount > 0;
              const lessons = item.program.totalLessonsCount || item.program.totalModulesCount || 0;
              return (
                <article key={item.program.id} className="pwa-card pwa-card-pad">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="pwa-pill pwa-pill-blue">{(item.presentation.heroEyebrow || 'Program').toUpperCase()}</span>
                    {paid ? <span className="pwa-pill pwa-pill-amber">Berbayar</span> : <span className="pwa-pill pwa-pill-green">Gratis</span>}
                  </div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 850, margin: '8px 0 0', lineHeight: 1.3 }}>
                    <Link href={`/p/${profile.workspaceSlug}/${item.program.programSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {item.program.title}
                    </Link>
                  </h3>
                  <p className="pwa-muted" style={{ marginTop: 4 }}>
                    {item.presentation.shortOutcome || item.program.subtitle || item.program.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5 }}>
                    <PwaStars value={5} size={12} />
                    <strong>4.9</strong>
                    <span style={{ color: 'var(--pwa-subtle)' }}>• {lessons} Materi • {item.presentation.durationLabel || 'Mandiri'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
                    <strong style={{ fontSize: 16 }}>{paid ? formatIDR(item.program.priceAmount) : 'Gratis'}</strong>
                    <Link href={`/p/${profile.workspaceSlug}/${item.program.programSlug}`} className="pwa-cta" style={{ width: 'auto', flex: 'none', padding: '0 18px' }}>
                      {paid ? 'Ikuti Kelas' : 'Mulai Gratis'}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <PublicFooter displayName={profile.displayName.split(' ')[0]} />
      </main>

      <PwaDock workspaceSlug={profile.workspaceSlug} />
    </div>
  );
}
