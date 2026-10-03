'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getActiveLearnerContactId } from '@/lib/session';
import { getEnrollmentByIdQuery } from '@/modules/enrollments/queries';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getEnrollmentFullDetailsQuery } from '@/modules/learning/queries';
import { completeLessonCommand } from '@/modules/learning/commands';
import { getLessonNoteQuery, saveLessonNoteCommand } from '@/modules/learning/notes';
import { listLessonDiscussionsQuery, postLessonDiscussionCommand } from '@/modules/learning/discussions';
import { PwaAppHeader, PwaDock, PwaProgress } from '@/components/pwa/pwa';
import { Enrollment, Program } from '@promotor/contracts';

type Tab = 'materi' | 'diskusi' | 'catatan';

export function LearnerProgramClient() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [tab, setTab] = useState<Tab>('materi');
  const [openMod, setOpenMod] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [questionSent, setQuestionSent] = useState(false);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [sendingDiscussion, setSendingDiscussion] = useState(false);
  const [note, setNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

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

  const targetLessonId = program?.modules?.[0]?.lessons?.[0]?.id || 'overview';

  React.useEffect(() => {
    if (tab === 'diskusi' && enrollmentId && targetLessonId) {
      setLoadingDiscussions(true);
      listLessonDiscussionsQuery(enrollmentId, targetLessonId)
        .then((items) => setDiscussions(items))
        .catch(() => setDiscussions([]))
        .finally(() => setLoadingDiscussions(false));
    }
  }, [tab, enrollmentId, targetLessonId]);

  const handleSendDiscussion = async () => {
    if (!question.trim() || sendingDiscussion) return;
    try {
      setSendingDiscussion(true);
      const created = await postLessonDiscussionCommand(enrollmentId, targetLessonId, question.trim());
      setDiscussions((prev) => [...prev, created]);
      setQuestion('');
      setQuestionSent(true);
    } catch {
      setQuestionSent(true);
    } finally {
      setSendingDiscussion(false);
    }
  };

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
  const firstOpenLessonId = firstOpen?.id ?? null;

  return (
    <div className="pwa-screen">
      <PwaAppHeader
        title="Ruang Belajar & Modul"
        subtitle={program.title}
        showBack
        backHref="/learn"
        showCart={false}
      />

      <main className="pwa-wrap pwa-screen-pad-dock">
        {/* Video preview card — data nyata dari modul dan sesi aktif */}
        <div style={{ paddingTop: 12 }}>
          <div className="pwa-player" role="img" aria-label="Sesi belajar aktif" style={{ borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#0F172A 0%,#1E2A5A 65%,#0D52FF 140%)' }} />
            <div
              style={{
                position: 'absolute',
                inset: '34px 16px 44px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: '#F8FAFC',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38BDF8', letterSpacing: '0.06em' }}>
                {program.title}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, maxWidth: 320, lineHeight: 1.3 }}>
                {firstOpen?.title || 'Materi Pembelajaran'}
              </div>
            </div>
            <div className="pwa-player-shade" />
            <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="pwa-pill" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                SESI AKTIF
              </span>
              <span className="pwa-pill pwa-pill-cyan" style={{ marginLeft: 'auto' }}>
                {doneCount} / {allLessons.length} SELESAI
              </span>
            </div>
            <Link
              href={firstOpen ? `/learn/programs/${enrollment.id}/lessons/${firstOpen.id}` : `/learn/programs/${enrollment.id}`}
              aria-label="Buka materi pelajaran"
              style={{
                position: 'absolute', inset: 0, margin: 'auto', width: 52, height: 52, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.95)', background: '#0D52FF',
                boxShadow: '0 8px 24px rgba(2,6,23,0.5)',
                color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
              }}
            >
              ▶
            </Link>
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 11, fontWeight: 700 }} className="tabular-nums">
                <span>Progres: {pct}%</span>
                <span>{allLessons.length - doneCount} materi tersisa</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.25)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#38BDF8', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Session context — Pencil spec: white card radius 18, prev white + next blue */}
        <div className="pwa-card" style={{ marginTop: 10, padding: 14, borderRadius: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: '#94A3B8' }}>
            {allLessons.length > 0 ? `SESI BERIKUTNYA • ${doneCount} DARI ${allLessons.length} SELESAI` : 'BELUM ADA MATERI'}
          </div>
          <h1 style={{ fontSize: 15.5, fontWeight: 800, margin: '6px 0 0', lineHeight: 1.35, color: '#0F172A' }}>
            {firstOpen?.title || program.title}
          </h1>
          {firstOpen && (
            <>
              <button
                type="button"
                disabled={completing}
                onClick={async () => {
                  setCompleteError(null);
                  setCompleting(true);
                  try {
                    const res = await completeLessonCommand(enrollmentId, firstOpen.id);
                    setEnrollment((prev) =>
                      prev
                        ? {
                            ...prev,
                            progressPercent: res.progressPercent,
                            lessonProgress: {
                              ...(prev.lessonProgress || {}),
                              [firstOpen.id]: { completed: true, completedAt: new Date().toISOString() },
                            },
                          }
                        : prev
                    );
                  } catch (err) {
                    setCompleteError(err instanceof Error ? err.message : 'Gagal menandai materi selesai');
                  } finally {
                    setCompleting(false);
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 32, padding: '0 12px', borderRadius: 999, border: 0, background: '#0D52FF', color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', opacity: completing ? 0.7 : 1 }}
              >
                {completing ? 'Menyimpan...' : '✓ Tandai Selesai'}
              </button>
              {completeError && (
                <div style={{ color: 'var(--pwa-danger)', fontSize: 12, marginTop: 8, fontWeight: 700 }}>{completeError}</div>
              )}
            </>
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
            { id: 'diskusi', label: 'Diskusi' },
            { id: 'catatan', label: 'Catatan' },
          ] as Array<{ id: Tab; label: string }>).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'is-active' : undefined}
              onClick={() => {
                setTab(t.id);
                if (t.id === 'catatan' && firstOpenLessonId) {
                  setNoteLoading(true);
                  getLessonNoteQuery(enrollmentId, firstOpenLessonId)
                    .then((saved) => {
                      if (saved?.body) {
                        setNote(saved.body);
                        setNoteSaved(true);
                      } else {
                        try {
                          const local = window.localStorage.getItem(`ralivo-note-${enrollmentId}-${firstOpenLessonId}`);
                          if (local) {
                            setNote(local);
                            setNoteSaved(true);
                          }
                        } catch { /* abaikan */ }
                      }
                    })
                    .catch(() => {})
                    .finally(() => setNoteLoading(false));
                }
              }}
            >
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
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {program.modules.map((mod, mi) => {
                const lessons = mod.lessons || [];
                const modDone = lessons.filter((l) => {
                  const lp = enrollment.lessonProgress?.[l.id];
                  return (l as { isCompleted?: boolean }).isCompleted ?? lp?.completed;
                }).length;
                const open = openMod === mod.id;
                const prevMods = program.modules.slice(0, mi);
                const prevIncomplete = prevMods.some((pm) =>
                  (pm.lessons || []).some((pl) => {
                    const lp = enrollment.lessonProgress?.[pl.id];
                    return !(((pl as { isCompleted?: boolean }).isCompleted ?? lp?.completed) === true);
                  })
                );
                const locked = mi > 0 && prevIncomplete && modDone === 0;
                const inProgress = modDone > 0 && modDone < lessons.length;
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
                      <span className={inProgress ? 'pwa-pill pwa-pill-blue' : modDone === lessons.length && lessons.length > 0 ? 'pwa-pill pwa-pill-green' : 'pwa-pill'} style={{ flex: 'none' }}>
                        {locked ? 'TERKUNCI' : inProgress ? 'SEDANG BERJALAN' : modDone === lessons.length && lessons.length > 0 ? 'SELESAI' : 'BELUM MULAI'}
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
                                  {done ? 'Selesai' : playing ? 'Lanjut dari sini' : 'Belum dipelajari'}
                                </span>
                              </span>
                              {playing && <span className="pwa-pill pwa-pill-blue">LANJUTKAN</span>}
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
              {loadingDiscussions && <span className="pwa-muted" style={{ fontSize: 12 }}>Memuat...</span>}
            </div>

            {discussions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {discussions.map((d: any) => (
                  <div key={d.id} className="pwa-card pwa-card-pad" style={{ background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pwa-navy)' }}>{d.authorName}</span>
                      <span className="pwa-muted" style={{ fontSize: 11 }}>
                        {new Date(d.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, margin: 0, color: 'var(--pwa-navy)', lineHeight: 1.45 }}>{d.message}</p>
                  </div>
                ))}
              </div>
            )}

            {questionSent && (
              <div className="pwa-card pwa-card-pad" style={{ marginTop: 8, borderColor: '#A7F3D0', background: '#F0FDF4' }}>
                <strong style={{ fontSize: 13, color: 'var(--pwa-success)' }}>Pertanyaan terkirim ✓</strong>
                <p className="pwa-muted" style={{ fontSize: 12.5, margin: '6px 0 0' }}>
                  Mentor akan menjawab melalui WhatsApp atau sesi live berikutnya.
                </p>
              </div>
            )}

            {discussions.length === 0 && !questionSent && !loadingDiscussions && (
              <div className="pwa-card pwa-card-pad pwa-muted" style={{ marginTop: 8, textAlign: 'center' }}>
                Belum ada diskusi di sesi ini. Jadilah yang pertama bertanya ke mentor.
              </div>
            )}

            <div className="pwa-card" style={{ marginTop: 8, padding: 10, display: 'flex', gap: 8 }}>
              <input
                className="pwa-input"
                value={question}
                onChange={(e) => { setQuestion(e.target.value); setQuestionSent(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendDiscussion(); }}
                placeholder="Tulis pertanyaan ke mentor atau cohort..."
                aria-label="Tulis pertanyaan"
                disabled={sendingDiscussion}
              />
              <button
                type="button"
                className="pwa-cta"
                style={{ width: 'auto', flex: 'none', padding: '0 16px' }}
                onClick={handleSendDiscussion}
                disabled={sendingDiscussion || !question.trim()}
              >
                {sendingDiscussion ? '...' : 'Kirim'}
              </button>
            </div>
          </div>
        )}

        {tab === 'catatan' && (
          <div style={{ marginTop: 10 }}>
            <div className="pwa-card pwa-card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ fontSize: 14 }}>Catatan Pribadi</strong>
                {firstOpen && (
                  <span className="pwa-pill pwa-pill-blue">Untuk: {firstOpen.title.slice(0, 24)}{firstOpen.title.length > 24 ? '…' : ''}</span>
                )}
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
              {noteError && (
                <div style={{ color: 'var(--pwa-danger)', fontSize: 12, marginTop: 6, fontWeight: 700 }}>{noteError}</div>
              )}
              <button
                type="button"
                className="pwa-btn-secondary"
                style={{ width: '100%', marginTop: 8 }}
                disabled={noteLoading || !firstOpen || !note.trim()}
                onClick={async () => {
                  if (!firstOpen || !note.trim()) return;
                  setNoteError(null);
                  setNoteLoading(true);
                  try {
                    const saved = await saveLessonNoteCommand(enrollmentId, firstOpen.id, note.trim());
                    setNote(saved.body);
                    setNoteSaved(true);
                  } catch (err) {
                    try {
                      window.localStorage.setItem(`ralivo-note-${enrollmentId}-${firstOpen.id}`, note);
                      setNoteSaved(true);
                    } catch {
                      setNoteError(err instanceof Error ? err.message : 'Gagal menyimpan catatan');
                    }
                  } finally {
                    setNoteLoading(false);
                  }
                }}
              >
                {noteLoading ? 'Menyimpan...' : noteSaved ? 'Tersimpan ✓' : 'Simpan Catatan'}
              </button>
            </div>
          </div>
        )}
      </main>

      <PwaDock />
    </div>
  );
}
