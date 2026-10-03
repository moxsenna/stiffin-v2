'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { PublicFooter } from '@/components/public/PublicFooter';
import { RegistrationSection } from '@/components/public/RegistrationSection';
import { PwaAppHeader, PwaDock } from '@/components/pwa/pwa';
import { setLastPublicWorkspaceSlug } from '@/lib/session';
import { capturePrototypeReferralCode } from '@/lib/referral-capture';
import { formatIDR } from '@promotor/platform-core';

interface PublicLandingClientProps {
  detail: PublicProgramDetail;
}

function TrailerCard({ title, badge, onPlay }: { title: string; badge?: string | null; onPlay: () => void }) {
  return (
    <div className="pwa-player" role="img" aria-label={`Cuplikan video ${title}`} style={{ borderRadius: 20, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, #0F172A 0%, #1E2A5A 62%, #0D52FF 135%)',
        }}
      />
      <div className="pwa-player-shade" />
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {badge && (
          <span className="pwa-pill" style={{ background: '#fff', color: '#0F172A', border: 0, minHeight: 24, padding: '0 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
            {badge}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onPlay}
        aria-label="Putar cuplikan silabus"
        style={{
          position: 'absolute',
          inset: 0,
          margin: 'auto',
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.95)',
          background: '#0D52FF',
          boxShadow: '0 8px 24px rgba(2,6,23,0.45)',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ▶
      </button>
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 10,
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        Tonton Cuplikan Silabus (3 Menit)
      </div>
    </div>
  );
}

function Accordion({ title, meta, children, defaultOpen = false }: { title: string; meta?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pwa-acc">
      <button type="button" className="pwa-acc-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>{title}</span>
          {meta && <span className="pwa-muted" style={{ display: 'block', marginTop: 2 }}>{meta}</span>}
        </span>
        <span style={{ flex: 'none', fontSize: 15, color: 'var(--pwa-muted)' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={{ padding: '0 12px 12px' }}>{children}</div>}
    </div>
  );
}

export function PublicLandingClient({ detail }: PublicLandingClientProps) {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const { promoter, presentation, program } = detail;
  const [trailerOpen, setTrailerOpen] = useState(false);
  const trailerVideoUrl = (presentation as any)?.trailerVideoUrl || (presentation as any)?.videoUrl || null;

  useEffect(() => {
    if (promoter.workspaceSlug) setLastPublicWorkspaceSlug(promoter.workspaceSlug);
    if (refCode) capturePrototypeReferralCode(refCode);
  }, [promoter.workspaceSlug, refCode]);

  const isPaid = program.pricing === 'one_time';
  const listPrice = program.priceAmount || 0;
  const officialStrike = (presentation as any)?.strikePriceAmount;
  const normalPrice = typeof officialStrike === 'number' && officialStrike > listPrice ? officialStrike : null;
  const discountLabel =
    normalPrice && normalPrice > listPrice
      ? `HEMAT ${Math.round((1 - listPrice / normalPrice) * 100)}%`
      : null;
  const lessonCount = program.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0;

  const scrollToRegister = () => {
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pwa-screen">
      <PwaAppHeader
        title="Detail Kelas"
        subtitle={presentation.heroEyebrow || (isPaid ? 'KELAS BERBAYAR' : 'KELAS GRATIS')}
        showBack
        backHref={`/p/${promoter.workspaceSlug}`}
        workspaceSlug={promoter.workspaceSlug}
      />

      <main className="pwa-wrap pwa-screen-pad-dock-cta">
        {/* Hero trailer */}
        <div style={{ paddingTop: 12 }}>
          <TrailerCard title={program.title} badge={presentation.heroEyebrow} onPlay={() => setTrailerOpen(true)} />
          {trailerOpen && (
            <div className="pwa-nested" style={{ padding: 12, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Cuplikan silabus program</div>
              {trailerVideoUrl ? (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginTop: 8, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  {trailerVideoUrl.includes('youtube.com') || trailerVideoUrl.includes('youtu.be') ? (
                    <iframe
                      src={trailerVideoUrl.replace('watch?v=', 'embed/')}
                      title="Trailer Video"
                      style={{ border: 0, width: '100%', height: '100%' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={trailerVideoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  )}
                </div>
              ) : (
                <div className="pwa-muted" style={{ marginTop: 4 }}>
                  Preview video akan tampil di sini setelah URL trailer diisi di CMS. Kurikulum lengkap tersedia di bawah.
                </div>
              )}
              <button type="button" className="pwa-btn-secondary" style={{ marginTop: 10 }} onClick={() => setTrailerOpen(false)}>
                Tutup pratinjau
              </button>
            </div>
          )}
        </div>

        {/* Meta strip — angka nyata dari kurikulum: modul, materi, durasi */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { v: `${program.modules.length} Modul`, l: 'Kurikulum' },
            { v: lessonCount > 0 ? `${lessonCount} Materi` : '—', l: 'Konten' },
            { v: presentation.durationLabel || (isPaid ? 'Berbayar' : 'Gratis'), l: 'Akses' },
          ].map((s) => (
            <div key={s.l} className="pwa-card" style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{s.v}</div>
              <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Title */}
        <div style={{ marginTop: 14 }}>
          {presentation.heroEyebrow && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="pwa-pill pwa-pill-blue">{presentation.heroEyebrow}</span>
            </div>
          )}
          <h1 style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.01em', margin: '10px 0 0' }}>
            {program.title}
          </h1>
          {(program.description || program.subtitle || presentation.shortOutcome) && (
            <p className="pwa-muted" style={{ marginTop: 8 }}>
              {presentation.shortOutcome || program.description || program.subtitle}
            </p>
          )}
        </div>

        {/* Promotor box — data nyata dari profil workspace */}
        <div className="pwa-card pwa-card-pad" style={{ marginTop: 14 }}>
          <div className="pwa-kicker">DIDAMPINGI PROMOTOR</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
            <span className="pwa-avatar pwa-avatar-ring" style={{ width: 48, height: 48, fontSize: 18 }}>
              {promoter.displayName.charAt(0).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>{promoter.displayName}</strong>
                <span className="pwa-pill pwa-pill-green">Promotor Resmi</span>
              </div>
              <div className="pwa-muted">
                {[promoter.roleLabel, promoter.stats.location].filter(Boolean).join(' • ') || 'Pendamping belajar Anda'}
              </div>
            </div>
          </div>
          {promoter.bio && (
            <p className="pwa-muted" style={{ fontSize: 12.5, margin: '10px 0 0', lineHeight: 1.6 }}>{promoter.bio}</p>
          )}
        </div>

        {/* Outcomes */}
        <h2 className="pwa-section-title" style={{ marginTop: 20 }}>Yang Akan Kamu Kuasai</h2>
        <div className="pwa-muted">Materi yang disusun promotor untuk program ini</div>
        {presentation.learningOutcomes?.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {presentation.learningOutcomes.slice(0, 4).map((o) => (
              <div key={o.title} className="pwa-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{o.title}</div>
                <div className="pwa-muted" style={{ fontSize: 11, marginTop: 4 }}>{o.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pwa-card pwa-card-pad pwa-muted" style={{ marginTop: 10, textAlign: 'center' }}>
            Detail capaian pembelajaran akan diumumkan promotor.
          </div>
        )}

        {/* Syllabus */}
        <h2 className="pwa-section-title" style={{ marginTop: 20 }}>Kurikulum & Silabus Modul</h2>
        <div className="pwa-muted">{lessonCount > 0 ? `${program.modules.length} modul • ${lessonCount} materi` : 'Kurikulum sedang disiapkan promotor'}</div>
        <div style={{ marginTop: 10 }}>
          {program.modules?.length ? (
            program.modules.map((mod, i) => (
              <Accordion
                key={mod.id}
                title={`Modul ${i + 1} • ${mod.title}`}
                meta={`${mod.lessons?.length || 0} materi`}
                defaultOpen={i === 0}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mod.lessons.map((les, j) => (
                    <div key={les.id} className="pwa-nested" style={{ padding: '9px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="pwa-pill pwa-pill-blue" style={{ flex: 'none' }}>
                        {j + 1}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{les.title}</span>
                    </div>
                  ))}
                </div>
              </Accordion>
            ))
          ) : (
            <div className="pwa-card pwa-card-pad pwa-muted" style={{ textAlign: 'center' }}>
              Modul kurikulum sedang disiapkan promotor.
            </div>
          )}
        </div>

        {/* Registration (checkout form) */}
        <div style={{ marginTop: 18 }}>
          <RegistrationSection detail={detail} />
        </div>

        <div style={{ marginTop: 8 }}>
          <Link href={`/p/${promoter.workspaceSlug}`} className="pwa-btn-secondary" style={{ width: '100%' }}>
            ← Kembali ke ruang belajar
          </Link>
        </div>

        <PublicFooter displayName={promoter.displayName.split(' ')[0]} />
      </main>

      {/* Sticky bottom enrollment bar */}
      <div className="pwa-sticky-cta" role="complementary" aria-label="Pendaftaran cepat">
        <div className="pwa-sticky-cta-inner">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pwa-muted" style={{ fontSize: 11 }}>
              {detail.isRegistrationAllowed ? 'Pendaftaran dibuka' : (detail.registrationStatusNotice || 'Pendaftaran ditutup')}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              {normalPrice && (
                <span className="pwa-price-was">{formatIDR(normalPrice)}</span>
              )}
              <strong style={{ fontSize: 16 }}>{isPaid ? formatIDR(listPrice) : 'Gratis'}</strong>
              {discountLabel && (
                <span className="pwa-pill pwa-pill-disc">{discountLabel}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={scrollToRegister} className="pwa-cta" style={{ width: 'auto', flex: 'none', padding: '0 16px', minHeight: 44, borderRadius: 12, fontSize: 13.5 }}>
            {isPaid ? 'Daftar Kelas' : 'Ikuti Gratis'}
          </button>
        </div>
      </div>

      <PwaDock workspaceSlug={promoter.workspaceSlug} />
    </div>
  );
}
