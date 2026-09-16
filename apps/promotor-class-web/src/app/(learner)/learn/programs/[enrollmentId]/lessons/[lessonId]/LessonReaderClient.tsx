'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { ErrorState, LoadingRows } from '@/components/ui';
import { getActiveLearnerContactId } from '@/lib/session';
import { getEnrollmentByIdQuery } from '@/modules/enrollments/queries';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getEnrollmentFullDetailsQuery } from '@/modules/learning/queries';
import { completeLessonCommand, submitReflectionCommand, submitLessonPositionCommand } from '@/modules/learning/commands';
import { recordCtaClickCommand } from '@/modules/ctas/commands';
import { extractYoutubeId, getYoutubeEmbedUrl } from '@/lib/video/parse-youtube-url';
import { YoutubeLessonPlayer } from '@/components/learner/YoutubeLessonPlayer';
import {
  buildReflectionDraftKey,
  saveReflectionDraft,
  loadReflectionDraft,
  clearReflectionDraft,
} from '@/lib/reflection-draft';
import { getLessonNoteQuery, saveLessonNoteCommand } from '@/modules/learning/notes';
import { Enrollment, Program, Lesson } from '@promotor/contracts';

export function LessonReaderClient() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;
  const lessonId = params.lessonId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [lesson, setLesson] = useState<(Lesson & { isCompleted?: boolean; lastPositionSeconds?: number }) | null>(null);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [showVideoDonePrompt, setShowVideoDonePrompt] = useState(false);

  // Catatan pribadi state & autosave
  const [noteBody, setNoteBody] = useState('');
  const [savedNoteBody, setSavedNoteBody] = useState('');
  const [noteStatus, setNoteStatus] = useState('');
  const [tab, setTab] = useState<'materi' | 'diskusi' | 'catatan'>('materi');

  useEffect(() => {
    getLessonNoteQuery(enrollmentId, lessonId)
      .then((note) => {
        if (note) {
          setNoteBody(note.body);
          setSavedNoteBody(note.body);
        }
      })
      .catch(() => {});
  }, [enrollmentId, lessonId]);

  useEffect(() => {
    if (noteBody === savedNoteBody || noteBody.trim().length === 0) return;
    setNoteStatus('Menyimpan...');
    const t = setTimeout(() => {
      saveLessonNoteCommand(enrollmentId, lessonId, noteBody)
        .then(() => {
          setSavedNoteBody(noteBody);
          setNoteStatus('Tersimpan ✓');
        })
        .catch(() => setNoteStatus('Gagal menyimpan — coba lagi.'));
    }, 1500);
    return () => clearTimeout(t);
  }, [noteBody, savedNoteBody, enrollmentId, lessonId]);

  // Restore draft sekali per lesson
  const draftKey = enrollment && lesson ? buildReflectionDraftKey(enrollmentId, lessonId) : null;
  useEffect(() => {
    if (!draftKey || lesson?.hasReflection === false) return;
    const saved = loadReflectionDraft(draftKey);
    if (saved && saved.length > 0) {
      setReflectionAnswer((current) => (current.length === 0 ? saved : current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Debounced autosave 500ms
  useEffect(() => {
    if (!draftKey || lesson?.hasReflection === false) return;
    const t = setTimeout(() => saveReflectionDraft(draftKey, reflectionAnswer), 500);
    return () => clearTimeout(t);
  }, [draftKey, reflectionAnswer, lesson]);

  useEffect(() =>{
    async function loadData() {
      try {
        const details = await getEnrollmentFullDetailsQuery(enrollmentId);
        if (details?.enrollment && details?.program) {
          const enr: any = details.enrollment;
          const prog: any = details.program;

          const activeContactId = getActiveLearnerContactId();
          if (activeContactId && enr.contactId && enr.contactId !== activeContactId) {
            setAccessDenied(true);
            return;
          }

          setEnrollment({
            ...enr,
            lessonProgress: (prog.modules || []).reduce((acc: any, m: any) =>{
              for (const l of m.lessons || []) {
                acc[l.id] = {
                  completed: l.isCompleted,
                  completedAt: l.completedAt || '',
                  reflectionAnswer: l.reflection?.responseText || undefined,
                };
              }
              return acc;
            }, {}),
          } as any);

          setProgram({
            ...prog,
            modules: (prog.modules || []).map((m: any) =>({
              ...m,
              lessons: (m.lessons || []).map((l: any) =>({
                ...l,
                videoYoutubeUrl: l.videoUrl || l.videoYoutubeUrl,
                hasReflection: !!l.reflectionType,
                hasCta: !!l.ctaType,
              })),
            })),
          } as any);

          for (const m of prog.modules || []) {
            for (const l of m.lessons || []) {
              if (l.id === lessonId) {
                setLesson({
                  ...l,
                  videoYoutubeUrl: l.videoUrl || l.videoYoutubeUrl,
                  videoExternalId: l.videoExternalId || extractYoutubeId(l.videoUrl || l.videoYoutubeUrl || undefined) || undefined,
                  lastPositionSeconds: l.lastPositionSeconds ?? 0,
                  isCompleted: l.isCompleted === true,
                  hasReflection: !!l.reflectionType || !!l.reflectionPrompt || !!l.hasReflection,
                  reflectionPrompt: l.reflectionPrompt || undefined,
                  hasCta: !!l.ctaType || !!l.ctaLabel,
                  ctaLabel: l.ctaLabel || 'Konsultasi via WhatsApp',
                  ctaUrl: l.ctaUrl || (l.ctaConfig as any)?.url || 'https://wa.me/6281234567890',
                  textContent: l.textContent || undefined,
                });
                if (l.reflection?.responseText) {
                  setReflectionAnswer(l.reflection.responseText);
                }
              }
            }
          }
          return;
        }
      } catch (err) {
        console.warn('[LessonReaderClient] getEnrollmentFullDetailsQuery fallback:', err);
      }

      getEnrollmentByIdQuery(enrollmentId).then(enr =>{
        if (!enr) return;
        const activeContactId = getActiveLearnerContactId();
        if (activeContactId && enr.contactId !== activeContactId) {
          setAccessDenied(true);
          return;
        }
        setEnrollment(enr);
        getProgramByIdQuery(enr.programId).then(prog =>{
          if (!prog) return;
          setProgram(prog);

          for (const mod of prog.modules) {
            for (const les of mod.lessons) {
              if (les.id === lessonId) {
                const prevProgress = enr.lessonProgress?.[lessonId];
                setLesson({
                  ...les,
                  videoExternalId: les.videoExternalId || extractYoutubeId(les.videoYoutubeUrl ?? undefined) || undefined,
                  lastPositionSeconds: (prevProgress as any)?.lastPositionSeconds ?? 0,
                  isCompleted: prevProgress?.completed ?? false,
                });
                if (prevProgress?.reflectionAnswer) {
                  setReflectionAnswer(prevProgress.reflectionAnswer);
                }
              }
            }
          }
        });
      });
    }

    loadData();
  }, [enrollmentId, lessonId]);

  if (accessDenied) {
    return (
      <LearnerShell>
       <ErrorState title="Akses ditolak" detail="Anda tidak memiliki hak akses ke pelajaran ini." />
       <div style={{ padding: 18 }}>
         <Link href="/masuk" className="btn btn-accent btn-block">Masuk dengan Nomor WhatsApp</Link>
         <p className="kicker kicker-muted" style={{ marginTop: 8 }}>Ganti perangkat? Masuk lagi dengan nomor WhatsApp Anda.</p>
         <Link href="/learn" className="btn btn-secondary btn-sm">← Kembali ke Program Saya</Link>
       </div>
     </LearnerShell>
   );
  }

  if (!enrollment || !program || !lesson) {
    return (
      <LearnerShell>
       <LoadingRows rows={4} />
     </LearnerShell>
   );
  }

  const isReflectionRequired = true;
  const isButtonDisabled = isReflectionRequired && !reflectionAnswer.trim();

  const handleComplete = async () =>{
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let res: any;
      if (reflectionAnswer.trim()) {
        res = await submitReflectionCommand(enrollmentId, lessonId, { responseText: reflectionAnswer });
      } else {
        res = await completeLessonCommand(enrollmentId, lessonId);
      }

      const allLessons = (program?.modules || []).flatMap((m: any) =>m.lessons || []);
      const currentIndex = allLessons.findIndex((l: any) =>l.id === lessonId);
      const isLastLesson = currentIndex >= 0 && currentIndex === allLessons.length - 1;
      const completedCount = allLessons.filter((l: any) =>l.isCompleted || l.id === lessonId).length;
      const isAllDone = allLessons.length >0 && completedCount >= allLessons.length;

      const isCompleted =
        res?.learningStatus === 'COMPLETED' ||
        res?.progressPercent === 100 ||
        res?.isComplete ||
        (res as any)?.enrollment?.learningStatus === 'COMPLETED' ||
        (res as any)?.enrollment?.progressPercent === 100 ||
        isAllDone ||
        isLastLesson;

      const targetUrl = isCompleted
        ? `/learn/programs/${enrollmentId}/completed`
        : `/learn/programs/${enrollmentId}`;

      if (draftKey) clearReflectionDraft(draftKey);

      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      } else {
        router.push(targetUrl);
      }
    } catch (err: unknown) {
      console.error('[LessonReaderClient] handleComplete failed:', err);
      setErrorMsg((err as Error).message || 'Gagal menyelesaikan pelajaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCtaClick = async (ctaUrl: string) =>{
    await recordCtaClickCommand(enrollmentId, lessonId, ctaUrl);
  };

  const savedPosition = lesson?.lastPositionSeconds ?? 0;
  const videoId = lesson.videoExternalId || extractYoutubeId(lesson.videoYoutubeUrl ?? undefined) || '';

  let moduleLabel = '';
  for (const mod of program.modules) {
    if ((mod.lessons || []).some((l: any) =>l.id === lessonId)) {
      moduleLabel = mod.title;
      break;
    }
  }

  return (
    <LearnerShell title={lesson.title} subtitle={moduleLabel || 'Ruang Belajar & Modul'} showBack backHref={`/learn/programs/${enrollmentId}`}>
      <div style={{ paddingTop: 12 }}>
        {/* Session context header */}
        <div className="pwa-card pwa-card-pad">
          <div className="pwa-muted" style={{ fontSize: 11, fontWeight: 800 }}>MODUL AKTIF • {moduleLabel || 'Silabus Kelas'}</div>
          <h1 style={{ fontSize: 17, fontWeight: 850, margin: '6px 0 0', lineHeight: 1.3 }}>{lesson.title}</h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <span className="pwa-pill pwa-pill-blue">Hands-on Lab</span>
            <span className="pwa-pill pwa-pill-cyan">CC INDO</span>
            {lesson.isCompleted && <span className="pwa-pill pwa-pill-green">Selesai ✓</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="pwa-btn-secondary" style={{ flex: 1 }}>Slides PDF</button>
            <button type="button" className="pwa-btn-secondary" style={{ flex: 1 }}>Source Code</button>
          </div>
        </div>

        {videoId && (
          <div style={{ marginTop: 10 }}>
            <div className="pwa-player" style={{ borderRadius: 16 }}>
              <YoutubeLessonPlayer
                videoId={lesson.videoExternalId ?? videoId}
                startSeconds={savedPosition}
                isCompleted={lesson.isCompleted === true}
                onEnded={() => setShowVideoDonePrompt(true)}
                onPositionChange={(seconds) => {
                  submitLessonPositionCommand(enrollmentId, lessonId, seconds).catch(() => {});
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="pwa-pill pwa-pill-dark">1.25x Playback</span>
              <span className="pwa-pill pwa-pill-live"><span className="pwa-dot-live" /> LIVE/RECORD</span>
              <Link href={`/learn/programs/${enrollmentId}`} className="pwa-btn-secondary" style={{ marginLeft: 'auto' }}>
                ← Kurikulum
              </Link>
            </div>
            {showVideoDonePrompt && (
              <div className="pwa-card pwa-card-pad" style={{ marginTop: 8, borderColor: '#A7F3D0', background: '#F0FDF4' }}>
                <strong style={{ fontSize: 13.5 }}>Video selesai.</strong>
                <p className="pwa-muted" style={{ marginTop: 4 }}>Lanjutkan ke refleksi di bawah untuk mengunci modul ini.</p>
                <button
                  type="button"
                  className="pwa-btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={() => document.getElementById('refleksi-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Isi Refleksi
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab switcher */}
        <div className="pwa-tabs" role="tablist" aria-label="Konten sesi" style={{ marginTop: 12 }}>
          {([
            { id: 'materi', label: 'Materi Silabus' },
            { id: 'diskusi', label: 'Diskusi Tanya Jawab' },
            { id: 'catatan', label: 'Catatan Pribadi' },
          ] as Array<{ id: 'materi' | 'diskusi' | 'catatan'; label: string }>).map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : undefined} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'materi' && (
          <article style={{ marginTop: 10 }}>
            {lesson.textContent && (
              <div className="pwa-card pwa-card-pad">
                <p style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{lesson.textContent}</p>
              </div>
            )}

            {/* Interactive syllabus checklist */}
            <div style={{ marginTop: 10 }}>
              <strong style={{ fontSize: 13.5 }}>Checklist Silabus Modul</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {program.modules.flatMap((m) => m.lessons || []).slice(0, 6).map((l) => {
                  const lp = enrollment.lessonProgress?.[l.id];
                  const done = (l as { isCompleted?: boolean }).isCompleted ?? lp?.completed;
                  const playing = l.id === lessonId;
                  return (
                    <Link
                      key={l.id}
                      href={`/learn/programs/${enrollmentId}/lessons/${l.id}`}
                      className="pwa-nested"
                      style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
                    >
                      <span style={{
                        width: 24, height: 24, flex: 'none', borderRadius: '50%',
                        background: done ? 'var(--pwa-success)' : playing ? 'var(--pwa-primary)' : '#CBD5E1',
                        color: '#fff', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {done ? '✓' : playing ? '▶' : '•'}
                      </span>
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>{l.title}</span>
                      {playing && <span className="pwa-pill pwa-pill-blue">DIPUTAR</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            {lesson.attachments && lesson.attachments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {lesson.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    download
                    className="pwa-card"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 8, textDecoration: 'none', color: 'inherit' }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{att.name}</span>
                    <span style={{ color: 'var(--pwa-primary)', fontSize: 11.5, fontWeight: 800 }} className="tabular-nums">
                      {att.sizeFormatted || 'Unduh'}
                    </span>
                  </a>
                ))}
              </div>
            )}

            <section id="refleksi-section" className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
              <div className="pwa-kicker">Refleksi Wajib *</div>
              <p style={{ marginTop: 8, fontSize: 13.5, fontWeight: 700 }}>
                {lesson.reflectionPrompt || 'Tuliskan pemikiran dan hasil pengamatan Anda:'}
              </p>
              <textarea
                rows={4}
                value={reflectionAnswer}
                onChange={(e) => setReflectionAnswer(e.target.value)}
                placeholder="Tuliskan refleksi Anda di sini..."
                aria-label="Jawaban refleksi"
                className="pwa-input"
                style={{ marginTop: 10, padding: '10px 12px', resize: 'vertical' }}
              />
              {isButtonDisabled && (
                <div className="pwa-muted" style={{ fontSize: 11, marginTop: 6 }}>
                  * Anda wajib mengisi refleksi di atas untuk membuka tombol Selesai.
                </div>
              )}
            </section>
          </article>
        )}

        {tab === 'diskusi' && (
          <div style={{ marginTop: 10 }}>
            <div className="pwa-card pwa-card-pad">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="pwa-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>DR</span>
                <div style={{ fontSize: 12.5, fontWeight: 800 }}>Daffa Raihan • <span style={{ fontWeight: 400, color: 'var(--pwa-subtle)' }}>25m lalu</span></div>
              </div>
              <p style={{ fontSize: 13, margin: '8px 0 0' }}>Bagaimana cara memilih chunk size yang tepat untuk materi ini?</p>
              <div className="pwa-nested" style={{ marginTop: 8, padding: 10, background: '#F0FDF4', borderColor: '#A7F3D0' }}>
                <span className="pwa-pill pwa-pill-green">JAWABAN MENTOR</span>
                <p style={{ fontSize: 12.5, margin: '6px 0 0' }}>Mulai dari 512 token + overlap 64, lalu ukur skor retrieval sebelum menaikkan ukuran.</p>
              </div>
            </div>
            <div className="pwa-card" style={{ marginTop: 8, padding: 10, display: 'flex', gap: 8 }}>
              <input className="pwa-input" placeholder="Tulis pertanyaan ke mentor..." aria-label="Tulis pertanyaan" />
              <button type="button" className="pwa-cta" style={{ width: 'auto', flex: 'none', padding: '0 16px' }}>Kirim</button>
            </div>
          </div>
        )}

        {tab === 'catatan' && (
          <section className="pwa-card pwa-card-pad" style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div className="pwa-kicker">Catatan Sinkron</div>
              <span className="pwa-pill pwa-pill-blue">+ Timestamp ({Math.floor(savedPosition / 60)}:{String(savedPosition % 60).padStart(2, '0')})</span>
            </div>
            <p className="pwa-muted" style={{ fontSize: 11, marginTop: 4 }}>Hanya Anda yang bisa melihat catatan ini. Otomatis bertag timestamp video saat ini.</p>
            <textarea
              className="pwa-input"
              rows={4}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Ringkasan insight penting dari materi ini..."
              aria-label="Catatan pribadi"
              style={{ marginTop: 10, padding: '10px 12px', resize: 'vertical' }}
            />
            {noteStatus && <div className="pwa-muted" style={{ fontSize: 11, marginTop: 6 }}>{noteStatus}</div>}
          </section>
        )}

        {(lesson.hasCta || lesson.ctaLabel) && (lesson.ctaUrl || (lesson.ctaConfig as unknown as { url?: string })?.url || lesson.ctaLabel) && (
          <div style={{ marginTop: 12 }}>
            <a
              href={lesson.ctaUrl || (lesson.ctaConfig as unknown as { url?: string })?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                handleCtaClick(lesson.ctaUrl || (lesson.ctaConfig as unknown as { url?: string })?.url || '#');
              }}
              className="pwa-cta"
            >
              {lesson.ctaLabel || 'Konsultasi via WhatsApp'}
            </a>
          </div>
        )}

        {errorMsg && (
          <div className="pwa-card" role="alert" style={{ marginTop: 10, padding: '10px 12px', borderColor: '#FECACA', background: '#FEF2F2', color: '#9B1C1C', fontSize: 13 }}>{errorMsg}</div>
        )}

        {lesson?.hasReflection !== false && (
          <p className="pwa-muted" style={{ fontSize: 11, marginTop: 8 }}>Draf tersimpan otomatis di perangkat ini.</p>
        )}

        <button onClick={handleComplete} disabled={isButtonDisabled || isSubmitting} className="pwa-cta" style={{ marginTop: 10 }}>
          {isSubmitting ? 'Menyimpan...' : 'Tandai Selesai & Lanjut'}
        </button>
        <div style={{ height: 12 }} />
      </div>
    </LearnerShell>
  );
}
