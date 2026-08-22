'use client';

import React from 'react';
import { PublicModulePreview } from '@promotor/contracts';

interface CurriculumPreviewProps {
  modules: PublicModulePreview[];
}

export function CurriculumPreview({ modules }: CurriculumPreviewProps) {
  if (!modules || modules.length === 0) return null;

  return (
    <section
      id="curriculum"
      className="container"
      style={{
        borderTop: '1px solid var(--color-divider)',
        paddingTop: '48px',
        paddingBottom: '48px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '36px',
      }}
    >
      <div>
        <h2 style={{ fontSize: '26px', letterSpacing: '-0.03em', fontWeight: 850, margin: 0, color: 'var(--color-text-main)' }}>
          Struktur & Kurikulum Program
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
          Materi disajikan ringkas, bertahap, dan dilengkapi studi kasus aplikatif.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {modules.map((mod, idx) => {
          const lessonCount = mod.lessons?.length || 0;
          return (
            <div
              key={mod.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '20px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '15.5px', color: 'var(--color-text-main)' }}>
                  Modul {idx + 1}: {mod.title}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  {lessonCount} materi
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {mod.lessons.map(les => {
                  let formatLabel = 'Bacaan';
                  if (les.hasVideo && les.hasReflection) {
                    formatLabel = 'Video & Refleksi';
                  } else if (les.hasVideo) {
                    formatLabel = 'Video';
                  } else if (les.hasReflection) {
                    formatLabel = 'Refleksi';
                  }

                  return (
                    <div
                      key={les.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                        fontSize: '13.5px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-canvas)',
                        borderRadius: 'var(--border-radius-xs)',
                        color: 'var(--color-text-body)',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{les.title}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          backgroundColor: 'var(--color-primary-light)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
