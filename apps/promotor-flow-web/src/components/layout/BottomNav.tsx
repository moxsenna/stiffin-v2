'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SunIcon, UsersIcon, CalendarIcon, MoreIcon } from '../foundation/icons';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const isToday = pathname === '/app';
  const isContacts = pathname.startsWith('/app/contacts');
  const isCalendar = pathname.startsWith('/app/calendar');
  const isMore =
    pathname.startsWith('/app/more') ||
    pathname.startsWith('/app/services') ||
    pathname.startsWith('/app/templates') ||
    pathname.startsWith('/app/settings');

  const navItems = [
    {
      href: '/app',
      label: 'Hari ini',
      active: isToday,
      icon: <SunIcon size={20} color={isToday ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />,
    },
    {
      href: '/app/contacts',
      label: 'Kontak',
      active: isContacts,
      icon: <UsersIcon size={20} color={isContacts ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />,
    },
    {
      href: '/app/calendar',
      label: 'Kalender',
      active: isCalendar,
      icon: <CalendarIcon size={20} color={isCalendar ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />,
    },
    {
      href: '/app/more',
      label: 'Lainnya',
      active: isMore,
      icon: <MoreIcon size={20} color={isMore ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />,
    },
  ];

  return (
    <nav
      aria-label="Navigasi Utama"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 -2px 10px rgba(20, 22, 21, 0.03)',
      }}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: item.active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: item.active ? 780 : 500,
            fontSize: '11.5px',
            textDecoration: 'none',
            height: '100%',
            position: 'relative',
            transition: 'color var(--duration-fast) ease',
          }}
        >
          {item.active && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                width: '32px',
                height: '2.5px',
                borderRadius: '0 0 2px 2px',
                backgroundColor: 'var(--color-primary)',
              }}
            />
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: item.active ? 'var(--color-primary-light)' : 'transparent',
              transition: 'background-color var(--duration-fast) ease',
            }}
          >
            {item.icon}
          </div>
          <span style={{ letterSpacing: '-0.01em' }}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};
