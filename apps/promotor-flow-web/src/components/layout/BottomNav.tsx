'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TodayIcon, KontakIcon, KalenderIcon, LainnyaIcon } from '../foundation/nav-icons';

export const FLOW_NAV_ITEMS = [
  { label: 'Today', href: '/app', Icon: TodayIcon },
  { label: 'Kontak', href: '/app/contacts', Icon: KontakIcon },
  { label: 'Kalender', href: '/app/calendar', Icon: KalenderIcon },
  { label: 'Lainnya', href: '/app/more', Icon: LainnyaIcon },
];

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  if (href === '/app/more') {
    return (
      pathname.startsWith('/app/more') ||
      pathname.startsWith('/app/services') ||
      pathname.startsWith('/app/templates') ||
      pathname.startsWith('/app/settings')
    );
  }
  return pathname.startsWith(href);
}

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {FLOW_NAV_ITEMS.map(({ label, href, Icon }) => {
        const active = isItemActive(pathname, href);
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
};
