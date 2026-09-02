'use client';

import React from 'react';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { ProgramCover } from './ProgramCover';

interface ProgramHeroProps {
  detail: PublicProgramDetail;
  onStartClick?: () =>void;
}

export function ProgramHero({ detail, onStartClick }: ProgramHeroProps) {
  const { program, presentation, isRegistrationAllowed, registrationStatusNotice } = detail;

  let priceMain = 'Gratis';
  let priceSub = 'akses seluruh materi';
  if (program.programType === 'aftersales') {
    priceMain = 'Khusus Peserta Tes';
    priceSub = 'akses bagi alumni tes STIFIn';
  } else if (program.pricing === 'one_time' && program.priceAmount) {
    priceMain = `Rp${program.priceAmount.toLocaleString('id-ID')}`;
    priceSub = 'pembayaran sekali';
  }

  const moduleCount = program.modules?.length || 0;
  const lessonCount = program.modules?.reduce((acc, m) =>acc + (m.lessons?.length || 0), 0) || 0;

  return (
    <section className="container" style={{ paddingTop: '28px', paddingBottom: '44px' }}>
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
            publicLabel={presentation.heroEyebrow}
            variant={presentation.coverVariant}
            imageUrl={presentation.imageUrl || (program as any).coverImageUrl}
            aspectRatio="16 / 10"
          />
       </div>

       {/* Copy Column */}
        <div style={{ paddingTop: '4px' }}>
         <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 850,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--accent-dark)',
              marginBottom: '12px',
            }}
          >
           {presentation.heroEyebrow}
          </span>

         <h1
            style={{
              fontSize: 'clamp(30px, 4vw, 48px)',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: '14px',
              fontWeight: 800,
            }}
          >
           {program.title}
          </h1>

         <p
            style={{
              fontSize: '16px',
              lineHeight: 1.65,
              color: '#55544f',
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
           <div style={{ fontSize: '28px', fontWeight: 850, color: '#191918' }}>{priceMain}</div>
           <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{priceSub}</div>
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
             <strong style={{ fontSize: '13px', display: 'block', fontWeight: 800 }}>
               {presentation.durationLabel}
              </strong>
             <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ritme belajar</span>
           </div>
           <div style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: '12px' }}>
             <strong style={{ fontSize: '13px', display: 'block', fontWeight: 800 }}>
               {lessonCount >0 ? `${lessonCount} materi` : `${moduleCount} modul`}
              </strong>
             <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>video + refleksi</span>
           </div>
           <div style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: '12px' }}>
             <strong style={{ fontSize: '13px', display: 'block', fontWeight: 800 }}>Mandiri</strong>
             <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>akses kapan saja</span>
           </div>
         </div>

         <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
           {isRegistrationAllowed ? (
              <button
                onClick={onStartClick}
                style={{
                  minHeight: '46px',
                  borderRadius: '0px',
                  padding: '0 20px',
                  backgroundColor: 'var(--accent-dark)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14px',
                  border: 0,
                  cursor: 'pointer',
                }}
              >
               Mulai belajar gratis
              </button>
           ) : (
              <a
                href="#register"
                style={{
                  minHeight: '46px',
                  borderRadius: '0px',
                  padding: '0 20px',
                  backgroundColor: 'var(--color-text-muted)',
                  color: '#FFFFFF',
                  fontWeight: 780,
                  fontSize: '14px',
                  border: 0,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
               {program.programType === 'aftersales' ? 'Akses Peserta Tes STIFIn' : 'Informasi Pendaftaran'}
              </a>
           )}

            <a
              href="#curriculum"
              style={{
                minHeight: '46px',
                borderRadius: '0px',
                padding: '0 20px',
                border: '1px solid var(--color-divider)',
                backgroundColor: '#FFFFFF',
                color: '#191918',
                fontWeight: 760,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
             Lihat isi program
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
