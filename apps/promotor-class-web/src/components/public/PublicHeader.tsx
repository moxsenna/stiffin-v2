'use client';

import React from 'react';
import Link from 'next/link';
import { PwaLogo } from '@/components/pwa/pwa';

interface PublicHeaderProps {
  workspaceSlug: string;
  displayName?: string | null;
  tagline?: string | null;
  onPrimaryClick?: () => void;
}

/** Desktop companion header — mobile memakai PwaAppHeader (logo 38px + Install pill). */
export function PublicHeader({
  workspaceSlug,
  displayName = '',
  tagline = '',
  onPrimaryClick,
}: PublicHeaderProps) {
  return (
    <header className="desktop-only" style={{ background: 'var(--pwa-canvas)', borderBottom: '1px solid var(--pwa-border)' }}>
      <div
        className="container"
        style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        <Link href={`/p/${workspaceSlug}`} style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <PwaLogo letter={(displayName || 'R').charAt(0).toUpperCase()} />
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{displayName}</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--pwa-muted)' }}>{tagline || 'Learning Platform PWA'}</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="#programs" style={{ padding: '8px 12px', color: 'var(--pwa-muted)', fontWeight: 650, fontSize: 13, textDecoration: 'none' }}>
            Program
          </a>
          <a href="#about" style={{ padding: '8px 12px', color: 'var(--pwa-muted)', fontWeight: 650, fontSize: 13, textDecoration: 'none' }}>
            Tentang
          </a>
          {onPrimaryClick ? (
            <button
              onClick={onPrimaryClick}
              style={{ border: 0, background: 'linear-gradient(135deg,#0D52FF,#2563EB)', color: '#fff', fontWeight: 800, fontSize: 13, padding: '10px 18px', borderRadius: 12, cursor: 'pointer', minHeight: 44 }}
            >
              Mulai belajar
            </button>
          ) : (
            <a
              href="#programs"
              style={{ background: 'linear-gradient(135deg,#0D52FF,#2563EB)', color: '#fff', fontWeight: 800, fontSize: 13, padding: '10px 18px', borderRadius: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
            >
              Mulai belajar
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
