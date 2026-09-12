'use client';
import React from 'react';
import type { JourneyItem } from '@promotor/contracts';

export function JourneyTimeline({ items }: { items: JourneyItem[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ padding: '8px 0 4px' }}>
      {items.map((it, i) => {
        const isClass = it.app === 'CLASS';
        const color = isClass ? '#2563EB' : '#06B6D4';
        const last = i === items.length - 1;
        return (
          <div
            key={`${it.app}-${it.type}-${i}`}
            style={{ display: 'flex', gap: 12, paddingBottom: last ? 0 : 12, position: 'relative' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flex: 'none' }} />
              {!last && <span style={{ width: 1, flex: 1, background: 'var(--line, #E2E8F0)' }} />}
            </div>
            <div style={{ minWidth: 0, opacity: isClass ? 1 : 0.55 }}>
              <div style={{ font: '700 13px/1.35 var(--font-sans)', color: 'var(--text-main, #0B0F19)' }}>
                {it.title}
              </div>
              {it.detail && <div className="row-meta">{it.detail}</div>}
              <div style={{ font: '700 9px/1 var(--font-sans)', color, marginTop: 3, letterSpacing: '0.08em' }}>
                {isClass ? 'CLASS' : 'FLOW'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
