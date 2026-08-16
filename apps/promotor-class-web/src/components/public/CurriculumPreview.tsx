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
        paddingTop: '54px',
        paddingBottom: '54px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '40px',
      }}
    >
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 820,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-primary)',
            marginBottom: '12px',
          }}
        >
          Isi program
        </div>
        <h2 style={{ fontSize: '28px', letterSpacing: '-0.03em', fontWeight: 750, margin: 0 }}>
          Ringkas, bertahap, dan mudah diikuti
        </h2>
      </div>

      <div>
        {modules.map((mod, idx) => {
          const lessonCount = mod.lessons?.length || 0;
          return (
            <div
              key={mod.id}
              style={{
                borderTop: '1px solid var(--color-divider)',
                padding: '18px 0',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#191918' }}>
                {String(idx + 1).padStart(2, '0')} · {mod.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {lessonCount} materi
              </div>

              <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                {mod.lessons.map(les => {
                  let formatLabel = 'Bacaan';
                  if (les.hasVideo && les.hasReflection) {
                    formatLabel = 'Video + Refleksi';
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
                        gap: '18px',
                        fontSize: '14px',
                        padding: '8px 0',
                        color: '#4e4d48',
                        borderBottom: '1px dashed var(--color-divider-subtle)',
                      }}
                    >
                      <span style={{ fontWeight: 550 }}>{les.title}</span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
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
