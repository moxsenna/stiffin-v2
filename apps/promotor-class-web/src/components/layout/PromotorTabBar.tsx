'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BerandaIcon, ProgramIcon, LearnerIcon, LainnyaIcon } from './nav-icons';

const TABS = [
  { label: 'Beranda', href: '/app', Icon: BerandaIcon },
  { label: 'Program', href: '/app/programs', Icon: ProgramIcon },
  { label: 'Learner', href: '/app/learners', Icon: LearnerIcon },
  { label: 'Lainnya', href: '/app/more', Icon: LainnyaIcon },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  if (href === '/app/more') {
    return (
      pathname.startsWith('/app/more') ||
      pathname.startsWith('/app/orders') ||
      pathname.startsWith('/app/activity') ||
      pathname.startsWith('/app/settings') ||
      pathname.startsWith('/app/storefront') ||
      pathname.startsWith('/app/templates')
    );
  }
  return pathname.startsWith(href);
}

export function PromotorTabBar() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {TABS.map(({ label, href, Icon }) => {
        const active = isTabActive(pathname, href);
        return (
          <Link
            key={href}
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
