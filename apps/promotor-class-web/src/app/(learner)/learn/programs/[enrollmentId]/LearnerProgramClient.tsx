'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getActiveLearnerContactId } from '@/lib/session';
import { getEnrollmentByIdQuery } from '@/modules/enrollments/queries';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getEnrollmentFullDetailsQuery } from '@/modules/learning/queries';
import { PwaAppHeader, PwaDock, PwaProgress } from '@/components/pwa/pwa';
import { Enrollment, Program } from '@promotor/contracts';

type Tab = 'materi' | 'diskusi' | 'catatan';

/* Forum Q&A statis sesuai referensi (data live tetap dari backend bila ada) */
const QA_THREADS = [
  {
    name: 'Daffa Raihan',
    time: '25m lalu',
    q: 'Apakah Pinecone Serverless lebih hemat dibanding pod-based untuk project portfolio?',
    a: 'Betul sekali, serverless pay-per-read/write hemat s.d. 85% untuk traffic testing!',
    mentor: 'Kak Fikri Ramadhan',
  },
];

export function LearnerProgramClient() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [tab, setTab] = useState<Tab>('materi');
  const [openMod, setOpenMod] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const details = await getEnrollmentFullDetailsQuery(enrollmentId);
        if (details?.enrollment && details?.program) {
          const enr = details.enrollment as unknown as Record<string, unknown>;
          const prog = details.program as unknown as Record<string, unknown>;
          const activeContactId = getActiveLearnerContactId();
          if (activeContactId && enr.contactId && enr.contactId !== activeContactId) {
            setAccessDenied(true);
            return;
          }
          if (enr.progressPercent === 100 || enr.learningStatus === 'COMPLETED') {
            window.location.href = `/learn/programs/${enrollmentId}/completed`;
            return;
          }
          const progressMap: Record<string, unknown> = {};
          for (const m of (prog.modules || []) as Array<Record<string, unknown>>) {
            for (const l of (m.lessons || []) as Array<Record<string, unknown>>) {
              progressMap[String(l.id)] = { completed: Boolean((l as { isCompleted?: boolean }).isCompleted) };
            }
          }
          setEnrollment({ ...(enr as object), lessonProgress: progressMap } as unknown as Enrollment);
          setProgram(prog as unknown as Program);
          const mods = (prog.modules || []) as Array<{ id: string }>;
          if (mods[1]) setOpenMod(mods[1].id);
          else if (mods[0]) setOpenMod(mods[0].id);
          return;
        }
      } catch (err) {
        console.warn('[LearnerProgramClient] full details fallback:', err);
      }
      getEnrollmentByIdQuery(enrollmentId).then((enr) => {
        if (!enr) return;
        const activeContactId = getActiveLearnerContactId();
        if (activeContactId && enr.contactId !== activeContactId) {
          setAccessDenied(true);
          return;
        }
        setEnrollment({ ...enr, lessonProgress: enr.lessonProgress || {} });
        getProgramByIdQuery(enr.programId).then((prog) => {
          if (prog) {
            setProgram(prog);
            if (prog.modules[1]) setOpenMod(prog.modules[1].id);
            else if (prog.modules[0]) setOpenMod(prog.modules[0].id);
          }
        });
      });
    }
    loadData();
  }, [enrollmentId]);

  if (accessDenied) {
    return (
      <div className="pwa-screen">
        <PwaAppHeader title="Ruang Belajar" subtitle="Akses ditolak" showBack backHref="/learn" showCart={false} />
        <main className="pwa-wrap pwa-screen-pad-dock">
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12, textAlign: 'center' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>Akses Ditolak</h2>
            <p className="pwa-muted">Anda tidak memiliki hak akses ke program ini.</p>
            <Link href="/learn" className="pwa-cta" style={{ marginTop: 12 }}>← Kembali ke Program Saya</Link>
          </div>
        </main>
        <PwaDock />
      </div>
    );
  }

  if (!enrollment || !program) {
    return (
      <div className="pwa-screen">
        <PwaAppHeader title="Ruang Belajar" subtitle="Memuat modul..." showBack backHref="/learn" showCart={false} />
        <main className="pwa-wrap pwa-screen-pad-dock">
          <div className="pwa-card pwa-card-pad" style={{ marginTop: 12, textAlign: 'center' }}>
            <div className="skeleton-line" style={{ width: '80%' }} />
            <div className="skeleton-line" style={{ width: '60%', marginTop: 8 }} />
          </div>
        </main>
        <PwaDock />
      </div>
    );
  }

  const allLessons = program.modules.flatMap((m) => m.lessons || []);
  const doneCount = allLessons.filter((l) => {
    const lp = enrollment.lessonProgress?.[l.id];
    return (l as { isCompleted?: boolean }).isCompleted ?? lp?.completed;
  }).length;
  const pct = allLessons.length ? Math.round((doneCount / allLessons.length) * 100) : 0;
  const firstOpen = allLessons.find((l) => {
    const lp = enrollment.lessonProgress?.[l.id];
    return !((l as { isCompleted?: boolean }).isCompleted ?? lp?.completed);
  }) ?? allLessons[0];

  return (
    <div className="pwa-screen">
      <PwaAppHeader
        title="Ruang Belajar & Modul"
        subtitle="FULLSTACK AI • COHORT 4"
        showBack
        backHref="/learn"
        showCart={false}
      />

      <main className="pwa-wrap pwa-screen-pad-dock">
        {/* Video player — Pencil spec: dark navy radius 20, 50px blue play */}
        <div style={{ paddingTop: 12 }}>
          <div className="pwa-player" role="img" aria-label="Video sesi aktif" style={{ borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0F172A 0%,#1E2A5A 65%,#0D52FF 140%)' }} />
            <pre
              style={{
                position: 'absolute',
                inset: '34px 12px 44px',
                margin: 0,
                fontFamily: 'monospace',
                fontSize: 10.5,
                lineHeight: 1.6,
                color: '#7DD3FC',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
              }}
            >
              {`import { Pinecone } from '@pinecone-database/pinecone';\nconst index = pinecone.Index('ralivo-rag-embeddings');\nconst vectors = await getEmbeddings(documentChunks);\nawait index.upsert({ records: vectors });`}
            </pre>
            <div className="pwa-player-shade" />
            <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="pwa-pill" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                HD 1080p • SESI AKTIF
              </span>
              <span className="pwa-pill" style={{ background: '#0F172A', color: '#fff', border: '1px solid #334155' }}>CC INDO</span>
              <span className="pwa-pill pwa-pill-live" style={{ marginLeft: 'auto' }}><span className="pwa-dot-live" /> LIVE</span>
            </div>
            <Link
              href={firstOpen ? `/learn/programs/${enrollment.id}/lessons/${firstOpen.id}` : `/learn/programs/${enrollment.id}`}
              aria-label="Putar sesi"
              style={{
                position: 'absolute', inset: 0, margin: 'auto', width: 50, height: 50, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.95)', background: '#0D52FF',
                boxShadow: '0 8px 24px rgba(2,6,23,0.5)',
                color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
              }}
            >
              ▶
            </Link>
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 11, fontWeight: 700 }} className="tabular-nums">
                <span>14:28</span>
                <span>1.25x</span>
                <span>32:50</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.25)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: '45%', height: '100%', background: '#38BDF8' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Session context — Pencil spec: white card radius 18, prev white + next blue */}
        <div className="pwa-card" style={{ marginTop: 10, padding: 14, borderRadius: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: '#94A3B8' }}>MODUL 3 • SESI 2 DARI 6 • Hands-on Lab • 32 Menit</div>
          <h1 style={{ fontSize: 15.5, fontWeight: 800, margin: '6px 0 0', lineHeight: 1.35, color: '#0F172A' }}>
            Membangun Vector Embeddings dengan OpenAI & Pinecone DB
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <span className="pwa-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>F</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>Fikri Ramadhan</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>Lead AI Engineer @ Ralivo • 184 Peserta Aktif</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" style={{ flex: 1, minHeight: 32, borderRadius: 8, border: 0, background: '#EFF6FF', color: '#0D52FF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Slides PDF</button>
            <button type="button" style={{ flex: 1, minHeight: 32, borderRadius: 8, border: 0, background: '#EFF6FF', color: '#0D52FF', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Source Code</button>
          </div>
          {firstOpen && (
            <Link href={`/learn/programs/${enrollment.id}/lessons/${firstOpen.id}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 32, padding: '0 12px', borderRadius: 999, border: 0, background: '#0D52FF', color: '#fff', fontWeight: 800, fontSize: 12.5, textDecoration: 'none' }}>
              ✓ Tandai Selesai
            </Link>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span style={{ flex: 1, minHeight: 44, borderRadius: 14, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>← Prev</span>
            <span style={{ flex: 1, minHeight: 44, borderRadius: 14, border: 0, background: '#0D52FF', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Next →</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="pwa-tabs" role="tablist" aria-label="Konten ruang belajar" style={{ marginTop: 12 }}>
          {([
            { id: 'materi', label: 'Materi' },
            { id: 'diskusi', label: 'Diskusi (18)' },
            { id: 'catatan', label: 'Catatan' },
          ] as Array<{ id: Tab; label: string }>).map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : undefined} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'materi' && (
          <div style={{ marginTop: 10 }}>
            <div className="pwa-card pwa-card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800 }}>
                <span>Progress Silabus Kelas</span>
                <span className="tabular-nums">{pct}% Selesai ({doneCount}/{allLessons.length})</span>
              </div>
              <div style={{ marginTop: 8 }}><PwaProgress pct={pct} /></div>
              <div className="pwa-muted" style={{ marginTop: 6 }}>Estimasi Sisa: 3 Jam 45 Menit • +140 XP Didapatkan</div>
              <button type="button" className="pwa-btn-secondary" style={{ width: '100%', marginTop: 10 }}>
                Unduh Silabus PDF
              </button>
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {program.modules.map((mod, mi) => {
                const lessons = mod.lessons || [];
                const modDone = lessons.filter((l) => {
                  const lp = enrollment.lessonProgress?.[l.id];
                  return (l as { isCompleted?: boolean }).isCompleted ?? lp?.completed;
                }).length;
                const open = openMod === mod.id;
                const locked = mi >= 3;
                return (
                  <div key={mod.id} className="pwa-acc">
                    <button
                      type="button"
                      className="pwa-acc-head"
                      aria-expanded={open}
                      onClick={() => setOpenMod(open ? null : mod.id)}
                      disabled={locked}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>
                          Modul {mi + 1}: {mod.title}
                        </span>
                        <span className="pwa-muted" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                          {locked ? 'Terkunci • Selesaikan modul sebelumnya' : `${modDone} dari ${lessons.length} Selesai`}
                        </span>
                      </span>
                      <span className={mi === 2 ? 'pwa-pill pwa-pill-blue' : 'pwa-pill pwa-pill-green'} style={{ flex: 'none' }}>
                        {locked ? 'TERKUNCI' : mi === 2 ? 'SEDANG BERJALAN' : 'SELESAI'}
                      </span>
                    </button>
                    {open && !locked && (
                      <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {lessons.map((les, li) => {
                          const lp = enrollment.lessonProgress?.[les.id];
                          const done = ((les as { isCompleted?: boolean }).isCompleted ?? lp?.completed) === true;
                          const playing = firstOpen?.id === les.id;
                          return (
                            <Link
                              key={les.id}
                              href={`/learn/programs/${enrollment.id}/lessons/${les.id}`}
                              className="pwa-nested"
                              style={{
                                padding: '10px',
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                textDecoration: 'none',
                                color: 'inherit',
                                borderColor: playing ? '#0D52FF' : undefined,
                                background: playing ? '#EFF6FF' : undefined,
                              }}
                            >
                              <span
                                style={{
                                  width: 24, height: 24, flex: 'none', borderRadius: '50%',
                                  background: done ? 'var(--pwa-success)' : playing ? 'var(--pwa-primary)' : '#CBD5E1',
                                  color: '#fff', fontSize: 12, fontWeight: 800,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                {done ? '✓' : playing ? '▶' : li + 1}
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{les.title}</span>
                                <span className="pwa-muted" style={{ display: 'block', fontSize: 11 }}>
                                  {done ? 'Video Selesai' : playing ? 'Sedang diputar • 14:28 / 32:50 (45%)' : 'Hands-on Lab Berikutnya'}
                                </span>
                              </span>
                              {playing && <span className="pwa-pill pwa-pill-blue">PLAYING</span>}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'diskusi' && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 14 }}>Diskusi di Sesi Ini</strong>
              <span className="pwa-pill pwa-pill-blue">Lihat 18 Diskusi</span>
            </div>
            {QA_THREADS.map((t) => (
              <div key={t.name} className="pwa-card pwa-card-pad" style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="pwa-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>DR</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800 }}>{t.name} • <span style={{ fontWeight: 400, color: 'var(--pwa-subtle)' }}>{t.time}</span></div>
                  </div>
                </div>
                <p style={{ fontSize: 13, margin: '8px 0 0' }}>{t.q}</p>
                <div className="pwa-nested" style={{ marginTop: 8, padding: 10, borderColor: '#A7F3D0', background: '#F0FDF4' }}>
                  <span className="pwa-pill pwa-pill-green">JAWABAN MENTOR • {t.mentor}</span>
                  <p style={{ fontSize: 12.5, margin: '6px 0 0' }}>{t.a}</p>
                </div>
              </div>
            ))}
            <div className="pwa-card" style={{ marginTop: 8, padding: 10, display: 'flex', gap: 8 }}>
              <input
                className="pwa-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Tulis pertanyaan ke mentor atau cohort..."
                aria-label="Tulis pertanyaan"
              />
              <button type="button" className="pwa-cta" style={{ width: 'auto', flex: 'none', padding: '0 16px' }} onClick={() => setQuestion('')}>
                Kirim
              </button>
            </div>
          </div>
        )}

        {tab === 'catatan' && (
          <div style={{ marginTop: 10 }}>
            <div className="pwa-card pwa-card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 14 }}>Catatan Pribadi</strong>
                <span className="pwa-pill pwa-pill-blue">+ Timestamp (14:28)</span>
              </div>
              <textarea
                className="pwa-input"
                rows={4}
                value={note}
                onChange={(e) => { setNote(e.target.value); setNoteSaved(false); }}
                placeholder="Tulis insight penting dari sesi ini..."
                aria-label="Catatan pribadi"
                style={{ padding: '10px 12px', marginTop: 10, resize: 'vertical' }}
              />
              <button
                type="button"
                className="pwa-btn-secondary"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => {
                  try {
                    window.localStorage.setItem(`ralivo-note-${enrollmentId}`, note);
                    setNoteSaved(true);
                  } catch { /* abaikan */ }
                }}
              >
                {noteSaved ? 'Tersimpan ✓' : 'Simpan Catatan'}
              </button>
            </div>
            <div className="pwa-card" style={{ marginTop: 8, padding: 10 }}>
              <div className="pwa-muted" style={{ fontSize: 11, fontWeight: 800 }}>⏱ 12:45 • Formula Chunk Size Overlap</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Chunk 512 token + overlap 64 menjaga konteks RAG tetap stabil.</div>
            </div>
          </div>
        )}
      </main>

      <PwaDock />
    </div>
  );
}
