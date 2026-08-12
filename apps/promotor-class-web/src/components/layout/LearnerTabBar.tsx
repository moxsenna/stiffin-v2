'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LearnerTabBar() {
  const pathname = usePathname();

  const isTabActive = (path: string) => {
    if (path === '/learn' && pathname === '/learn') return true;
    if (path !== '/learn' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav
      className="mobile-only"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 80,
        boxShadow: 'var(--shadow-sheet)',
      }}
    >
      <Link
        href="/learn"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: isTabActive('/learn') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/learn') ? 600 : 400,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/learn') ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>Program Saya</span>
      </Link>
    </nav>
  );
}
