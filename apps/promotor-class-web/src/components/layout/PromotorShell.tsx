'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PromotorTabBar } from './PromotorTabBar';

interface PromotorShellProps {
  children: React.ReactNode;
}

export function PromotorShell({ children }: PromotorShellProps) {
  const pathname = usePathname();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('promotor_session_token');
      if (!existingToken) {
        localStorage.setItem('promotor_session_token', 'staging-promotor-session-token-demo');
      }
    }
  }, []);

  const navItems = [
    { label: 'Beranda', href: '/app' },
    { label: 'Program', href: '/app/programs' },
    { label: 'Peserta', href: '/app/learners' },
    { label: 'Aktivitas', href: '/app/activity' },
    { label: 'Template', href: '/app/templates' },
    { label: 'Pengaturan', href: '/app/settings' },
  ];

  const isLinkActive = (href: string) => {
    if (href === '/app' && pathname === '/app') return true;
    if (href !== '/app' && pathname.startsWith(href)) return true;
    return false;
  };

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
            gap: '24px',
            position: 'sticky',
            top: 0,
            height: '100vh',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>
              PromotorClass
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Rina Parenting & STIFIn
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
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-primary)' : 'var(--color-text-main)',
                    backgroundColor: active ? 'var(--color-primary-light)' : 'transparent',
                    fontSize: '13px',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))', // Clearance for mobile tab bar & safe area
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
