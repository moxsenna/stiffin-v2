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
    <LearnerShell title={lesson.title}>
     <div style={{ borderBottom: 'var(--sep-strong)', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
       <div className="kicker kicker-muted">{moduleLabel}</div>
       <Link href={`/learn/programs/${enrollmentId}`} className="btn btn-ghost btn-sm" style={{ padding: 0 }}>
         ← Kurikulum
        </Link>
     </div>

     <article style={{ maxWidth: 700, margin: '0 auto', padding: '18px' }}>
       <h1 style={{ font: '800 21px/1.2 var(--font-sans)', letterSpacing: '-0.02em' }}>{lesson.title}</h1>

       {videoId && (
         <div style={{ marginTop: 14 }}>
           <YoutubeLessonPlayer
             videoId={lesson.videoExternalId ?? videoId}
             startSeconds={savedPosition}
             isCompleted={lesson.isCompleted === true}
             onEnded={() => setShowVideoDonePrompt(true)}
             onPositionChange={(seconds) => {
               submitLessonPositionCommand(enrollmentId, lessonId, seconds).catch(() => {});
             }}
           />
           {showVideoDonePrompt && (
             <div style={{ marginTop: 12, padding: 14, border: '1px solid var(--accent)', background: 'var(--accent-soft, #eff6ff)' }}>
               <strong style={{ font: '700 14px/1.4 var(--font-sans)' }}>Video selesai.</strong>
               <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted-strong)' }}>
                 Lanjutkan ke refleksi di bawah untuk mengunci modul ini.
               </p>
               <button
                 type="button"
                 className="btn btn-primary btn-sm"
                 onClick={() => document.getElementById('refleksi-section')?.scrollIntoView({ behavior: 'smooth' })}
               >
                 Isi Refleksi
               </button>
             </div>
           )}
         </div>
       )}

        {lesson.textContent && (
          <p className="body-copy" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>
           {lesson.textContent}
          </p>
       )}

        {lesson.attachments && lesson.attachments.length >0 && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
           {lesson.attachments.map(att =>(
              <a
                key={att.id}
                href={att.url}
                download
                className="list-row"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  border: '2px solid var(--ink)',
                  marginBottom: 8,
                  paddingLeft: 14,
                  paddingRight: 14,
                }}
              >
               <span style={{ font: '600 12px/1.3 var(--font-sans)' }}>{att.name}</span>
               <span style={{ color: 'var(--accent-dark)', font: '700 11px/1 var(--font-sans)' }} className="tabular-nums">
                 {att.sizeFormatted || 'Unduh'}
                </span>
             </a>
           ))}
          </div>
       )}

        <section id="refleksi-section" style={{ marginTop: 22, border: 'var(--sep-strong)', padding: 16, background: 'var(--surface-muted)' }}>
         <h3 className="kicker kicker-accent" style={{ fontSize: 10 }}>Refleksi Wajib *</h3>
         <p style={{ marginTop: 10, font: '600 14px/1.45 var(--font-sans)' }}>
           {lesson.reflectionPrompt || 'Tuliskan pemikiran dan hasil pengamatan Anda:'}
          </p>

         <textarea
            rows={4}
            value={reflectionAnswer}
            onChange={e =>setReflectionAnswer(e.target.value)}
            placeholder="Tuliskan refleksi Anda di sini..."
            aria-label="Jawaban refleksi"
            className="textarea"
            style={{ marginTop: 12 }}
          />
         {isButtonDisabled && (
            <div style={{ fontSize: 11, color: 'var(--muted-strong)', marginTop: 8 }}>
             * Anda wajib mengisi refleksi di atas untuk membuka tombol Selesai.
            </div>
         )}
        </section>

       {(lesson.hasCta || lesson.ctaLabel) && (lesson.ctaUrl || (lesson.ctaConfig as any)?.url || lesson.ctaLabel) && (
          <div style={{ marginTop: 18 }}>
           <a
              href={lesson.ctaUrl || (lesson.ctaConfig as any)?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) =>{
                e.preventDefault();
                handleCtaClick(lesson.ctaUrl || (lesson.ctaConfig as any)?.url || '#');
              }}
              className="btn btn-accent btn-block"
            >
             {lesson.ctaLabel || 'Konsultasi via WhatsApp'}
            </a>
         </div>
       )}

        {errorMsg && (
          <div className="field-error" role="alert" style={{ marginTop: 12 }}>{errorMsg}</div>
       )}

        {lesson?.hasReflection !== false && (
          <p style={{ font: '400 11px/1.4 var(--font-sans)', color: 'var(--muted-strong)' }}>
            Draf tersimpan otomatis di perangkat ini.
          </p>
        )}

        <button
          onClick={handleComplete}
          disabled={isButtonDisabled || isSubmitting}
          className="btn btn-primary btn-block"
          style={{ marginTop: 18 }}
        >
         {isSubmitting ? 'Menyimpan...' : 'Tandai Selesai & Lanjut'}
        </button>
       <div style={{ height: 24 }} />
     </article>
   </LearnerShell>
 );
}
