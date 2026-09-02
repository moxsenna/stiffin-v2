'use client';

import React from 'react';
import Link from 'next/link';

interface PublicHeaderProps {
  workspaceSlug: string;
  displayName?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  onPrimaryClick?: () => void;
}

export function PublicHeader({
  workspaceSlug,
  displayName = '',
  tagline = '',
  logoUrl,
  onPrimaryClick,
}: PublicHeaderProps) {
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : 'T';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backgroundColor: 'var(--brand-surface, rgba(247, 247, 245, 0.94))',
        borderBottom: '1px solid var(--color-divider, #e5e7eb)',
        backdropFilter: 'blur(8px)',
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
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayName || 'Logo'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--brand-radius, 0px)',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--brand-radius, 0px)',
                backgroundColor: 'var(--brand-primary, #201e1d)',
                color: 'var(--brand-primary-fg, #FFFFFF)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: '15px',
                flexShrink: 0,
              }}
            >
              {avatarLetter}
            </div>
          )}
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '15px',
                fontWeight: 750,
                lineHeight: 1.2,
                color: 'var(--brand-text, #201e1d)',
              }}
            >
              {displayName}
            </span>
            {tagline && (
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--brand-muted, #5a5954)',
                  marginTop: '2px',
                }}
              >
                {tagline}
              </span>
            )}
          </div>
        </Link>

        <nav className="desktop-only" style={{ alignItems: 'center', gap: '8px' }}>
          <a
            href="#programs"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--brand-radius-sm, 0px)',
              color: 'var(--brand-muted, #5a5954)',
              fontWeight: 600,
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
              borderRadius: 'var(--brand-radius-sm, 0px)',
              color: 'var(--brand-muted, #5a5954)',
              fontWeight: 600,
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
                backgroundColor: 'var(--brand-primary, #201e1d)',
                color: 'var(--brand-primary-fg, #FFFFFF)',
                fontWeight: 700,
                fontSize: '13px',
                padding: '9px 18px',
                borderRadius: 'var(--brand-radius, 0px)',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
            >
              Mulai belajar
            </button>
          ) : (
            <a
              href="#programs"
              style={{
                backgroundColor: 'var(--brand-primary, #201e1d)',
                color: 'var(--brand-primary-fg, #FFFFFF)',
                fontWeight: 700,
                fontSize: '13px',
                padding: '9px 18px',
                borderRadius: 'var(--brand-radius, 0px)',
                textDecoration: 'none',
                transition: 'opacity 0.15s ease',
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
