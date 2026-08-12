'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LearnerTabBar() {
  const pathname = usePathname();

  const isTabActive = (path: string) => {
    if (path === '/p/rina' && (pathname === '/p/rina' || pathname.startsWith('/p/'))) return true;
    if (path === '/learn' && (pathname === '/learn' || pathname.startsWith('/learn/programs'))) return true;
    return false;
  };

  return (
    <nav
      aria-label="Navigasi bawah learner"
      className="mobile-only"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1000,
        boxShadow: 'var(--shadow-sheet)',
      }}
    >
      <Link
        href="/p/rina"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: isTabActive('/p/rina') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/p/rina') ? 700 : 500,
          textDecoration: 'none',
          padding: '6px 16px',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={isTabActive('/p/rina') ? '2.4' : '1.8'}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Ruang Belajar</span>
      </Link>

      <Link
        href="/learn"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: isTabActive('/learn') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/learn') ? 700 : 500,
          textDecoration: 'none',
          padding: '6px 16px',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={isTabActive('/learn') ? '2.4' : '1.8'}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Program Saya</span>
      </Link>

      <Link
        href="/p/rina#programs"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          color: 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: 500,
          textDecoration: 'none',
          padding: '6px 16px',
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
    </nav>
  );
}
