'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LearnerTabBarProps {
  ctaLabel?: string;
  ctaTargetId?: string;
  onCtaClick?: () => void;
  workspaceSlug?: string;
}

export function LearnerTabBar({
  ctaLabel,
  ctaTargetId = 'register',
  onCtaClick,
  workspaceSlug = 'rina',
}: LearnerTabBarProps) {
  const pathname = usePathname();

  const isStorefrontActive = pathname === `/p/${workspaceSlug}` || (pathname.startsWith(`/p/${workspaceSlug}`) && !ctaLabel);
  const isLearnActive = pathname === '/learn' || pathname.startsWith('/learn/programs');

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
      return;
    }
    const el = document.getElementById(ctaTargetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="Navigasi bawah pengguna"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--color-divider)',
        boxShadow: 'var(--shadow-sheet)',
        paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          gap: '8px',
        }}
      >
        {/* Tab 1: Storefront / Ruang Belajar */}
        <Link
          href={`/p/${workspaceSlug}`}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: isStorefrontActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontSize: '11px',
            fontWeight: isStorefrontActive ? 700 : 500,
            textDecoration: 'none',
            padding: '6px 0',
            borderRadius: '10px',
            backgroundColor: isStorefrontActive ? 'var(--color-primary-light)' : 'transparent',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={isStorefrontActive ? '2.4' : '1.8'}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Ruang Belajar</span>
        </Link>

        {/* Tab 2: Program Saya */}
        <Link
          href="/learn"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: isLearnActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontSize: '11px',
            fontWeight: isLearnActive ? 700 : 500,
            textDecoration: 'none',
            padding: '6px 0',
            borderRadius: '10px',
            backgroundColor: isLearnActive ? 'var(--color-primary-light)' : 'transparent',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={isLearnActive ? '2.4' : '1.8'}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Program Saya</span>
        </Link>

        {/* Action button if CTA label provided */}
        {ctaLabel ? (
          <button
            onClick={handleCtaClick}
            className="touch-target-primary"
            style={{
              flex: 1.4,
              minHeight: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              fontWeight: 780,
              fontSize: '13px',
              border: 0,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {ctaLabel}
          </button>
        ) : (
          <Link
            href={`/p/${workspaceSlug}#programs`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '6px 0',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Katalog</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
