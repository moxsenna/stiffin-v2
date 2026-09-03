'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { Wordmark } from '../ui';
import { getSession } from '@/lib/auth';
import { getApiMode } from '@/adapters';

export interface AppShellProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname.startsWith(href);
}

export const AppShell: React.FC<AppShellProps>= ({ children, showBottomNav = true }) =>{
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() =>{
    getSession().then((sess) =>{
      if (!sess && getApiMode() === 'http') {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        return;
      }
      setIsCheckingAuth(false);
    }).catch(() =>{
      if (getApiMode() === 'http') {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      } else {
        setIsCheckingAuth(false);
      }
    });
  }, [pathname, router]);

  if (isCheckingAuth && getApiMode() === 'http') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface)' }}>
       <div style={{ font: '500 13px var(--font-sans)', color: 'var(--muted)' }}>Memuat sesi promotor...</div>
     </div>
   );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex' }}>
     <aside className="desktop-nav" aria-label="Navigasi aplikasi">
       <div>
         <div className="desktop-nav-brand">
           <Wordmark flow />
           <div style={{ marginTop: 8, font: '400 11px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
             Talira Flow
            </div>
         </div>
         <nav className="desktop-nav-group" aria-label="Navigasi utama">
           <Link href="/app" className={isActive(pathname, '/app') ? 'desktop-nav-link is-active' : 'desktop-nav-link'}>
             Today
            </Link>
           <Link href="/app/contacts" className={isActive(pathname, '/app/contacts') ? 'desktop-nav-link is-active' : 'desktop-nav-link'}>
             Kontak
            </Link>
           <Link href="/app/calendar" className={isActive(pathname, '/app/calendar') ? 'desktop-nav-link is-active' : 'desktop-nav-link'}>
             Kalender
            </Link>
           <Link href="/app/more" className={isActive(pathname, '/app/more') ? 'desktop-nav-link is-active' : 'desktop-nav-link'}>
             Lainnya
            </Link>
         </nav>
       </div>
       <div className="desktop-nav-footer">
         <div style={{ font: '400 11px/1.5 var(--font-sans)', color: 'var(--muted)' }}>
           Antrian kerja, bukan dasbor.
          </div>
       </div>
     </aside>

     <main
        style={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
          minHeight: '100dvh',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
       <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
       {showBottomNav && <BottomNav />}
      </main>
   </div>
 );
};
