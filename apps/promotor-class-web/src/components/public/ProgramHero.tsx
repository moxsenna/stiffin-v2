'use client';

import React from 'react';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { ProgramCover } from './ProgramCover';

interface ProgramHeroProps {
  detail: PublicProgramDetail;
  onStartClick?: () => void;
}

export function ProgramHero({ detail, onStartClick }: ProgramHeroProps) {
  const { program, presentation, isRegistrationAllowed, registrationStatusNotice } = detail;

  let priceMain = 'Gratis';
  let priceSub = 'Akses penuh materi';
  if (program.programType === 'aftersales') {
    priceMain = 'Khusus Peserta Tes';
    priceSub = 'Khusus alumni tes STIFIn';
  } else if (program.pricing === 'one_time' && program.priceAmount) {
    priceMain = `Rp${program.priceAmount.toLocaleString('id-ID')}`;
    priceSub = 'Pembayaran satu kali';
  }

  const moduleCount = program.modules?.length || 0;
  const lessonCount = program.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;

  return (
    <section className="container" style={{ paddingTop: '28px', paddingBottom: '40px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '36px',
          alignItems: 'start',
        }}
      >
        {/* Cover Column */}
        <div>
          <ProgramCover
            title={program.title}
            variant={presentation.coverVariant}
            aspectRatio="16 / 10"
          />
        </div>

        {/* Copy Column */}
        <div style={{ paddingTop: '2px' }}>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              marginBottom: '14px',
              fontWeight: 850,
              color: 'var(--color-text-main)',
            }}
          >
            {program.title}
          </h1>

          <p
            style={{
              fontSize: '15.5px',
              lineHeight: 1.65,
              color: 'var(--color-text-body)',
              marginBottom: '20px',
            }}
          >
            {program.description || program.subtitle}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '10px',
              margin: '16px 0 20px',
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 850, color: 'var(--color-text-main)' }}>
              {priceMain}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {priceSub}
            </div>
          </div>

          {/* Metadata Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderTop: '1px solid var(--color-divider)',
              borderBottom: '1px solid var(--color-divider)',
              margin: '20px 0',
              padding: '14px 0',
            }}
          >
            <div>
              <strong style={{ fontSize: '13.5px', display: 'block', fontWeight: 800, color: 'var(--color-text-main)' }}>
                {presentation.durationLabel}
              </strong>
              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>ritme belajar</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: '12px' }}>
              <strong style={{ fontSize: '13.5px', display: 'block', fontWeight: 800, color: 'var(--color-text-main)' }}>
                {lessonCount > 0 ? `${lessonCount} materi` : `${moduleCount} modul`}
              </strong>
              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>video & refleksi</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: '12px' }}>
              <strong style={{ fontSize: '13.5px', display: 'block', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Mandiri
              </strong>
              <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>akses kapan saja</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {isRegistrationAllowed ? (
              <button
                onClick={onStartClick}
                className="touch-target-primary"
                style={{
                  borderRadius: 'var(--border-radius-md)',
                  padding: '0 24px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14.5px',
                  border: 0,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                Mulai Belajar Sekarang
              </button>
            ) : (
              <a
                href="#register"
                className="touch-target-primary"
                style={{
                  borderRadius: 'var(--border-radius-md)',
                  padding: '0 22px',
                  backgroundColor: 'var(--color-text-muted)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14px',
                  border: 0,
                  textDecoration: 'none',
                }}
              >
                {program.programType === 'aftersales' ? 'Akses Peserta Tes STIFIn' : 'Informasi Pendaftaran'}
              </a>
            )}

            <a
              href="#curriculum"
              className="touch-target-primary"
              style={{
                borderRadius: 'var(--border-radius-md)',
                padding: '0 20px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-main)',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              Lihat Isi Kurikulum
            </a>
          </div>

          {registrationStatusNotice && (
            <div
              style={{
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                fontStyle: 'italic',
              }}
            >
              {registrationStatusNotice}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
