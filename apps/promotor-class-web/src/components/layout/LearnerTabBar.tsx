'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { resolveWorkspaceSlug, setLastPublicWorkspaceSlug } from '@/lib/session';
import { BerandaIcon, KatalogIcon, BelajarIcon, ProfilIcon } from './nav-icons';

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

  const tabs = [
    { label: 'Beranda', href: berandaHref, key: 'beranda' as const, Icon: BerandaIcon },
    { label: 'Katalog', href: catalogHref, key: 'katalog' as const, Icon: KatalogIcon },
    { label: 'Belajar', href: '/learn', key: 'belajar' as const, Icon: BelajarIcon },
    { label: 'Profil', href: '/learn/profile', key: 'profil' as const, Icon: ProfilIcon },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigasi bawah learner">
      {tabs.map(({ label, href, key, Icon }) => {
        const active = activeTab === key;
        return (
          <Link
            key={key}
            href={href}
            className={active ? 'is-active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
