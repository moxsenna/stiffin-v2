'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Beranda', href: '/app' },
  { label: 'Program', href: '/app/programs' },
  { label: 'Learner', href: '/app/learners' },
  { label: 'Lainnya', href: '/app/more' },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  if (href === '/app/more') {
    return (
      pathname.startsWith('/app/more') ||
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
     {TABS.map((tab) =>{
        const active = isTabActive(pathname, tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}>
           {tab.label}
          </Link>
       );
      })}
    </nav>
 );
}
