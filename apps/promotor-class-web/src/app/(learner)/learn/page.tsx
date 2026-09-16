'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { PwaAppHeader, PwaDock, PwaProgress, PwaSectionHead } from '@/components/pwa/pwa';
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
  const pct = Number(activeEnrollment?.progressPercent ?? 68);

  const stats = [
    { kicker: 'Aktif • Februari 2025', value: `${list.length || 3} Kelas`, label: 'Kursus Berjalan', sub: '2 Cohort • 1 Mini-course' },
    { kicker: 'Rajin', value: '96.4%', label: 'Kehadiran Sesi', sub: '12 dari 13 sesi dihadiri' },
    { kicker: '+4.5 Jam mgg ini', value: '48.5 Jam', label: 'Total Jam Belajar', sub: 'Target cohort: 60 Jam' },
  ];

  return (
    <div className="pwa-screen">
      <PwaAppHeader title={`Halo, ${displayName} 👋`} subtitle="SELAMAT DATANG" showCart={false} workspaceSlug={fallbackWorkspace ?? undefined} />

      <main className="pwa-wrap pwa-screen-pad-dock">
        {/* PWA status — Pencil spec: white card, blue icon tile */}
        <div className="pwa-card" style={{ marginTop: 12, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center', borderRadius: 16 }}>
          <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', color: '#0D52FF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>📲</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 12.5, color: '#0F172A' }}>Aplikasi PWA Siap Offline</strong>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>• 3 Modul Tersimpan • 248 MB</div>
          </div>
          <span className="pwa-pill pwa-pill-green">PWA Aktif • 14 Hari</span>
        </div>

        <PwaSectionHead title="Statistik Belajar Anda" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
              <span className="pwa-pill pwa-pill-live"><span className="pwa-dot-live" /> LIVE BOOTCAMP</span>
              <span className="pwa-pill pwa-pill-blue">Batch #12 • Minggu 4/8</span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 850, margin: '10px 0 0' }}>
              {String(activeProgram?.title ?? activeEnrollment.programTitle ?? 'Fullstack AI & LLM Engineer Bootcamp')}
            </h2>
            <div className="pwa-muted" style={{ marginTop: 2 }}>Fahri R. (AI Architect) • 42 Peserta Se-angkatan</div>
            <div className="pwa-nested" style={{ marginTop: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, fontWeight: 700 }}>
                <span>MATERI BERJALAN • MODUL 4</span>
                <span className="tabular-nums">18m tersisa</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>
                {nextLesson ? `${nextLesson.moduleTitle}: ${nextLesson.title}` : 'RAG Pipeline: Hybrid Search & Vector DB (pgvector)'}
              </div>
              <div className="pwa-muted" style={{ fontSize: 11 }}>Video 4.3: Implementasi Metadata Filtering</div>
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
            <div className="pwa-card pwa-card-pad" style={{ marginTop: 12 }}>
              <div className="skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton-line" style={{ width: '60%', marginTop: 8 }} />
            </div>
          )
        )}

        {enrollments && list.length === 0 && (
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12 }}>
            <EmptyState
              title="Anda belum terdaftar dalam program apa pun"
              explanation="Pilih program dari katalog untuk mulai belajar."
              action={fallbackWorkspace ? <Link href={`/p/${fallbackWorkspace}/catalog`} className="pwa-cta">Lihat Katalog Program</Link> : <Link href="/masuk" className="pwa-cta">Masuk dengan Akun Lain</Link>}
            />
          </div>
        )}

        {/* Jadwal live — Pencil spec: outline blue hari ini, white besok */}
        <PwaSectionHead title="Jadwal Live Terdekat" linkLabel="Lihat Kalender" linkHref="/learn/jadwal" />
        <div className="pwa-card" style={{ padding: 14, borderRadius: 16, borderColor: '#93C5FD' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="pwa-pill" style={{ background: '#EFF6FF', color: '#0D52FF', border: 0, minHeight: 22, padding: '0 8px', borderRadius: 6, fontSize: 10 }}><span className="pwa-dot-live" /> HARI INI • 19:30 - 21:30 WIB</span>
            <span className="pwa-pill pwa-pill-amber">Mulai dlm 1j 45m</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 8 }}>Live Coding: Fine-Tuning Llama 3 with LoRA & Unsloth</div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Pemateri: Fahri Ramadhan • Lead AI Architect</div>
          <div style={{ marginTop: 8, padding: '8px 10px', fontSize: 12, background: '#F8FAFC', borderRadius: 8 }}>
            Zoom Room • ID: 884-219-030 • Pass: RLV2025
          </div>
          <button type="button" style={{ marginTop: 10, minHeight: 42, padding: '0 14px', borderRadius: 12, border: 0, background: '#0D52FF', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Gabung Sesi Live</button>
        </div>
        <div className="pwa-card pwa-card-pad" style={{ marginTop: 8 }}>
          <span className="pwa-pill pwa-pill-blue">BESOK • 20:00 WIB</span>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 8 }}>Mentoring & Review — Office Hours: Code Review & Konsultasi Milestone 2</div>
          <div className="pwa-muted">Mentor: Alex Pratama • Google Meet • Pengingat Aktif ✓</div>
        </div>

        {/* Tenggat — Pencil spec: urgent outline amber, tombol h32 */}
        <PwaSectionHead title="Tenggat Tugas & Proyek" linkLabel="Semua Tugas" linkHref="/learn" />
        <div className="pwa-card" style={{ padding: 14, borderRadius: 16, borderColor: '#FDE68A' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="pwa-pill" style={{ background: '#FEE2E2', color: '#DC2626', border: 0, minHeight: 22, padding: '0 8px', borderRadius: 6, fontSize: 10 }}>BESOK • 23:59 WIB</span>
            <span className="pwa-pill pwa-pill-amber">Tersisa 16 Jam</span>
            <span className="pwa-pill pwa-pill-dark">Belum Dikirim</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', marginTop: 8 }}>Project Milestone 2: RAG Pipeline Integration</div>
          <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Deliverable: GitHub Repo + Loom Video Demo</div>
          <button type="button" style={{ marginTop: 10, minHeight: 32, padding: '0 12px', borderRadius: 8, border: 0, background: '#EFF6FF', color: '#0D52FF', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>Submit</button>
        </div>
        <div className="pwa-card" style={{ marginTop: 8, padding: 14, borderRadius: 16 }}>
          <span className="pwa-pill pwa-pill-blue">3 MARET • 23:59 WIB • Bobot 15%</span>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', marginTop: 8 }}>Quiz Evaluasi: Vector Embeddings & Similarity</div>
          <div style={{ fontSize: 11.5, color: '#94A3B8' }}>20 Soal Pilihan Ganda • 30 Menit • Passing Grade 80%</div>
          <button type="button" style={{ marginTop: 10, minHeight: 32, padding: '0 12px', borderRadius: 8, border: 0, background: '#EFF6FF', color: '#0D52FF', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>Start Quiz</button>
        </div>

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
