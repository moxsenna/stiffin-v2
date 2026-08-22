'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PromotorTabBar } from './PromotorTabBar';
import { getSession, signOut, UserSession } from '@/lib/auth';
import { getApiMode } from '@/adapters';

interface PromotorShellProps {
  children: React.ReactNode;
}

export function PromotorShell({ children }: PromotorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    getSession().then((sess) => {
      if (!sess && getApiMode() === 'http') {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setSession(sess);
      setIsCheckingAuth(false);
    }).catch(() => {
      if (getApiMode() === 'http') {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      } else {
        setIsCheckingAuth(false);
      }
    });
  }, [pathname, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const navItems = [
    {
      label: 'Beranda',
      href: '/app',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: 'Program',
      href: '/app/programs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      label: 'Peserta',
      href: '/app/learners',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Aktivitas',
      href: '/app/activity',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: 'Pengaturan',
      href: '/app/settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const isLinkActive = (href: string) => {
    if (href === '/app' && pathname === '/app') return true;
    if (href !== '/app' && pathname.startsWith(href)) return true;
    return false;
  };

  if (isCheckingAuth && getApiMode() === 'http') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-canvas)' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Memuat sesi promotor...</div>
      </div>
    );
  }

  const orgName = session?.organization?.name || 'Workspace Promotor';
  const userName = session?.user?.name || 'Promotor';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-canvas)' }}>
      {/* Desktop Sidebar Layout */}
      <div style={{ display: 'flex', flex: 1 }}>
        <aside
          className="desktop-only"
          style={{
            width: '260px',
            backgroundColor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-divider)',
            padding: '24px 18px',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '24px',
            position: 'sticky',
            top: 0,
            height: '100vh',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Brand Logo & Organization */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 850,
                  fontSize: '17px',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                P
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  PromotorClass
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {orgName}
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: 'var(--border-radius-sm)',
                      fontWeight: active ? 750 : 500,
                      color: active ? 'var(--color-primary)' : 'var(--color-text-body)',
                      backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                      fontSize: '13.5px',
                      textDecoration: 'none',
                      transition: 'background-color var(--duration-fast) ease, color var(--duration-fast) ease',
                    }}
                  >
                    <span style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Account / Logout Action */}
          <div
            style={{
              borderTop: '1px solid var(--color-divider)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 750, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session?.user?.email || 'promotor'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar dari akun"
              style={{
                background: 'none',
                border: '1px solid var(--color-divider)',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: 'var(--color-status-danger)',
                fontWeight: 650,
                cursor: 'pointer',
                padding: '5px 10px',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              Keluar
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            maxWidth: '1120px',
            width: '100%',
            margin: '0 auto',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Sticky Tab Bar */}
      <PromotorTabBar />
    </div>
  );
}
