'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { resolveWorkspaceSlug, setLastPublicWorkspaceSlug } from '@/lib/session';

interface LearnerTabBarProps {
  workspaceSlug?: string;
}

export function LearnerTabBar({ workspaceSlug: explicitWorkspaceSlug }: LearnerTabBarProps) {
  const pathname = usePathname();
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(explicitWorkspaceSlug || null);

  useEffect(() => {
    if (explicitWorkspaceSlug) {
      setLastPublicWorkspaceSlug(explicitWorkspaceSlug);
      setResolvedSlug(explicitWorkspaceSlug);
      return;
    }
    const slug = resolveWorkspaceSlug(explicitWorkspaceSlug);
    setResolvedSlug(slug);
  }, [explicitWorkspaceSlug, pathname]);

  let activeTab: 'beranda' | 'katalog' | 'belajar' | 'profil' = 'beranda';

  if (pathname === '/learn/profile' || pathname === '/learn/referral') {
    activeTab = 'profil';
  } else if (pathname === '/learn' || pathname.startsWith('/learn/programs')) {
    activeTab = 'belajar';
  } else if (pathname.endsWith('/catalog') || (pathname.startsWith('/p/') && pathname.split('/').length >= 4)) {
    activeTab = 'katalog';
  } else if (pathname.startsWith('/p/')) {
    activeTab = 'beranda';
  }

  const berandaHref = resolvedSlug ? `/p/${resolvedSlug}` : '/learn';
  const catalogHref = resolvedSlug ? `/p/${resolvedSlug}/catalog` : '/learn';

  return (
    <nav
      aria-label="Navigasi bawah learner"
      className="mobile-bottom-nav"
    >
      <div className="mobile-bottom-nav__container">
        {/* Tab 1: Beranda */}
        <Link
          href={berandaHref}
          className="mobile-bottom-nav__item"
          style={{
            color: activeTab === 'beranda' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'beranda' ? 750 : 500,
          }}
        >
          {activeTab === 'beranda' && <div className="mobile-bottom-nav__indicator" />}
          <div className="mobile-bottom-nav__icon-wrapper">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={activeTab === 'beranda' ? 'var(--color-primary-light)' : 'none'}
              stroke="currentColor"
              strokeWidth={activeTab === 'beranda' ? '2.3' : '1.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="mobile-bottom-nav__label">Beranda</span>
        </Link>

        {/* Tab 2: Katalog */}
        <Link
          href={catalogHref}
          className="mobile-bottom-nav__item"
          style={{
            color: activeTab === 'katalog' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'katalog' ? 750 : 500,
          }}
        >
          {activeTab === 'katalog' && <div className="mobile-bottom-nav__indicator" />}
          <div className="mobile-bottom-nav__icon-wrapper">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={activeTab === 'katalog' ? 'var(--color-primary-light)' : 'none'}
              stroke="currentColor"
              strokeWidth={activeTab === 'katalog' ? '2.3' : '1.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
            </svg>
          </div>
          <span className="mobile-bottom-nav__label">Katalog</span>
        </Link>

        {/* Tab 3: Belajar */}
        <Link
          href="/learn"
          className="mobile-bottom-nav__item"
          style={{
            color: activeTab === 'belajar' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'belajar' ? 750 : 500,
          }}
        >
          {activeTab === 'belajar' && <div className="mobile-bottom-nav__indicator" />}
          <div className="mobile-bottom-nav__icon-wrapper">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={activeTab === 'belajar' ? 'var(--color-primary-light)' : 'none'}
              stroke="currentColor"
              strokeWidth={activeTab === 'belajar' ? '2.3' : '1.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <span className="mobile-bottom-nav__label">Belajar</span>
        </Link>

        {/* Tab 4: Profil */}
        <Link
          href="/learn/profile"
          className="mobile-bottom-nav__item"
          style={{
            color: activeTab === 'profil' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'profil' ? 750 : 500,
          }}
        >
          {activeTab === 'profil' && <div className="mobile-bottom-nav__indicator" />}
          <div className="mobile-bottom-nav__icon-wrapper">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={activeTab === 'profil' ? 'var(--color-primary-light)' : 'none'}
              stroke="currentColor"
              strokeWidth={activeTab === 'profil' ? '2.3' : '1.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </div>
          <span className="mobile-bottom-nav__label">Profil</span>
        </Link>
      </div>
    </nav>
  );
}
