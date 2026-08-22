'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { getSession } from '@/lib/auth';
import { getApiMode } from '@/adapters';

export interface AppShellProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, showBottomNav = true }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    getSession()
      .then((sess) => {
        if (!sess && getApiMode() === 'http') {
          router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
          return;
        }
        setIsCheckingAuth(false);
      })
      .catch(() => {
        if (getApiMode() === 'http') {
          router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        } else {
          setIsCheckingAuth(false);
        }
      });
  }, [pathname, router]);

  if (isCheckingAuth && getApiMode() === 'http') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-canvas)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
          Memuat sesi promotor...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-canvas)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '100vh',
          backgroundColor: 'var(--color-canvas)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <main
          style={{
            flex: 1,
            paddingBottom: showBottomNav ? 'calc(74px + env(safe-area-inset-bottom, 0px))' : '24px',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
};
