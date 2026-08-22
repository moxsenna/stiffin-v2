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

  let priceMeta = 'Gratis';
  if (program.programType === 'aftersales') {
    priceMeta = 'Khusus Peserta Tes';
  } else if (program.pricing === 'one_time' && program.priceAmount) {
    priceMeta = `Rp${program.priceAmount.toLocaleString('id-ID')}`;
  }

  const moduleCount = program.totalModulesCount || 0;
  const lessonCount = program.totalLessonsCount || 0;
  const lessonMeta = lessonCount > 0 ? `${lessonCount} materi` : `${moduleCount} modul`;

  return (
    <article
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-divider)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xs)',
        transition: 'transform var(--duration-fast) var(--ease-spring), box-shadow var(--duration-fast) ease',
      }}
    >
      <Link
        href={`/p/${workspaceSlug}/${program.programSlug}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <ProgramCover
          title={program.title}
          variant={presentation.coverVariant}
        />

        <h3
          style={{
            fontSize: '18px',
            letterSpacing: '-0.02em',
            marginTop: '4px',
            marginBottom: '8px',
            lineHeight: 1.25,
            fontWeight: 800,
            color: 'var(--color-text-main)',
          }}
        >
          {program.title}
        </h3>

        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '13.5px',
            lineHeight: 1.55,
            marginBottom: '16px',
            flex: 1,
          }}
        >
          {presentation.shortOutcome || program.description || program.subtitle}
        </p>

        {/* Metadata info strip */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-divider)',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontWeight: 600 }}>{presentation.durationLabel}</span>
          <span>·</span>
          <span>{lessonMeta}</span>
          <span>·</span>
          <span style={{ fontWeight: 780, color: 'var(--color-primary)' }}>{priceMeta}</span>
        </div>
      </Link>

      <div style={{ paddingTop: '4px' }}>
        <Link
          href={`/p/${workspaceSlug}/${program.programSlug}`}
          style={{
            width: '100%',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            fontWeight: 750,
            padding: '10px 14px',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '13px',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            border: '1px solid var(--color-primary-border)',
          }}
        >
          Buka Program
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {registrationStatusNotice && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-text-subtle)',
              marginTop: '6px',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            {registrationStatusNotice}
          </div>
        )}
      </div>
    </article>
  );
}
