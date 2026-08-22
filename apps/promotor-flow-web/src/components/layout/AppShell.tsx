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
    getSession().then((sess) => {
      if (!sess && getApiMode() === 'http') {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setIsCheckingAuth(false);
    }).catch(() => {
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
          backgroundColor: '#F7F7F5',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ font: '400 13px Inter, sans-serif', color: '#71706B' }}>
          Memuat sesi promotor...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F7F7F5',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '100vh',
          backgroundColor: '#F7F7F5',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 0 20px rgba(0,0,0,0.03)',
        }}
      >
        <main
          style={{
            flex: 1,
            paddingBottom: showBottomNav ? '70px' : '20px',
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
