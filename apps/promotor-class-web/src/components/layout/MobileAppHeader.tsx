'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileAppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  showProfile?: boolean;
  workspaceSlug?: string;
}

export function MobileAppHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  showProfile = true,
}: MobileAppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className="mobile-only"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        height: '56px',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
        {showBack && (
          <button
            onClick={handleBack}
            aria-label="Kembali"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-hover)',
              color: 'var(--color-text-main)',
              border: '1px solid var(--color-divider)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            style={{
              fontSize: '15px',
              fontWeight: 780,
              color: 'var(--color-text-main)',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.25,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {showProfile && (
        <Link
          href="/learn/profile"
          aria-label="Profil Saya"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-primary-border)',
            textDecoration: 'none',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </Link>
      )}
    </header>
  );
}
