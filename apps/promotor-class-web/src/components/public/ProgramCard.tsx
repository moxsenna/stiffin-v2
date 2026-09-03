'use client';

import React from 'react';
import Link from 'next/link';
import { PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { ProgramCover } from './ProgramCover';

interface ProgramCardProps {
  item: PublicProgramCatalogItem;
  workspaceSlug: string;
}

export function ProgramCard({ item, workspaceSlug }: ProgramCardProps) {
  const { program, presentation, registrationStatusNotice } = item;

  // Format price/access label cleanly
  let priceMeta = 'Gratis (Umum)';
  if (program.programType === 'aftersales') {
    priceMeta = 'Khusus Peserta Tes STIFIn';
  } else if (program.pricing === 'one_time' && program.priceAmount) {
    priceMeta = `Rp${program.priceAmount.toLocaleString('id-ID')}`;
  }

  const moduleCount = program.totalModulesCount || 0;
  const lessonCount = program.totalLessonsCount || 0;
  const lessonMeta = lessonCount > 0 ? `${lessonCount} materi` : `${moduleCount} modul`;

  return (
    <article
      style={{
        borderTop: '1px solid var(--color-divider-subtle, #e5e7eb)',
        paddingTop: '16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Link
        href={`/p/${workspaceSlug}/${program.programSlug}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <ProgramCover
          title={program.title}
          publicLabel={presentation.heroEyebrow}
          variant={presentation.coverVariant}
          imageUrl={presentation.imageUrl || (program as any).coverImageUrl}
        />

        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--brand-accent, var(--accent-dark))',
            marginBottom: '8px',
          }}
        >
          {presentation.heroEyebrow}
        </div>

        <h3
          style={{
            fontSize: '20px',
            letterSpacing: '-0.02em',
            marginBottom: '8px',
            lineHeight: 1.25,
            fontWeight: 750,
            color: 'var(--brand-text, #111827)',
          }}
        >
          {program.title}
        </h3>

        <p
          style={{
            color: 'var(--brand-muted, #5a5954)',
            fontSize: '14px',
            lineHeight: 1.55,
            marginBottom: '14px',
            minHeight: '44px',
          }}
        >
          {presentation.shortOutcome || program.description || program.subtitle}
        </p>

        {/* Metadata row */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            fontSize: '12px',
            color: 'var(--brand-muted, #5a5954)',
            marginBottom: '14px',
          }}
        >
          <span>{presentation.durationLabel}</span>
          <span>·</span>
          <span>{lessonMeta}</span>
          <span>·</span>
          <span style={{ fontWeight: 700, color: 'var(--brand-text, #111827)' }}>{priceMeta}</span>
        </div>
      </Link>

      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
        <Link
          href={`/p/${workspaceSlug}/${program.programSlug}`}
          style={{
            border: 0,
            backgroundColor: 'transparent',
            color: 'var(--brand-accent, var(--accent-dark))',
            fontWeight: 700,
            padding: '8px 0',
            fontSize: '14px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Lihat program →
        </Link>
        {registrationStatusNotice && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--brand-muted, #64748b)',
              marginTop: '4px',
              fontStyle: 'italic',
            }}
          >
            {registrationStatusNotice}
          </div>
        )}
      </div>
    </article>
  );
}
