'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PublicProgramDetail } from '@/modules/public-storefront/types';
import { PublicFooter } from '@/components/public/PublicFooter';
import { RegistrationSection } from '@/components/public/RegistrationSection';
import { PwaAppHeader, PwaDock, PwaProgress, PwaStars } from '@/components/pwa/pwa';
import { setLastPublicWorkspaceSlug } from '@/lib/session';
import { capturePrototypeReferralCode } from '@/lib/referral-capture';
import { formatIDR } from '@promotor/platform-core';

interface PublicLandingClientProps {
  detail: PublicProgramDetail;
}

const BATCHES = [
  {
    id: 'weekend',
    title: 'Batch 04 — Weekend Intensive',
    status: 'SISA 3 KURSI',
    statusTone: 'danger' as const,
    dates: '17 Mei – 12 Juli 2025',
    schedule: 'Sabtu & Minggu, 10.00-12.30 WIB',
    note: 'Termasuk 1-on-1 Portfolio & Mock Interview Hiring Partner',
    seatsPct: 82,
  },
  {
    id: 'weekday',
    title: 'Batch 05 — Weekday Evening',
    status: 'EARLY BIRD',
    statusTone: 'green' as const,
    dates: '9 Juni – 4 Agustus 2025',
    schedule: 'Selasa & Kamis, 19.30-22.00 WIB',
    note: 'Tanya Jawab Langsung • Code Review SLA Maks 24 Jam',
    seatsPct: 46,
  },
];

