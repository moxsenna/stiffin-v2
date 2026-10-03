'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { PwaAppHeader, PwaDock, PwaProgress, PwaSectionHead } from '@/components/pwa/pwa';
import { EmptyStateCard, SkeletonCard } from '@/components/pwa/EmptyStateFeedback';
import { getActiveLearnerContactId, resolveWorkspaceSlug, setActiveLearnerSession, getActiveLearnerSession } from '@/lib/session';
import { getPlatformApiClient } from '@/adapters';
import { Certificate } from '@promotor/contracts';

interface ActiveProgram {
  id: string;
  title: string;
  subtitle?: string;
  coverImageUrl?: string;
  modules: Array<{ title: string; lessons?: Array<{ id: string; title: string }> }>;
}

function findNextLesson(prog: ActiveProgram | undefined, enr: { completedLessonIds?: string[] }): { moduleTitle: string; title: string; id: string } | null {
  if (!prog?.modules) return null;
  const completedIds = enr?.completedLessonIds || [];
  for (const mod of prog.modules) {
    for (const lesson of mod.lessons || []) {
      if (!completedIds.includes(lesson.id)) {
        return { moduleTitle: mod.title, title: lesson.title, id: lesson.id };
      }
    }
  }
  return null;
}

export default function LearnerHomePage() {
  const [enrollments, setEnrollments] = useState<Array<Record<string, unknown>> | null>(null);
  const [programsMap, setProgramsMap] = useState<Map<string, ActiveProgram>>(new Map());
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [noSession, setNoSession] = useState(false);
  const [fallbackWorkspace, setFallbackWorkspace] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('Peserta');

  useEffect(() => {
    const activeContactId = getActiveLearnerContactId();
    const resolvedSlug = resolveWorkspaceSlug();
    setFallbackWorkspace(resolvedSlug);
    const sess = getActiveLearnerSession();
    void sess;

    const api = getPlatformApiClient();

    api.getLearnerMe()
      .then((res: { learner?: { contactId?: string; workspaceSlug?: string; name?: string } }) => {
        if (res?.learner?.contactId) {
          setActiveLearnerSession({ contactId: res.learner.contactId, workspaceSlug: res.learner.workspaceSlug ?? '' });
          if (res.learner.workspaceSlug) setFallbackWorkspace(res.learner.workspaceSlug);
          if (res.learner.name) setDisplayName(res.learner.name.split(' ')[0]);
        }
      })
      .catch(() => {
        if (!activeContactId) setNoSession(true);
      });

    api.getMyLearnerPrograms()
      .then((res: { programs?: Array<Record<string, unknown>> }) => {
        const progs = res.programs ?? [];
        setEnrollments(progs);
        const pMap = new Map<string, ActiveProgram>();
        progs.forEach((p) => {
          pMap.set(String(p.programId || p.id), {
            id: String(p.programId || p.id),
            title: String(p.programTitle || p.title || 'Program'),
            subtitle: (p.programSubtitle || p.subtitle) as string | undefined,
            coverImageUrl: p.coverImageUrl as string | undefined,
            modules: (p.modules || []) as ActiveProgram['modules'],
          });
        });
        setProgramsMap(pMap);
      })
      .catch(() => {
        if (!activeContactId) setNoSession(true);
        else setEnrollments([]);
      });

    api.listMyCertificates()
      .then((res: { certificates?: Certificate[] }) => setCertificates(res.certificates ?? []))
      .catch(() => setCertificates([]));
  }, []);

  if (noSession) {
    return (
      <div className="pwa-screen">
        <PwaAppHeader title="Ruang Belajar" subtitle="PWA Peserta" showCart={false} />
        <main className="pwa-wrap pwa-screen-pad-dock">
          <div style={{ paddingTop: 12 }}>
            <EmptyState
              title="Belum masuk ke akun peserta"
              explanation="Silakan masuk atau daftar akun peserta untuk mengakses program dan materi pembelajaran Anda."
              action={<Link href="/masuk" className="pwa-cta">Masuk / Daftar Akun</Link>}
            />
          </div>
        </main>
        <PwaDock workspaceSlug={fallbackWorkspace ?? undefined} />
      </div>
    );
  }

  const list = enrollments ?? [];
  const activeEnrollment =
    list.find((e) => ['ENROLLED', 'STARTED', 'aktif'].includes(String(e.status))) || list[0];
  const programId = activeEnrollment ? String(activeEnrollment.programId ?? activeEnrollment.id) : undefined;
  const activeProgram = programId ? programsMap.get(programId) : undefined;
  const nextLesson = activeEnrollment ? findNextLesson(activeProgram, { completedLessonIds: activeEnrollment.completedLessonIds as string[] | undefined }) : null;
  const pct = Number(activeEnrollment?.progressPercent ?? 0);
  const completedCount = list.filter((e) =>
    ['COMPLETED', 'selesai'].includes(String(e.status)) || Number(e.progressPercent ?? 0) === 100
  ).length;

  const stats = [
    { kicker: 'Terdaftar', value: `${list.length} Kelas`, label: 'Program Diikuti', sub: completedCount > 0 ? `${completedCount} selesai` : 'Baru dimulai' },
    { kicker: 'Progres', value: `${pct}%`, label: 'Program Aktif', sub: String(activeProgram?.title ?? activeEnrollment?.programTitle ?? 'Belum ada program') },
    { kicker: 'Prestasi', value: `${certificates.length}`, label: 'Sertifikat', sub: certificates.length > 0 ? 'Terverifikasi' : 'Selesaikan program' },
  ];

  return (
    <div className="pwa-screen">
      <PwaAppHeader title={`Halo, ${displayName} 👋`} subtitle="SELAMAT DATANG" showCart={false} workspaceSlug={fallbackWorkspace ?? undefined} />

      <main className="pwa-wrap pwa-screen-pad-dock">
        <PwaSectionHead title="Statistik Belajar Anda" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
          {stats.map((s) => (
            <div key={s.label} className="pwa-card" style={{ padding: 10 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pwa-primary)' }}>{s.kicker}</div>
              <div style={{ fontSize: 15, fontWeight: 850, marginTop: 4 }} className="tabular-nums">{s.value}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 9.5, color: 'var(--pwa-muted)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Cohort aktif */}
        {activeEnrollment ? (
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pwa-pill pwa-pill-green">Aktif Belajar</span>
              {activeProgram?.subtitle && (
                <span className="pwa-pill pwa-pill-blue">{activeProgram.subtitle}</span>
              )}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 850, margin: '10px 0 0' }}>
              {String(activeProgram?.title ?? activeEnrollment.programTitle ?? 'Program')}
            </h2>
            <div className="pwa-nested" style={{ marginTop: 10, padding: 10 }}>
              {nextLesson ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, fontWeight: 700 }}>
                    <span>MATERI BERIKUTNYA</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>
                    {`${nextLesson.moduleTitle}: ${nextLesson.title}`}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {pct === 100 ? 'Semua materi selesai — luar biasa! 🎉' : 'Materi program sedang disiapkan.'}
                </div>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
                <span>Progress Belajar</span>
                <span className="tabular-nums">{pct}% Selesai</span>
              </div>
              <PwaProgress pct={pct} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Link
                href={nextLesson ? `/learn/programs/${String(activeEnrollment.id)}/lessons/${nextLesson.id}` : `/learn/programs/${String(activeEnrollment.id)}`}
                style={{ flex: 'none', minHeight: 32, padding: '0 12px', borderRadius: 8, background: '#EFF6FF', color: '#0D52FF', fontWeight: 800, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                ▶ Lanjutkan
              </Link>
              <Link href={`/learn/programs/${String(activeEnrollment.id)}`} style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'inline-flex', alignItems: 'center', minHeight: 32 }}>
                Silabus
              </Link>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'inline-flex', alignItems: 'center', minHeight: 32 }}>
                Unduh Offline
              </span>
            </div>
          </div>
        ) : (
          !enrollments && (
            <div style={{ marginTop: 12 }}>
              <SkeletonCard lines={2} hasThumbnail />
            </div>
          )
        )}

        {enrollments && list.length === 0 && (
          <div style={{ marginTop: 12 }}>
            <EmptyStateCard
              icon="📚"
              title="Anda Belum Terdaftar di Program Edukasi"
              description="Pilih program dari katalog untuk mulai belajar bersama promotor dan komunitas Anda."
              actionLabel={fallbackWorkspace ? 'Lihat Katalog Program' : 'Masuk Akun Lain'}
              actionHref={fallbackWorkspace ? `/p/${fallbackWorkspace}/catalog` : '/masuk'}
            />
          </div>
        )}

        {/* Jadwal live — data sesi live diumumkan promotor via WhatsApp/komunitas */}
        <PwaSectionHead title="Jadwal Live Terdekat" linkLabel="Lihat Kalender" linkHref="/learn/jadwal" />
        <EmptyStateCard
          icon="📅"
          title="Belum Ada Sesi Live Terdekat"
          description="Info sesi live cohort & mentoring dibagikan via grup komunitas WhatsApp dan tersinkronisasi di kalender."
          actionLabel="Buka Kalender"
          actionHref="/learn/jadwal"
        />

        {/* Tenggat — tugas & kuis */}
        <PwaSectionHead title="Tenggat Tugas & Proyek" />
        <EmptyStateCard
          icon="📝"
          title="Tidak Ada Tugas Tertunda"
          description="Semua tugas dan kuis telah diselesaikan. Lanjutkan materi pembelajaran untuk mendapatkan sertifikat."
        />

        {/* Program lain */}
        {list.length > 1 && (
          <>
            <PwaSectionHead title="Program Anda" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((enr) => {
                const prog = programsMap.get(String(enr.programId));
                const done = enr.status === 'COMPLETED' || enr.status === 'selesai' || enr.progressPercent === 100;
                return (
                  <div key={String(enr.id)} className="pwa-card pwa-card-pad">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 13.5 }}>{String(prog?.title || enr.programTitle || 'Program')}</strong>
                      <span className={done ? 'pwa-pill pwa-pill-green' : 'pwa-pill pwa-pill-blue'}>{done ? 'Selesai' : 'Berjalan'}</span>
                    </div>
                    <div style={{ marginTop: 8 }}><PwaProgress pct={Number(enr.progressPercent ?? 0)} /></div>
                    <Link href={`/learn/programs/${String(enr.id)}`} className="pwa-btn-secondary" style={{ width: '100%', marginTop: 10 }}>
                      Buka Ruang Belajar
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {certificates.length > 0 && (
          <>
            <PwaSectionHead title="Sertifikat Saya" />
            {certificates.map((cert) => (
              <a key={cert.serial} href={`/verify/${cert.serial}`} target="_blank" rel="noreferrer" className="pwa-card pwa-card-pad" style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 8 }}>
                <strong style={{ fontSize: 13.5 }}>🎓 {cert.programTitle}</strong>
                <div className="pwa-muted" style={{ fontSize: 11 }}>{cert.serial}</div>
              </a>
            ))}
          </>
        )}
      </main>

      <PwaDock workspaceSlug={fallbackWorkspace ?? undefined} />
    </div>
  );
}
