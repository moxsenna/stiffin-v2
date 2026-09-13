'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PromotorTabBar } from './PromotorTabBar';
import { Wordmark } from '../ui';
import { getSession, signOut, UserSession } from '@/lib/auth';
import { getApiMode, getPlatformApiClient } from '@/adapters';
import { UpsellSheet } from '@/components/promotor/UpsellSheet';
import { PARTNER_APP_URL } from '@/config/partner-app';

interface PromotorShellProps {
  children: React.ReactNode;
}

const DESKTOP_NAV: Array<{ label: string; href: string }> = [
  { label: 'Beranda', href: '/app' },
  { label: 'Program', href: '/app/programs' },
  { label: 'Peserta', href: '/app/learners' },
  { label: 'Pesanan', href: '/app/orders' },
  { label: 'Pencairan', href: '/app/payouts' },
  { label: 'Kupon', href: '/app/coupons' },
  { label: 'Aktivitas', href: '/app/activity' },
  { label: 'Storefront', href: '/app/storefront' },
  { label: 'Pengaturan', href: '/app/settings' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname.startsWith(href);
}

export function PromotorShell({ children }: PromotorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasFlow, setHasFlow] = useState<boolean | null>(null);
  const [flowUpsellOpen, setFlowUpsellOpen] = useState(false);

  useEffect(() =>{
    getSession().then((sess) =>{
      if (!sess && getApiMode() === 'http') {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setSession(sess);
      setIsCheckingAuth(false);
      getPlatformApiClient()
        .getPlanAccess()
        .then((p) => setHasFlow(!!(p as any).features?.promotorFlow))
        .catch(() => setHasFlow(null));
    }).catch(() =>{
      if (getApiMode() === 'http') {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      } else {
        setIsCheckingAuth(false);
      }
    });
  }, [pathname, router]);

  const handleLogout = async () =>{
    await signOut();
    router.push('/login');
  };

  if (isCheckingAuth && getApiMode() === 'http') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface)' }}>
       <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--font-sans)' }}>Memuat sesi promotor...</div>
     </div>
   );
  }

  const orgName = session?.organization?.name || 'Workspace Promotor';
  const userName = session?.user?.name || 'Promotor';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex' }}>
     <aside className="desktop-nav" aria-label="Navigasi aplikasi">
       <div>
         <div className="desktop-nav-brand">
           <Wordmark class />
           <div style={{ marginTop: 8, font: '400 11px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>{orgName}</div>
         </div>
         <nav className="desktop-nav-group" aria-label="Navigasi utama">
           {DESKTOP_NAV.map((item) =>(
              <Link
                key={item.href}
                href={item.href}
                className={isActive(pathname, item.href) ? 'desktop-nav-link is-active' : 'desktop-nav-link'}
              >
               {item.label}
              </Link>
           ))}
          </nav>
          {hasFlow !== false && (
            <a
              href={PARTNER_APP_URL}
              className="desktop-nav-link"
              onClick={() => getPlatformApiClient().recordBridgeMetric('bridge_action_executed', { kind: 'switcher_class_to_flow' }).catch(() => null)}
            >
              Buka Ralivo Flow ↗
            </a>
          )}
          {hasFlow === false && (
            <button
              type="button"
              className="desktop-nav-link"
              style={{ textAlign: 'left', border: 0, background: 'none', width: '100%', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setFlowUpsellOpen(true)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Buka Ralivo Flow
            </button>
          )}
       </div>
       <div className="desktop-nav-footer">
         <div style={{ minWidth: 0, marginBottom: 10 }}>
           <div style={{ font: '700 13px/1.3 var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
             {userName}
            </div>
           <div style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
             {session?.user?.email || 'promotor'}
            </div>
         </div>
         <button type="button" onClick={handleLogout} title="Keluar dari akun" className="btn btn-danger btn-sm" style={{ width: '100%' }}>
           Keluar
          </button>
       </div>
     </aside>

     <main
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          maxWidth: '860px',
          margin: '0 auto',
          minHeight: '100dvh',
          background: 'var(--surface)',
        }}
        className="page-wrapper-with-bottom-nav"
      >
       {children}
      </main>

     <PromotorTabBar />

     {flowUpsellOpen && <UpsellSheet product="FLOW" onClose={() => setFlowUpsellOpen(false)} />}
   </div>
 );
}
