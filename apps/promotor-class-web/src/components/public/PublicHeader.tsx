'use client';

import React from 'react';
import Link from 'next/link';

interface PublicHeaderProps {
  workspaceSlug: string;
  displayName?: string | null;
  tagline?: string | null;
  onPrimaryClick?: () => void;
}

export function PublicHeader({
  workspaceSlug,
  displayName = '',
  tagline = '',
  onPrimaryClick,
}: PublicHeaderProps) {
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : 'P';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(247, 247, 244, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-divider)',
      }}
    >
      <div
        className="container"
        style={{
          height: '64px',
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
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              flexShrink: 0,
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {avatarLetter}
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '14px', fontWeight: 780, lineHeight: 1.25, letterSpacing: '-0.01em', color: 'var(--color-text-main)' }}>
              {displayName || 'Ruang Belajar STIFIn'}
            </span>
            {tagline && (
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  marginTop: '1px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tagline}
              </span>
            )}
          </div>
        </Link>

        <nav className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="#programs"
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--color-text-body)',
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
              padding: '8px 14px',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--color-text-body)',
              fontWeight: 650,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            Tentang Promotor
          </a>
          {onPrimaryClick ? (
            <button
              onClick={onPrimaryClick}
              className="touch-target"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 750,
                fontSize: '13px',
                padding: '8px 18px',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              Mulai Belajar
            </button>
          ) : (
            <a
              href="#programs"
              className="touch-target"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontWeight: 750,
                fontSize: '13px',
                padding: '8px 18px',
                borderRadius: 'var(--border-radius-md)',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              Mulai Belajar
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
