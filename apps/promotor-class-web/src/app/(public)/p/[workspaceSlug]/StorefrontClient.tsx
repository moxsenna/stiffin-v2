'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicWorkspaceProfile, PublicProgramCatalogItem } from '@/modules/public-storefront/types';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PromoterProfile } from '@/components/public/PromoterProfile';
import {
  PwaAppHeader,
  PwaChips,
  PwaDock,
  PwaOfflineBanner,
  PwaSearchBar,
  PwaSectionHead,
} from '@/components/pwa/pwa';
import { setLastPublicWorkspaceSlug } from '@/lib/session';
import { getPublicWorkspaceQuery, listPublicProgramsQuery } from '@/modules/public-storefront/queries';
import { capturePrototypeReferralCode } from '@/lib/referral-capture';
import { formatIDR } from '@promotor/platform-core';

interface StorefrontClientProps {
  profile: PublicWorkspaceProfile;
  catalog: PublicProgramCatalogItem[];
}

const CATEGORY_PRESETS = ['Semua', 'Tes STIFIn', 'Parenting', 'Belajar Anak', 'Konseling'];

function categoryOf(item: PublicProgramCatalogItem): string {
  const masterCategory = (item.presentation as any)?.category;
  if (masterCategory && typeof masterCategory === 'string' && masterCategory.trim()) {
    return masterCategory.trim();
  }
  const hay = `${item.program.title} ${item.program.subtitle ?? ''} ${item.presentation.heroEyebrow ?? ''} ${item.presentation.shortOutcome ?? ''}`.toLowerCase();
  if (/(konseling|review|alumni|sesi khusus|konsultasi)/.test(hay)) return 'Konseling';
  if (/(parenting|pola asuh|mentoring|pengasuhan|asuh)/.test(hay)) return 'Parenting';
  if (/(kebiasaan|disiplin|tantangan|rutin|mandiri|habit)/.test(hay)) return 'Belajar Anak';
  if (/(tes|stifin|mesin kecerdasan|identifikasi|bakat|genetik|mengenal cara belajar)/.test(hay)) return 'Tes STIFIn';
  return 'Lainnya';
}

function priceOf(item: PublicProgramCatalogItem): { now: number; was: number | null; label: string } {
  const now = item.program.priceAmount || 0;
  if (item.program.pricing !== 'one_time' || now <= 0) return { now: 0, was: null, label: 'Gratis' };
  const officialStrike = (item.presentation as any)?.strikePriceAmount;
  const was = typeof officialStrike === 'number' && officialStrike > now ? officialStrike : null;
  return { now, was, label: formatIDR(now) };
}

function discountPct(now: number, was: number | null): string | null {
  if (!was || was <= now) return null;
  return `-${Math.round((1 - now / was) * 100)}%`;
}

/* -------- Featured live-cohort bento — Pencil spec: white card p16 radius 18,
   badge row (blue LIVE / amber seats), 17px title, meta row, 3 stat cells,
   solid-blue h42 CTA. -------- */