function TrailerCard({ title, onPlay }: { title: string; onPlay: () => void }) {
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
        <span className="pwa-pill" style={{ background: '#fff', color: '#0F172A', border: 0, minHeight: 24, padding: '0 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
          <span className="pwa-dot-live" /> BATCH 04 LIVE
        </span>
        <span className="pwa-pill" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', minHeight: 24, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>
          INTERMEDIATE
        </span>
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
  const [batchId, setBatchId] = useState('weekend');
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    if (promoter.workspaceSlug) setLastPublicWorkspaceSlug(promoter.workspaceSlug);
    if (refCode) capturePrototypeReferralCode(refCode);
  }, [promoter.workspaceSlug, refCode]);

  const batch = BATCHES.find((b) => b.id === batchId) ?? BATCHES[0];
  const isPaid = program.pricing === 'one_time';
  const listPrice = program.priceAmount || 2475000;
  const normalPrice = Math.round(listPrice * 1.8);
  const lessonCount = program.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0;

  const scrollToRegister = () => {
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pwa-screen">
      <PwaAppHeader
        title="Detail Kelas"
        subtitle="INTENSIVE COHORT"
        showBack
        backHref={`/p/${promoter.workspaceSlug}`}
        workspaceSlug={promoter.workspaceSlug}
      />

      <main className="pwa-wrap pwa-screen-pad-dock-cta">
        {/* Hero trailer */}
        <div style={{ paddingTop: 12 }}>
          <TrailerCard title={program.title} onPlay={() => setTrailerOpen(true)} />
          {trailerOpen && (
            <div className="pwa-nested" style={{ padding: 12, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Cuplikan silabus 3 menit</div>
              <div className="pwa-muted" style={{ marginTop: 4 }}>
                Preview video akan tampil di sini setelah URL trailer diisi di CMS. Kurikulum lengkap tersedia di bawah.
              </div>
              <button type="button" className="pwa-btn-secondary" style={{ marginTop: 10 }} onClick={() => setTrailerOpen(false)}>
                Tutup pratinjau
              </button>
            </div>
          )}
        </div>

        {/* Meta strip — Pencil spec: 3 white cells radius 12 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { v: '8 Minggu', l: 'Durasi' },
            { v: '16 Sesi Live', l: 'Interaktif' },
            { v: '4 Capstone', l: 'Project' },
          ].map((s) => (
            <div key={s.l} className="pwa-card" style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{s.v}</div>
              <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Title + rating */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="pwa-pill pwa-pill-blue">FULLSTACK & AI</span>
            <span className="pwa-pill pwa-pill-dark">JOB-READY COHORT</span>
          </div>
          <h1 style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.01em', margin: '10px 0 0' }}>
            {program.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
            <PwaStars value={5} />
            <strong>4.95</strong>
            <span style={{ color: 'var(--pwa-subtle)' }}>(382 ulasan) • 1.420 Alumni • Terverifikasi</span>
          </div>
          {program.description && (
            <p className="pwa-muted" style={{ marginTop: 8 }}>{program.description || program.subtitle}</p>
          )}
        </div>

        {/* Mentor box */}
        <div className="pwa-card pwa-card-pad" style={{ marginTop: 14 }}>
          <div className="pwa-kicker">LEAD MENTOR & INSTRUKTUR</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
            <span className="pwa-avatar pwa-avatar-ring" style={{ width: 48, height: 48, fontSize: 18 }}>A</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>Arkan Dananjaya, M.Sc.</strong>
                <span className="pwa-pill pwa-pill-green">Mentor Resmi</span>
              </div>
              <div className="pwa-muted">Principal AI Architect • Ex-Lead Tech Gojek & Tokopedia</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[
              { v: '9+ Thn', l: 'Pengalaman' },
              { v: '4.800+', l: 'Mentee Lulus' },
              { v: 'Top 1%', l: 'Instructor' },
            ].map((s) => (
              <div key={s.l} className="pwa-nested" style={{ flex: 1, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 850 }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'var(--pwa-muted)' }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="pwa-muted" style={{ marginTop: 8 }}>Didampingi 4 Senior Reviewer untuk feedback kode harian</div>
        </div>

        {/* Batch selector */}
        <div className="pwa-section-head" style={{ marginTop: 18 }}>
          <h2 className="pwa-section-title">Pilih Jadwal Cohort</h2>
        </div>
        <div className="pwa-muted" style={{ marginTop: -6 }}>Sesi live interaktif via Zoom dengan rekaman HD • Live 2-Arah</div>
        <div role="radiogroup" aria-label="Pilih jadwal cohort" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {BATCHES.map((b) => {
            const selected = b.id === batchId;
            return (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setBatchId(b.id)}
                className="pwa-card"
                style={{
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: selected ? 'var(--pwa-primary)' : 'var(--pwa-border)',
                  boxShadow: selected ? '0 0 0 3px rgba(13,82,255,0.14)' : undefined,
                  font: 'inherit',
                  color: 'inherit',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14 }}>{b.title}</strong>
                  {b.statusTone === 'danger' ? (
                    <span className="pwa-pill" style={{ background: '#FEF3C7', color: '#D97706', border: 0, minHeight: 22, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>{b.status}</span>
                  ) : (
                    <span className="pwa-pill pwa-pill-green">{b.status}</span>
                  )}
                </div>
                <div className="pwa-muted" style={{ marginTop: 4 }}>{b.dates} • {b.schedule}</div>
                <div className="pwa-muted" style={{ marginTop: 2 }}>{b.note}</div>
                <div style={{ marginTop: 10 }}>
                  <PwaProgress pct={b.seatsPct} />
                  <div style={{ fontSize: 11, color: 'var(--pwa-muted)', marginTop: 4 }}>Kuota terisi {b.seatsPct}%</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Outcomes */}
        <h2 className="pwa-section-title" style={{ marginTop: 20 }}>Yang Akan Kamu Kuasai</h2>
        <div className="pwa-muted">Kurikulum berbasis practical project kelas industri • 4 Pilar Utama</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          {(presentation.learningOutcomes?.length
            ? presentation.learningOutcomes.slice(0, 4).map((o) => ({ t: o.title, d: o.description }))
            : [
                { t: 'Fullstack LLM & RAG', d: 'LangChain • pgvector • RAG' },
                { t: 'Offline-First PWA', d: 'Workbox • Service Worker' },
                { t: 'FastAPI Streaming', d: 'SSE • Redis • Realtime' },
                { t: 'Capstone & Demo', d: 'Deploy • Hiring • Pitch' },
              ]
          ).map((o) => (
            <div key={o.t} className="pwa-card" style={{ padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{o.t}</div>
              <div className="pwa-muted" style={{ fontSize: 11, marginTop: 4 }}>{o.d}</div>
            </div>
          ))}
        </div>

        {/* Syllabus */}
        <h2 className="pwa-section-title" style={{ marginTop: 20 }}>Kurikulum & Silabus Modul</h2>
        <div className="pwa-muted">{lessonCount > 0 ? `${program.modules.length} modul • ${lessonCount} materi` : '8 Minggu • 16 Sesi Live • 4 Projek Nyata'} • Tahun 2025</div>
        <div style={{ marginTop: 10 }}>
          {program.modules?.length ? (
            program.modules.map((mod, i) => (
              <Accordion
                key={mod.id}
                title={`MG ${i * 2 + 1}-${i * 2 + 2} • ${mod.title}`}
                meta={`${mod.lessons?.length || 0} sesi • Live + hands-on lab`}
                defaultOpen={i === 0}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mod.lessons.map((les, j) => (
                    <div key={les.id} className="pwa-nested" style={{ padding: '9px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={j === 0 ? 'pwa-pill pwa-pill-live' : 'pwa-pill pwa-pill-blue'} style={{ flex: 'none' }}>
                        {j === 0 ? 'LIVE' : 'HANDS-ON'}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{les.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--pwa-subtle)', flex: 'none' }}>2.5 Jam</span>
                    </div>
                  ))}
                </div>
              </Accordion>
            ))
          ) : (
            <>
              <Accordion title="MG 1-2 • PWA & Next.js 15 Foundation" meta="Live • Sesi 1-2 + Tugas 1" defaultOpen>
                <div className="pwa-nested" style={{ padding: '9px 10px', fontSize: 12.5, fontWeight: 600 }}>Sesi 1: Next.js 15 App Router & PWA Architecture • 2.5 Jam</div>
                <div className="pwa-nested" style={{ padding: '9px 10px', fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>Sesi 2: Service Workers, Cache API & Offline Fallback</div>
              </Accordion>
              <Accordion title="MG 3-4 • FastAPI Backend & Vector DB" meta="4 Sesi Live" >
                <div className="pwa-muted">pgvector • FastAPI • SSE streaming • Redis.</div>
              </Accordion>
              <Accordion title="MG 5-6 • LangChain & RAG Pipelines" meta="4 Sesi Live">
                <div className="pwa-muted">RAG pipelines • hybrid search • evaluasi.</div>
              </Accordion>
              <Accordion title="MG 7-8 • Production & Demo Day" meta="4 Sesi + Pitch">
                <div className="pwa-muted">Hardening • capstone • demo day hiring partner.</div>
              </Accordion>
            </>
          )}
        </div>
        <button type="button" className="pwa-btn-secondary" style={{ width: '100%', marginTop: 10 }}>
          Unduh Silabus Lengkap (PDF 24 Hal.)
        </button>

        {/* Alumni proof */}
        <h2 className="pwa-section-title" style={{ marginTop: 20 }}>Review & Pengalaman Alumni</h2>
        <div className="pwa-muted">Dipercaya lebih dari 1.400 developer profesional</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[
            { v: '4.95/5.0', l: 'Rating' },
            { v: '98%', l: 'Kelulusan' },
            { v: '85%', l: 'Hired 90 hari' },
          ].map((s) => (
            <div key={s.l} className="pwa-card" style={{ flex: 1, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 850 }}>{s.v}</div>
              <div style={{ fontSize: 10, color: 'var(--pwa-muted)' }}>{s.l}</div>
            </div>
          ))}
        </div>
        {[
          { n: 'Bima Raditya', r: 'Lead Frontend Engineer • Alumni Batch 02', t: 'Mentor fast-respon, capstone langsung dipakai portofolio dan lolos screening.' },
          { n: 'Sarah Amalia', r: 'Fullstack Engineer • Alumni Batch 03', t: 'Kurikulum paling rapi yang pernah saya ikuti. Hired via Ralivo Network.' },
        ].map((t) => (
          <figure key={t.n} className="pwa-card pwa-card-pad" style={{ margin: '10px 0 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="pwa-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{t.n.charAt(0)}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{t.n}</div>
                <div style={{ fontSize: 11, color: 'var(--pwa-muted)' }}>{t.r}</div>
              </div>
            </div>
            <blockquote style={{ fontSize: 12.5, lineHeight: 1.6, margin: '8px 0 0', color: 'var(--pwa-muted)' }}>
              “{t.t}”
            </blockquote>
          </figure>
        ))}

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
            <div className="pwa-muted" style={{ fontSize: 11 }}>100% Garansi • Sisa 3 Kursi</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="pwa-price-was">{formatIDR(normalPrice)}</span>
              <strong style={{ fontSize: 16 }}>{isPaid ? formatIDR(listPrice) : 'Gratis'}</strong>
              <span className="pwa-pill pwa-pill-disc">HEMAT 45%</span>
            </div>
          </div>
          <button type="button" onClick={scrollToRegister} className="pwa-cta" style={{ width: 'auto', flex: 'none', padding: '0 16px', minHeight: 44, borderRadius: 12, fontSize: 13.5 }}>
            Daftar Cohort
          </button>
        </div>
      </div>

      <PwaDock workspaceSlug={promoter.workspaceSlug} />
    </div>
  );
}
