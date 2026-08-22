'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SunIcon, UsersIcon, CalendarIcon, MoreIcon, PlusIcon } from '../foundation/icons';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const isToday = pathname === '/app';
  const isContacts = pathname === '/app/contacts';
  const isNewContact = pathname.startsWith('/app/contacts/new');
  const isCalendar = pathname.startsWith('/app/calendar');
  const isMore =
    pathname.startsWith('/app/more') ||
    pathname.startsWith('/app/services') ||
    pathname.startsWith('/app/templates') ||
    pathname.startsWith('/app/settings');

  return (
    <nav
      aria-label="Navigasi Utama"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 -2px 12px rgba(20, 22, 21, 0.04)',
        paddingLeft: '6px',
        paddingRight: '6px',
      }}
    >
      {/* 1. Hari Ini */}
      <Link
        href="/app"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          fontWeight: isToday ? 780 : 500,
          fontSize: '11px',
          textDecoration: 'none',
          height: '100%',
          position: 'relative',
        }}
      >
        {isToday && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              width: '28px',
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
            backgroundColor: isToday ? 'var(--color-primary-light)' : 'transparent',
          }}
        >
          <SunIcon size={19} color={isToday ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />
        </div>
        <span>Hari ini</span>
      </Link>

      {/* 2. Kontak */}
      <Link
        href="/app/contacts"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          color: isContacts ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          fontWeight: isContacts ? 780 : 500,
          fontSize: '11px',
          textDecoration: 'none',
          height: '100%',
          position: 'relative',
        }}
      >
        {isContacts && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              width: '28px',
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
            backgroundColor: isContacts ? 'var(--color-primary-light)' : 'transparent',
          }}
        >
          <UsersIcon size={19} color={isContacts ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />
        </div>
        <span>Kontak</span>
      </Link>

      {/* 3. Center Prominent Action: Tambah Kontak / Prospek */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          position: 'relative',
        }}
      >
        <Link
          href="/app/contacts/new"
          aria-label="Tambah kontak baru"
          className="touch-target-primary"
          style={{
            position: 'absolute',
            top: '-12px',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(18, 94, 81, 0.4), 0 2px 6px rgba(18, 94, 81, 0.25)',
            border: '3px solid #FFFFFF',
            textDecoration: 'none',
            transform: isNewContact ? 'scale(1.06)' : 'none',
            transition: 'transform var(--duration-fast) var(--ease-spring)',
          }}
        >
          <PlusIcon size={22} color="#FFFFFF" strokeWidth={2.5} />
        </Link>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: isNewContact ? 800 : 650,
            color: isNewContact ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
            marginTop: '28px',
            letterSpacing: '-0.01em',
          }}
        >
          Tambah
        </span>
      </div>

      {/* 4. Kalender */}
      <Link
        href="/app/calendar"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          color: isCalendar ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          fontWeight: isCalendar ? 780 : 500,
          fontSize: '11px',
          textDecoration: 'none',
          height: '100%',
          position: 'relative',
        }}
      >
        {isCalendar && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              width: '28px',
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
            backgroundColor: isCalendar ? 'var(--color-primary-light)' : 'transparent',
          }}
        >
          <CalendarIcon size={19} color={isCalendar ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />
        </div>
        <span>Kalender</span>
      </Link>

      {/* 5. Lainnya */}
      <Link
        href="/app/more"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          color: isMore ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          fontWeight: isMore ? 780 : 500,
          fontSize: '11px',
          textDecoration: 'none',
          height: '100%',
          position: 'relative',
        }}
      >
        {isMore && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              width: '28px',
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
            backgroundColor: isMore ? 'var(--color-primary-light)' : 'transparent',
          }}
        >
          <MoreIcon size={19} color={isMore ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />
        </div>
        <span>Lainnya</span>
      </Link>
    </nav>
  );
};