function FeaturedCohortCard({ item, workspaceSlug }: { item: PublicProgramCatalogItem; workspaceSlug: string }) {
  const price = priceOf(item);
  const pct = discountPct(price.now, price.was);
  const lessons = item.program.totalLessonsCount || 0;
  const modules = item.program.totalModulesCount || 0;
  return (
    <article className="pwa-card" style={{ padding: 16, borderRadius: 18 }} aria-label={`Kelas unggulan: ${item.program.title}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="pwa-pill" style={{ background: '#EFF6FF', color: '#0D52FF', border: 0, minHeight: 24, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>
          ⭐ KELAS UNGGULAN
        </span>
        {item.program.pricing === 'one_time' ? (
          <span className="pwa-pill pwa-pill-blue">Berbayar</span>
        ) : (
          <span className="pwa-pill pwa-pill-green">Gratis</span>
        )}
      </div>

      <h2 style={{ fontSize: 17, lineHeight: 1.3, fontWeight: 700, margin: '10px 0 0' }}>
        {item.program.title}
      </h2>
      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
        {item.presentation.shortOutcome || item.program.subtitle || item.program.description || 'Pelajari detail kurikulum di halaman kelas.'}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {[
          { v: modules > 0 ? `${modules} Modul` : '—', s: 'Kurikulum' },
          { v: lessons > 0 ? `${lessons} Materi` : '—', s: 'Konten Belajar' },
          { v: price.label, s: pct ? `Diskon ${pct.replace('-', '')}` : 'Harga' },
        ].map((st) => (
          <div key={st.s} style={{ flex: '1 1 0', background: '#F8FAFC', borderRadius: 10, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{st.v}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{st.s}</div>
          </div>
        ))}
      </div>

      <Link
        href={`/p/${workspaceSlug}/${item.program.programSlug}`}
        className="pwa-cta"
        style={{ marginTop: 12, minHeight: 42, borderRadius: 12, fontSize: 13 }}
      >
        Lihat Detail Kelas →
      </Link>
    </article>
  );
}

/* -------- Katalog bento card — Pencil spec: white p14 radius 16, banner 72px
   radius 12, tag white radius 6, bookmark 28px, title 14px, divider hairline,
   price 15px + disc pill + Enroll h32 light-blue. -------- */
function CatalogBentoCard({ item, workspaceSlug }: { item: PublicProgramCatalogItem; workspaceSlug: string }) {
  const price = priceOf(item);
  const pct = discountPct(price.now, price.was);
  const cat = categoryOf(item);
  const lessons = item.program.totalLessonsCount || 0;
  return (
    <article className="pwa-card" style={{ padding: 14, borderRadius: 16 }} aria-label={item.program.title}>
      <div style={{ height: 72, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#0D52FF', opacity: 0.85 }}>
          {item.program.title.charAt(0).toUpperCase()}
        </span>
        <span className="pwa-pill" style={{ position: 'absolute', left: 8, top: 8, background: '#fff', border: 0, color: '#0F172A', minHeight: 22, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>
          {cat.toUpperCase()}
        </span>
        <span
          aria-hidden="true"
          style={{ position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 8, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1z" /></svg>
        </span>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, margin: '10px 0 0' }}>
        <Link href={`/p/${workspaceSlug}/${item.program.programSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {item.program.title}
        </Link>
      </h3>
      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
        {item.program.subtitle || (item.program.pricing === 'one_time' ? 'Kelas berbayar' : 'Kelas gratis')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
        <span style={{ color: '#475569', fontWeight: 700 }}>
          {lessons > 0 ? `${lessons} materi` : `${item.program.totalModulesCount} modul`}
        </span>
        <span style={{ color: '#94A3B8' }}>
          • {item.isRegistrationAllowed ? 'Pendaftaran dibuka' : (item.registrationStatusNotice || 'Pendaftaran ditutup')}
        </span>
      </div>
      <div style={{ height: 1, background: '#E2E8F0', margin: '10px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{price.label}</span>
          {pct ? (
            <span className="pwa-pill" style={{ background: '#FEE2E2', color: '#DC2626', border: 0, minHeight: 20, padding: '0 6px', borderRadius: 4, fontSize: 10, marginLeft: 6 }}>
              {pct}
            </span>
          ) : null}
        </div>
        <Link
          href={`/p/${workspaceSlug}/${item.program.programSlug}`}
          style={{
            flex: 'none', minHeight: 32, padding: '0 10px', borderRadius: 8,
            background: '#EFF6FF', color: '#0D52FF', fontWeight: 700, fontSize: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
          }}
        >
          Enroll
        </Link>
      </div>
    </article>
  );
}

/* -------- Main client -------- */
export function StorefrontClient({ profile: initialProfile, catalog: initialCatalog }: StorefrontClientProps) {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const [profile, setProfile] = useState<PublicWorkspaceProfile>(initialProfile);
  const [catalog, setCatalog] = useState<PublicProgramCatalogItem[]>(initialCatalog);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('Semua');

  useEffect(() => {
    if (initialProfile.workspaceSlug) {
      setLastPublicWorkspaceSlug(initialProfile.workspaceSlug);
      getPublicWorkspaceQuery(initialProfile.workspaceSlug).then((p) => {
        if (p) setProfile(p);
      });
      listPublicProgramsQuery(initialProfile.workspaceSlug).then((c) => {
        if (c && c.length > 0) setCatalog(c);
      });
    }
    if (refCode) capturePrototypeReferralCode(refCode);
  }, [initialProfile.workspaceSlug, refCode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((item) => {
      if (cat !== 'Semua' && categoryOf(item) !== cat) return false;
      if (!q) return true;
      const hay = `${item.program.title} ${item.program.subtitle ?? ''} ${item.presentation.shortOutcome ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [catalog, query, cat]);

  const featuredItem = useMemo(
    () => catalog.find((item) => item.presentation.featured) || catalog[0],
    [catalog]
  );

  return (
    <div className="pwa-screen">
      <PwaAppHeader workspaceSlug={profile.workspaceSlug} brandName="Ralivo" />

      <main className="pwa-wrap pwa-screen-pad-dock">
        {/* Quick search */}
        <div style={{ paddingTop: 12 }}>
          <PwaSearchBar value={query} onChange={setQuery} onFilterClick={() => setCat('Semua')} />
        </div>

        {/* Category chips */}
        <div style={{ marginTop: 10 }}>
          <PwaChips items={CATEGORY_PRESETS} active={cat} onChange={setCat} />
        </div>

        {/* Featured live cohort */}
        {featuredItem && (
          <div style={{ marginTop: 14 }}>
            <FeaturedCohortCard item={featuredItem} workspaceSlug={profile.workspaceSlug} />
          </div>
        )}

        {/* Katalog unggulan */}
        <PwaSectionHead title="Kelas Unggulan & Trending" linkLabel="Lihat Semua" linkHref={`/p/${profile.workspaceSlug}/catalog`} />
        {filtered.length === 0 ? (
          <div className="pwa-card pwa-card-pad pwa-muted" style={{ textAlign: 'center' }}>
            Tidak ada kelas yang cocok dengan pencarian.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.slice(0, 6).map((item) => (
              <CatalogBentoCard key={item.program.id} item={item} workspaceSlug={profile.workspaceSlug} />
            ))}
          </div>
        )}

        {/* Tentang promotor — data nyata dari profil workspace */}
        <PwaSectionHead title="Tentang Promotor" />
        <div className="pwa-card pwa-card-pad">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="pwa-avatar pwa-avatar-ring" style={{ width: 52, height: 52, fontSize: 18, flex: 'none' }}>
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>{profile.displayName}</div>
              <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                {[profile.roleLabel, profile.stats.location].filter(Boolean).join(' • ') || 'Promotor Ralivo'}
              </div>
            </div>
          </div>
          {profile.bio && (
            <p className="pwa-muted" style={{ fontSize: 12.5, margin: '10px 0 0', lineHeight: 1.6 }}>{profile.bio}</p>
          )}
          <div className="pwa-muted tabular-nums" style={{ fontSize: 11.5, marginTop: 8 }}>
            {String(profile.stats.programCount)} ruang belajar aktif
            {profile.stats.familiesHelped ? ` • ${profile.stats.familiesHelped} keluarga terbantu` : ''}
          </div>
        </div>

        {/* Offline banner */}
        <div style={{ marginTop: 16 }}>
          <PwaOfflineBanner />
        </div>

        {/* Promotor */}
        <div style={{ marginTop: 16 }}>
          <PromoterProfile profile={profile} />
        </div>

        <PublicFooter displayName={profile.displayName.split(' ')[0]} />
      </main>

      <PwaDock workspaceSlug={profile.workspaceSlug} />
    </div>
  );
}
