'use client';

import React, { useState } from 'react';
import { PublicWorkspaceProfile, PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { ProgramCard } from '@/components/public/ProgramCard';
import { MobileAppHeader } from '@/components/layout/MobileAppHeader';
import { LearnerTabBar } from '@/components/layout/LearnerTabBar';

interface CatalogClientProps {
  profile: PublicWorkspaceProfile;
  catalog: PublicProgramCatalogItem[];
}

export function CatalogClient({ profile, catalog }: CatalogClientProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'client'>('all');

  const filteredCatalog = catalog.filter(item => {
    // Search matching
    const matchesSearch =
      item.program.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.program.subtitle || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.presentation.shortOutcome || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Filter matching
    if (filter === 'free') {
      return item.program.priceAmount === 0 || item.program.programType === 'lead_magnet';
    }
    if (filter === 'client') {
      return item.program.programType === 'aftersales';
    }
    return true;
  });

  return (
    <div
      className="page-wrapper-with-bottom-nav"
      style={{
        backgroundColor: 'var(--color-surface-muted)',
        minHeight: '100vh',
        color: 'var(--color-text-main)',
      }}
    >
      {/* Mobile Top App Header */}
      <MobileAppHeader
        title="Katalog Program"
        subtitle={`Ruang Belajar ${profile.displayName.split(' ')[0]}`}
        showProfile={true}
        workspaceSlug={profile.workspaceSlug}
      />

      {/* Desktop Header */}
      <div className="desktop-only">
        <PublicHeader
          workspaceSlug={profile.workspaceSlug}
          displayName={profile.displayName}
          tagline={profile.tagline}
        />
      </div>

      <main className="container" style={{ paddingTop: '24px', paddingBottom: '48px' }}>
        {/* Title & Description */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: 750, letterSpacing: '-0.03em', marginBottom: '8px' }}>
            Katalog Program Edukasi
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
            Pilih program yang sesuai dengan kebutuhan pengembangan diri dan pola belajar Anda.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari program belajar..."
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '0 16px 0 40px',
                borderRadius: '12px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: filter === 'all' ? 700 : 500,
                backgroundColor: filter === 'all' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filter === 'all' ? '#FFFFFF' : 'var(--color-text-main)',
                border: filter === 'all' ? 'none' : '1px solid var(--color-divider)',
                cursor: 'pointer',
              }}
            >
              Semua ({catalog.length})
            </button>
            <button
              onClick={() => setFilter('free')}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: filter === 'free' ? 700 : 500,
                backgroundColor: filter === 'free' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filter === 'free' ? '#FFFFFF' : 'var(--color-text-main)',
                border: filter === 'free' ? 'none' : '1px solid var(--color-divider)',
                cursor: 'pointer',
              }}
            >
              Gratis
            </button>
            <button
              onClick={() => setFilter('client')}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: filter === 'client' ? 700 : 500,
                backgroundColor: filter === 'client' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filter === 'client' ? '#FFFFFF' : 'var(--color-text-main)',
                border: filter === 'client' ? 'none' : '1px solid var(--color-divider)',
                cursor: 'pointer',
              }}
            >
              Untuk Klien
            </button>
          </div>
        </div>

        {/* Program Cards Grid */}
        {filteredCatalog.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '16px',
              border: '1px solid var(--color-divider)',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
            }}
          >
            Tidak ada program yang sesuai dengan kriteria pencarian.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredCatalog.map(item => (
              <ProgramCard key={item.program.id} item={item} workspaceSlug={profile.workspaceSlug} />
            ))}
          </div>
        )}
      </main>

      <PublicFooter displayName={profile.displayName.split(' ')[0]} />

      {/* Global Bottom Navigation */}
      <LearnerTabBar workspaceSlug={profile.workspaceSlug} />
    </div>
  );
}
