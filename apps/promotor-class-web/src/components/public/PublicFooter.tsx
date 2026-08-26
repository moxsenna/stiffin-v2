'use client';

import React from 'react';

interface PublicFooterProps {
  displayName: string;
}

export function PublicFooter({ displayName }: PublicFooterProps) {
  return (
    <footer
      style={{
        paddingTop: '38px',
        paddingBottom: '54px',
        borderTop: '1px solid var(--color-divider)',
        color: 'var(--color-text-muted)',
        fontSize: '12px',
      }}
    >
     <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
       <span>© 2026 Ruang Belajar {displayName}</span>
       <span>Didukung oleh PromotorClass</span>
     </div>
   </footer>
 );
}
