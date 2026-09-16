'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { resolveWorkspaceSlug, setLastPublicWorkspaceSlug } from '@/lib/session';
import { BerandaIcon, BelajarIcon, ProfilIcon } from '@/components/layout/nav-icons';

/* ============================================================
   RALIVO PWA CHROME — shared bento/PWA primitives (mobile 390px)
   ============================================================ */

export function PwaLogo({ letter = 'R' }: { letter?: string }) {
  return (
    <span className="pwa-logo" aria-hidden="true">
      {letter}
    </span>
  );
}

interface PwaAppHeaderProps {
  workspaceSlug?: string;
  brandName?: string;
  tagline?: string;
  showCart?: boolean;
  cartHref?: string;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
}

/** PWA App Header: logo 38x38 + tagline + Install pill + cart. */
export function PwaAppHeader({
  workspaceSlug,
  brandName = 'Ralivo',
  tagline = 'Learning Platform PWA',
  showCart = true,
  cartHref,
  title,
  subtitle,
  showBack = false,
  backHref,
}: PwaAppHeaderProps) {
  const [deferred, setDeferred] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __pwaPrompt?: unknown }).__pwaPrompt = e;
      setDeferred(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = (window as unknown as { __pwaPrompt?: { prompt: () => void } }).__pwaPrompt;
    if (prompt) {
      prompt.prompt();
      (window as unknown as { __pwaPrompt?: unknown }).__pwaPrompt = undefined;
      setDeferred(false);
      setHint(false);
    } else {
      setHint((v) => !v);
      setDeferred(false);
    }
  };

  const goBack = () => {
    if (backHref) window.location.href = backHref;
    else window.history.back();
  };

  return (
    <header className="pwa-header">
      <div className="pwa-header-inner">
        <div className="pwa-brand">
          {showBack ? (
            <button type="button" className="pwa-icon-btn" onClick={goBack} aria-label="Kembali">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <PwaLogo />
          )}
          <div style={{ minWidth: 0 }}>
            <div className="pwa-brand-name">{title ?? brandName}</div>
            <div className="pwa-brand-tag">{subtitle ?? tagline}</div>
          </div>
        </div>
        <div className="pwa-header-actions">
          <button type="button" className="pwa-install-pill" onClick={handleInstall} aria-label="Install aplikasi">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M4 21h16" />
            </svg>
            Install App
          </button>
          {showCart && (
            <Link
              href={cartHref ?? (workspaceSlug ? `/p/${workspaceSlug}/catalog` : '/learn')}
              className="pwa-icon-btn"
              aria-label="Keranjang & katalog"
              style={{ textDecoration: 'none' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l1.5 13.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1z" />
                <path d="M9 10V6a3 3 0 0 1 6 0v4" />
              </svg>
            </Link>
          )}
        </div>
      </div>
      {hint && !deferred && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 10px' }}>
          <div className="pwa-nested" style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--pwa-muted)' }}>
            Buka menu ⋮ browser → <strong>Install App / Add to Home Screen</strong> untuk akses cepat & offline.
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------------- Search ---------------- */

export function PwaSearchBar({
  value,
  onChange,
  placeholder = 'Cari kelas, cohort, atau mentor...',
  onFilterClick,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
}) {
  return (
    <div className="pwa-search" role="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" style={{ flex: 'none' }}>
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Cari kelas"
      />
      <button type="button" className="pwa-filter-btn" onClick={onFilterClick} aria-label="Filter">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <circle cx="9" cy="7" r="2.2" fill="var(--pwa-card)" />
          <line x1="4" y1="17" x2="20" y2="17" />
          <circle cx="15" cy="17" r="2.2" fill="var(--pwa-card)" />
        </svg>
      </button>
    </div>
  );
}

/* ---------------- Category chips ---------------- */

export function PwaChips({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="pwa-chips" role="tablist" aria-label="Kategori kelas">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={active === item}
          className={active === item ? 'pwa-chip is-active' : 'pwa-chip'}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Section head ---------------- */

export function PwaSectionHead({
  title,
  linkLabel,
  linkHref,
}: {
  title: string;
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <div className="pwa-section-head">
      <h2 className="pwa-section-title">{title}</h2>
      {linkLabel && linkHref && (
        <Link href={linkHref} className="pwa-section-link">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

/* ---------------- Stars ---------------- */

export function PwaStars({ value = 5, size = 12 }: { value?: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, color: '#F59E0B' }} aria-label={`Rating ${value}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < Math.round(value) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function PwaProgress({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="pwa-progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}

/* ---------------- Countdown ---------------- */

export function useCountdown(totalSeconds: number, running = true) {
  const [left, setLeft] = useState(totalSeconds);
  useEffect(() => {
    if (!running) return;
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, running]);
  return {
    left,
    reset: () => setLeft(totalSeconds),
    mm: String(Math.floor(left / 60)).padStart(2, '0'),
    ss: String(left % 60).padStart(2, '0'),
  };
}

/* ---------------- Liquid-glass dock ---------------- */

function JadwalIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

export function PwaDock({ workspaceSlug: explicitSlug }: { workspaceSlug?: string }) {
  const pathname = usePathname();
  const [slug, setSlug] = useState<string | null>(explicitSlug ?? null);

  useEffect(() => {
    if (explicitSlug) {
      setLastPublicWorkspaceSlug(explicitSlug);
      setSlug(explicitSlug);
      return;
    }
    setSlug(resolveWorkspaceSlug(explicitSlug));
  }, [explicitSlug, pathname]);

  let active: 'storefront' | 'kelasku' | 'jadwal' | 'profil' = 'storefront';
  if (pathname === '/learn/profile' || pathname === '/learn/referral') active = 'profil';
  else if (pathname === '/learn/jadwal') active = 'jadwal';
  else if (pathname === '/learn' || pathname.startsWith('/learn/programs') || pathname.startsWith('/learn/preview')) active = 'kelasku';
  else if (pathname.startsWith('/p/')) active = 'storefront';

  const storefrontHref = slug ? `/p/${slug}` : '/learn';

  const tabs = [
    { key: 'storefront' as const, label: 'Storefront', href: storefrontHref, Icon: BerandaIcon },
    { key: 'kelasku' as const, label: 'Kelasku', href: '/learn', Icon: BelajarIcon },
    { key: 'jadwal' as const, label: 'Jadwal', href: '/learn/jadwal', Icon: JadwalIcon },
    { key: 'profil' as const, label: 'Profil', href: '/learn/profile', Icon: ProfilIcon },
  ];

  return (
    <nav className="pwa-dock-wrap" aria-label="Navigasi utama">
      <div className="pwa-dock">
        {tabs.map(({ key, label, href, Icon }) => (
          <Link key={key} href={href} className={active === key ? 'is-active' : undefined} aria-current={active === key ? 'page' : undefined}>
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/* ---------------- Offline banner ---------------- */

const OFFLINE_KEY = 'ralivo-pwa-offline-cache';

export function PwaOfflineBanner() {
  const [enabled, setEnabled] = useState(false);
  const [sizeLabel, setSizeLabel] = useState('');

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(OFFLINE_KEY) === '1');
    } catch {
      /* abaikan */
    }
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (est.usage) {
            const mb = est.usage / 1024 / 1024;
            setSizeLabel(mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`);
          }
        })
        .catch(() => {});
    }
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(OFFLINE_KEY, next ? '1' : '0');
    } catch {
      /* abaikan */
    }
  };

  return (
    <div className="pwa-offline">
      <span
        style={{
          width: 36,
          height: 36,
          flex: 'none',
          borderRadius: 10,
          background: 'var(--pwa-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v10" />
          <path d="M8 9l4 4 4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--pwa-text)' }}>Akses Belajar Offline PWA</div>
        <div style={{ fontSize: 11, color: 'var(--pwa-muted)', marginTop: 2 }}>
          Simpan modul ke penyimpanan lokal{sizeLabel ? ` (${sizeLabel} cache)` : ''} dan tonton tanpa koneksi internet.
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        style={{
          flex: 'none',
          minHeight: 44,
          padding: '6px 10px',
          borderRadius: 8,
          border: 0,
          background: enabled ? 'var(--pwa-success)' : 'var(--pwa-primary)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        {enabled ? 'Aktif ✓' : 'Aktifkan'}
      </button>
    </div>
  );
}
