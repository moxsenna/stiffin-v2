'use client';

import React from 'react';
import { LearningOutcome } from '@/modules/public-storefront/types';

interface LearningOutcomesProps {
  outcomes: LearningOutcome[];
}

export function LearningOutcomes({ outcomes }: LearningOutcomesProps) {
  if (!outcomes || outcomes.length === 0) return null;

  return (
    <section
      id="outcomes"
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
          Apa yang Akan Anda Bawa Pulang
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '8px', lineHeight: 1.6 }}>
          Manfaat nyata dan keterampilan praktis yang dapat langsung diterapkan dalam mendampingi anak dan keluarga.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
        }}
      >
        {outcomes.map((item, idx) => (
          <div
            key={idx}
            style={{
              borderTop: '1px solid var(--color-divider)',
              paddingTop: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <b style={{ fontSize: '15px', fontWeight: 780, color: 'var(--color-text-main)' }}>
                {item.title}
              </b>
            </div>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-text-body)',
                lineHeight: 1.6,
                margin: 0,
                paddingLeft: '30px',
              }}
            >
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
