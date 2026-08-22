'use client';

import React from 'react';

interface PublicFooterProps {
  displayName: string;
}

export function PublicFooter({ displayName }: PublicFooterProps) {
  return (
    <footer
      style={{
        paddingTop: '36px',
        paddingBottom: '54px',
        borderTop: '1px solid var(--color-divider)',
        color: 'var(--color-text-muted)',
        fontSize: '12.5px',
        backgroundColor: 'var(--color-canvas)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <span>© {new Date().getFullYear()} Ruang Belajar {displayName || 'STIFIn'}</span>
        <span style={{ color: 'var(--color-text-subtle)' }}>Didukung oleh PromotorClass</span>
      </div>
    </footer>
  );
}
