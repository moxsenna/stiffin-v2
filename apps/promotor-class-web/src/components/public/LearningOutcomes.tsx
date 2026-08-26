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
            color: 'var(--accent-dark)',
            marginBottom: '12px',
          }}
        >
         Hasil yang diharapkan
        </div>
       <h2 style={{ fontSize: '28px', letterSpacing: '-0.03em', fontWeight: 750, margin: 0 }}>
         Apa yang akan Anda bawa pulang
        </h2>
     </div>

     <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
        }}
      >
       {outcomes.map((item, idx) =>(
          <div
            key={idx}
            style={{
              borderTop: '1px solid var(--color-divider)',
              paddingTop: '14px',
            }}
          >
           <b style={{ display: 'block', marginBottom: '6px', fontSize: '15px', color: '#191918' }}>
             {item.title}
            </b>
           <p
              style={{
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.55,
                margin: 0,
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
