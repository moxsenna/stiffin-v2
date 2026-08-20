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
    { label: 'Beranda', href: '/app' },
    { label: 'Program', href: '/app/programs' },
    { label: 'Peserta', href: '/app/learners' },
    { label: 'Aktivitas', href: '/app/activity' },
    { label: 'Pengaturan', href: '/app/settings' },
  ];

  const isLinkActive = (href: string) => {
    if (href === '/app' && pathname === '/app') return true;
    if (href !== '/app' && pathname.startsWith(href)) return true;
    return false;
  };

  if (isCheckingAuth && getApiMode() === 'http') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-canvas)' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Memuat sesi promotor...</div>
      </div>
    );
  }

  const orgName = session?.organization?.name || 'Workspace Promotor';
  const userName = session?.user?.name || 'Promotor';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Desktop Sidebar Layout */}
      <div style={{ display: 'flex', flex: 1 }}>
        <aside
          className="desktop-only"
          style={{
            width: '240px',
            backgroundColor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-divider)',
            padding: '24px 16px',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '24px',
            position: 'sticky',
            top: 0,
            height: '100vh',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
                PromotorClass
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>
                {orgName}
              </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map(item => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--border-radius-sm)',
                      fontWeight: active ? 700 : 400,
                      color: active ? 'var(--color-primary)' : 'var(--color-text-main)',
                      backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                      fontSize: '13px',
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Account / Logout Action */}
          <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {session?.user?.email || 'promotor'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar dari akun"
              style={{
                background: 'none',
                border: 0,
                fontSize: '12px',
                color: 'var(--color-status-danger)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
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
            paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
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
