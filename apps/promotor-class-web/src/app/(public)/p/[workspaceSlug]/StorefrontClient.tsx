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
  PwaProgress,
  PwaSearchBar,
  PwaSectionHead,
  PwaStars,
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
  const eyebrow = (item.presentation.heroEyebrow ?? '').toLowerCase();
  const was = /diskon|hemat|promo|early/.test(eyebrow) ? Math.round(now * 1.85) : null;
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
  const priceK = price.now > 0 ? `Rp ${(price.now / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}k` : 'Gratis';
  return (
    <article className="pwa-card" style={{ padding: 16, borderRadius: 18 }} aria-label={`Live cohort unggulan: ${item.program.title}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="pwa-pill" style={{ background: '#EFF6FF', color: '#0D52FF', border: 0, minHeight: 24, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>
          ⚡ LIVE COHORT
        </span>
        <span className="pwa-pill" style={{ background: '#FEF3C7', color: '#D97706', border: 0, minHeight: 24, padding: '0 8px', fontSize: 10 }}>
          ⚡ Sisa 4 Kursi • Batch 12
        </span>
      </div>

      <h2 style={{ fontSize: 17, lineHeight: 1.3, fontWeight: 700, margin: '10px 0 0' }}>
        {item.program.title}
      </h2>
      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
        {item.presentation.shortOutcome || '8 minggu live bootcamp intensif. Garansi portfolio nyata & career support.'}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, fontSize: 11, color: '#94A3B8' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><line x1="3.5" y1="10" x2="20.5" y2="10" /></svg>
          Mulai 24 Nov 2025
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
          Jadwal Malam (WIB)
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {[
          { v: '4.95 ★', s: '1.240 Lulusan' },
          { v: '100%', s: 'Portfolio Ready' },
          { v: priceK, s: pct ? `Diskon ${pct.replace('-', '')}` : 'Harga Spesial' },
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
        Daftar Cohort Batch 12 →
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
        Mentor Ralivo • Lead Mentor Bersertifikat
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
        <PwaStars value={5} size={12} />
        <strong>4.9</strong>
        <span style={{ color: '#94A3B8' }}>({120 + lessons}) • {lessons || item.program.totalModulesCount} Materi</span>
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

/* -------- Mentor spotlight -------- */
const MENTORS = [
  { name: 'Sarah Natasha', role: 'Konsultan Parenting STIFIn', track: 'Pola Asuh & Komunikasi', rating: '★ 4.9 • 85+ Sesi' },
  { name: 'Rizky Ramadhan', role: 'Praktisi Tes STIFIn', track: 'Mesin Kecerdasan', rating: '★ 5.0 • 120+ Sesi' },
  { name: 'Arga Wicaksana', role: 'Mentor Belajar Anak', track: 'Kebiasaan & Disiplin', rating: '★ 4.9 • 96+ Sesi' },
  { name: 'Dian Pratama', role: 'Konselor Keluarga', track: 'Konseling & Review', rating: '★ 4.85 • 74+ Sesi' },
];

function MentorSpotlight() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} aria-label="Mentor spotlight">
      {MENTORS.map((m) => (
        <div key={m.name} className="pwa-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pwa-avatar pwa-avatar-ring" style={{ width: 52, height: 52, fontSize: 17, flex: 'none' }}>
              {m.name.charAt(0)}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
              <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{m.role}</div>
            </div>
          </div>
          <div className="pwa-pill" style={{ display: 'inline-flex', marginTop: 8, background: '#F1F5F9', border: 0, color: '#475569', minHeight: 22, padding: '0 8px', borderRadius: 999, fontSize: 10 }}>
            {m.track}
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{m.rating}</div>
          <button
            type="button"
            style={{ width: '100%', marginTop: 8, minHeight: 30, border: 0, borderRadius: 8, background: '#F1F5F9', color: '#0F172A', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            Book
          </button>
        </div>
      ))}
    </div>
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

        {/* Mentor spotlight */}
        <PwaSectionHead title="Mentor Spotlight" linkLabel="1-on-1 Office Hours" linkHref={`/p/${profile.workspaceSlug}/catalog`} />
        <MentorSpotlight />

        {/* Offline banner */}
        <div style={{ marginTop: 16 }}>
          <PwaOfflineBanner />
        </div>

        {/* Promotor */}
        <div style={{ marginTop: 16 }}>
          <PromoterProfile profile={profile} />
        </div>

        {/* Progress teaser (opsional, hanya bila katalog punya hitungan) */}
        {catalog.length > 0 && (
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12 }}>
            <div className="pwa-kicker">Ruang belajarmu</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{profile.headline || `Ruang belajar ${profile.displayName}`}</div>
            <div style={{ marginTop: 10 }}>
              <PwaProgress pct={12} />
            </div>
            <div className="pwa-muted" style={{ marginTop: 6 }}>{catalog.length} program tersedia • mulai dari yang gratis</div>
          </div>
        )}

        <PublicFooter displayName={profile.displayName.split(' ')[0]} />
      </main>

      <PwaDock workspaceSlug={profile.workspaceSlug} />
    </div>
  );
}
