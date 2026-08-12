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
  const isMore = pathname.startsWith('/app/more') || pathname.startsWith('/app/services') || pathname.startsWith('/app/templates') || pathname.startsWith('/app/settings');

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E8E7E3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <Link
        href="/app"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isToday ? '#167A68' : '#71706B',
          fontWeight: isToday ? 600 : 400,
          fontSize: '11.5px',
          textDecoration: 'none',
          minWidth: '44px',
          padding: '6px 0',
        }}
      >
        <SunIcon size={20} color={isToday ? '#167A68' : '#71706B'} />
        <span>Hari ini</span>
      </Link>

      <Link
        href="/app/contacts"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isContacts ? '#167A68' : '#71706B',
          fontWeight: isContacts ? 600 : 400,
          fontSize: '11.5px',
          textDecoration: 'none',
          minWidth: '44px',
          padding: '6px 0',
        }}
      >
        <UsersIcon size={20} color={isContacts ? '#167A68' : '#71706B'} />
        <span>Kontak</span>
      </Link>

      <Link
        href="/app/calendar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isCalendar ? '#167A68' : '#71706B',
          fontWeight: isCalendar ? 600 : 400,
          fontSize: '11.5px',
          textDecoration: 'none',
          minWidth: '44px',
          padding: '6px 0',
        }}
      >
        <CalendarIcon size={20} color={isCalendar ? '#167A68' : '#71706B'} />
        <span>Kalender</span>
      </Link>

      <Link
        href="/app/more"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isMore ? '#167A68' : '#71706B',
          fontWeight: isMore ? 600 : 400,
          fontSize: '11.5px',
          textDecoration: 'none',
          minWidth: '44px',
          padding: '6px 0',
        }}
      >
        <MoreIcon size={20} color={isMore ? '#167A68' : '#71706B'} />
        <span>Lainnya</span>
      </Link>
    </nav>
  );
};
