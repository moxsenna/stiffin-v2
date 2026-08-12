'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function PromotorTabBar() {
  const pathname = usePathname();

  const isTabActive = (path: string) => {
    if (path === '/app' && pathname === '/app') return true;
    if (path !== '/app' && pathname.startsWith(path)) return true;
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
        height: 'calc(68px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1000,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      <Link
        href="/app"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: isTabActive('/app') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/app') ? 600 : 400,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/app') ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1h-4.5v-6h-7v6H4a1 1 0 0 1-1-1z" />
        </svg>
        <span>Beranda</span>
      </Link>

      <Link
        href="/app/programs"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: isTabActive('/app/programs') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/app/programs') ? 600 : 400,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/app/programs') ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v13H5.5A1.5 1.5 0 0 0 4 18.5z" />
          <path d="M4 18.5A1.5 1.5 0 0 0 5.5 20H19" />
          <path d="M8.5 8.5h6" />
        </svg>
        <span>Program</span>
      </Link>

      <Link
        href="/app/learners"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: isTabActive('/app/learners') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/app/learners') ? 600 : 400,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/app/learners') ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9.5" cy="8.5" r="3.2" />
          <path d="M3.5 19.5c0-3 2.7-4.8 6-4.8s6 1.8 6 4.8" />
          <path d="M16.5 6.6a3.2 3.2 0 0 1 0 6.1" />
          <path d="M18 15.2c1.7.6 2.9 1.9 2.9 4.3" />
        </svg>
        <span>Peserta</span>
      </Link>

      <Link
        href="/app/activity"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: isTabActive('/app/activity') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/app/activity') ? 600 : 400,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/app/activity') ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2.5-6.5 5 13L17 12h4" />
        </svg>
        <span>Aktivitas</span>
      </Link>

      <Link
        href="/app/settings"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          color: isTabActive('/app/settings') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: isTabActive('/app/settings') ? 600 : 400,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTabActive('/app/settings') ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h10" />
        </svg>
        <span>Lainnya</span>
      </Link>
    </nav>
  );
}
