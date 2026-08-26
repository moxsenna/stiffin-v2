'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileAppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  showProfile?: boolean;
  workspaceSlug?: string;
}

export function MobileAppHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  showProfile = true,
}: MobileAppHeaderProps) {
  const router = useRouter();

  const handleBack = () =>{
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className="mobile-only"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 900,
        backgroundColor: 'var(--surface)',
        borderBottom: 'var(--sep-strong)',
        padding: '10px 18px 12px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
     <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minWidth: 0 }}>
       {showBack && (
          <button type="button" onClick={handleBack} aria-label="Kembali" className="back-btn">
           ←
          </button>
       )}

        <div style={{ minWidth: 0 }}>
         <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
           {title}
          </h1>
         {subtitle && (
            <div
              style={{
                marginTop: 5,
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--muted-strong)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
             {subtitle}
            </div>
         )}
        </div>
     </div>

     {showProfile && (
        <Link href="/learn/profile" aria-label="Profil Saya" className="header-action" style={{ width: 40, height: 40 }}>
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <circle cx="12" cy="8" r="4" />
           <path d="M20 21a8 8 0 0 0-16 0" />
         </svg>
       </Link>
     )}
    </header>
 );
}
