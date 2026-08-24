'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const FLOW_NAV_ITEMS = [
  { label: 'Today', href: '/app' },
  { label: 'Kontak', href: '/app/contacts' },
  { label: 'Kalender', href: '/app/calendar' },
  { label: 'Lainnya', href: '/app/more' },
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

export const BottomNav: React.FC = () =>{
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
     {FLOW_NAV_ITEMS.map((item) =>{
        const active = isItemActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}>
           {item.label}
          </Link>
       );
      })}
    </nav>
 );
};
