'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TodayIcon, KontakIcon, KalenderIcon, PipelineIcon, TemplateIcon } from '../foundation/nav-icons';

export const FLOW_NAV_ITEMS = [
  { label: 'Today', href: '/app', Icon: TodayIcon },
  { label: 'Kontak', href: '/app/contacts', Icon: KontakIcon },
  { label: 'Kalender', href: '/app/calendar', Icon: KalenderIcon },
  { label: 'Pipeline', href: '/app/pipeline', Icon: PipelineIcon },
  { label: 'Template', href: '/app/templates', Icon: TemplateIcon },
];

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname.startsWith(href);
}

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="hv-dock-wrap">
      <nav className="hv-dock" aria-label="Navigasi utama">
        {FLOW_NAV_ITEMS.map(({ label, href, Icon }) => {
          const active = isItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={active ? 'is-active' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
