'use client';

import React from 'react';
import Link from 'next/link';

interface PublicHeaderProps {
  workspaceSlug: string;
  displayName?: string | null;
  tagline?: string | null;
  onPrimaryClick?: () =>void;
}

export function PublicHeader({
  workspaceSlug,
  displayName = '',
  tagline = '',
  onPrimaryClick,
}: PublicHeaderProps) {
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : 'R';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backgroundColor: 'rgba(247, 247, 245, 0.94)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
     <div
        className="container"
        style={{
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
       <Link
          href={`/p/${workspaceSlug}`}
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
         <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '0px',
              backgroundColor: 'var(--accent-dark)',
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '15px',
              flexShrink: 0,
            }}
          >
           {avatarLetter}
          </div>
         <div>
           <span style={{ display: 'block', fontSize: '14px', fontWeight: 760, lineHeight: 1.2 }}>
             {displayName}
            </span>
           <span
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                marginTop: '2px',
              }}
            >
             {tagline}
            </span>
         </div>
       </Link>

       <nav className="desktop-only" style={{ alignItems: 'center', gap: '8px' }}>
         <a
            href="#programs"
            style={{
              padding: '8px 12px',
              borderRadius: '0px',
              color: 'var(--color-text-muted)',
              fontWeight: 650,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
           Program
          </a>
         <a
            href="#about"
            style={{
              padding: '8px 12px',
              borderRadius: '0px',
              color: 'var(--color-text-muted)',
              fontWeight: 650,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
           Tentang
          </a>
         {onPrimaryClick ? (
            <button
              onClick={onPrimaryClick}
              style={{
                border: 0,
                backgroundColor: 'var(--accent-dark)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '0px',
                cursor: 'pointer',
              }}
            >
             Mulai belajar
            </button>
         ) : (
            <a
              href="#programs"
              style={{
                backgroundColor: 'var(--accent-dark)',
                color: '#FFFFFF',
                fontWeight: 780,
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '0px',
                textDecoration: 'none',
              }}
            >
             Mulai belajar
            </a>
         )}
        </nav>
     </div>
   </header>
 );
}
