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
      icon: (active: boolean) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill={active ? 'var(--color-primary)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: 'Program & E-Course',
      href: '/app/programs',
      badge: 'LMS',
      icon: (active: boolean) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill={active ? 'var(--color-primary)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      label: 'Peserta & Leads',
      href: '/app/learners',
      icon: (active: boolean) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill={active ? 'var(--color-primary)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Aktivitas & Sinyal',
      href: '/app/activity',
      icon: (active: boolean) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.5' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: 'Template Pesan',
      href: '/app/templates',
      icon: (active: boolean) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill={active ? 'var(--color-primary)' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: 'Pengaturan & Brand',
      href: '/app/settings',
      icon: (active: boolean) => (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.5' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 900, boxShadow: 'var(--shadow-glow)' }}>
            P
          </div>
          <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Memuat sesi PromotorClass...</div>
        </div>
      </div>
    );
  }

  const orgName = session?.organization?.name || 'STIFIn Promotor';
  const orgSlug = session?.organization?.slug || 'rina';
  const userName = session?.user?.name || 'Rina Promotor';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-canvas)' }}>
      {/* Desktop Sidebar Layout */}
      <div style={{ display: 'flex', flex: 1 }}>
        <aside
          className="desktop-only"
          style={{
            width: '270px',
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
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Brand Logo & Workspace Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--color-canvas-subtle)',
                border: '1px solid var(--color-divider)',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--gradient-brand)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '18px',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                P
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '14.5px', fontWeight: 850, color: 'var(--color-text-main)', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                  PromotorClass
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-status-success)', display: 'inline-block' }} />
                  <span>{orgName}</span>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-subtle)', padding: '0 12px 4px' }}>
                Menu Utama
              </div>
              {navItems.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: 'var(--border-radius-md)',
                      fontWeight: active ? 750 : 550,
                      color: active ? 'var(--color-primary)' : 'var(--color-text-body)',
                      backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                      border: active ? '1px solid var(--color-primary-border)' : '1px solid transparent',
                      fontSize: '13.5px',
                      textDecoration: 'none',
                      transition: 'all var(--duration-fast) var(--ease-spring)',
                      boxShadow: active ? 'var(--shadow-xs)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                        {item.icon(active)}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 'var(--border-radius-full)',
                          backgroundColor: active ? 'var(--color-primary)' : 'var(--color-canvas-subtle)',
                          color: active ? '#FFFFFF' : 'var(--color-text-muted)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Quick Public Links */}
            <div style={{ padding: '0 4px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-subtle)', padding: '0 8px 6px' }}>
                Tautan Publik
              </div>
              <Link
                href={`/p/${orgSlug}`}
                target="_blank"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--border-radius-sm)',
                  backgroundColor: 'var(--color-canvas-subtle)',
                  border: '1px solid var(--color-divider)',
                  color: 'var(--color-text-body)',
                  fontSize: '12px',
                  fontWeight: 650,
                  textDecoration: 'none',
                  transition: 'background-color var(--duration-fast) ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>Lihat Storefront Publik</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>↗</span>
              </Link>
            </div>
          </div>

          {/* User Account / Logout Action */}
          <div
            style={{
              borderTop: '1px solid var(--color-divider)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary-border)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                {userName.charAt(0)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 750, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session?.user?.email || 'promotor@stifin.id'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar dari akun"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-status-danger)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color var(--duration-fast) ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            maxWidth: '1180px',
            width: '100%',
            margin: '0 auto',
            minWidth: 0,
            padding: '24px 28px',
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
