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

  const tabs = [
    {
      label: 'Beranda',
      href: '/app',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-primary-light)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: 'Program',
      href: '/app/programs',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-primary-light)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      label: 'Peserta',
      href: '/app/learners',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-primary-light)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Aktivitas',
      href: '/app/activity',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-primary-light)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: 'Lainnya',
      href: '/app/settings',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--color-primary-light)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.3' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Navigasi bawah promotor"
      className="mobile-bottom-nav"
    >
      <div
        className="mobile-bottom-nav__container"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)', maxWidth: '580px' }}
      >
        {tabs.map((tab) => {
          const active = isTabActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="mobile-bottom-nav__item"
              style={{
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: active ? 750 : 500,
              }}
            >
              {active && <div className="mobile-bottom-nav__indicator" />}
              <div className="mobile-bottom-nav__icon-wrapper">
                {tab.icon(active)}
              </div>
              <span className="mobile-bottom-nav__label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
