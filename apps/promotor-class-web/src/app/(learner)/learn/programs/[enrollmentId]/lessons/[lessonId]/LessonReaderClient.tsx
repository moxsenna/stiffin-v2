'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { getActiveLearnerContactId } from '@/lib/session';
import { getEnrollmentByIdQuery } from '@/modules/enrollments/queries';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getEnrollmentFullDetailsQuery } from '@/modules/learning/queries';
import { completeLessonCommand, submitReflectionCommand } from '@/modules/learning/commands';
import { recordCtaClickCommand } from '@/modules/ctas/commands';
import { getYoutubeEmbedUrl } from '@/lib/video/parse-youtube-url';
import { Enrollment, Program, Lesson } from '@promotor/contracts';

export function LessonReaderClient() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;
  const lessonId = params.lessonId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
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
            lessonProgress: (prog.modules || []).reduce((acc: any, m: any) => {
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
            modules: (prog.modules || []).map((m: any) => ({
              ...m,
              lessons: (m.lessons || []).map((l: any) => ({
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

      // Fallback
      getEnrollmentByIdQuery(enrollmentId).then(enr => {
        if (!enr) return;
        const activeContactId = getActiveLearnerContactId();
        if (activeContactId && enr.contactId !== activeContactId) {
          setAccessDenied(true);
          return;
        }
        setEnrollment(enr);
        getProgramByIdQuery(enr.programId).then(prog => {
          if (!prog) return;
          setProgram(prog);

          for (const mod of prog.modules) {
            for (const les of mod.lessons) {
              if (les.id === lessonId) {
                setLesson(les);
                const prevProgress = enr.lessonProgress?.[lessonId];
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
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-status-danger)', marginBottom: '8px' }}>
            Akses Ditolak
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Anda tidak memiliki hak akses ke pelajaran ini.
          </p>
          <Link href="/learn" style={{ fontWeight: 750, color: 'var(--color-primary)' }}>
            ← Kembali ke Program Saya
          </Link>
        </div>
      </LearnerShell>
    );
  }

  if (!enrollment || !program || !lesson) {
    return (
      <LearnerShell>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
          Memuat sesi materi...
        </div>
      </LearnerShell>
    );
  }

  const isReflectionRequired = true;
  const isButtonDisabled = isReflectionRequired && !reflectionAnswer.trim();

  const handleComplete = async () => {
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let res: any;
      if (reflectionAnswer.trim()) {
        res = await submitReflectionCommand(enrollmentId, lessonId, { responseText: reflectionAnswer });
      } else {
        res = await completeLessonCommand(enrollmentId, lessonId);
      }

      const allLessons = (program?.modules || []).flatMap((m: any) => m.lessons || []);
      const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
      const isLastLesson = currentIndex >= 0 && currentIndex === allLessons.length - 1;
      const completedCount = allLessons.filter((l: any) => l.isCompleted || l.id === lessonId).length;
      const isAllDone = allLessons.length > 0 && completedCount >= allLessons.length;

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

  const handleCtaClick = async (ctaUrl: string) => {
    await recordCtaClickCommand(enrollmentId, lessonId, ctaUrl);
  };

  const embedVideoUrl = getYoutubeEmbedUrl(lesson.videoYoutubeUrl ?? undefined);

  return (
    <LearnerShell title={lesson.title} showBack={true} backHref={`/learn/programs/${enrollmentId}`}>
      <div style={{ padding: '20px 0', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '18px', color: 'var(--color-text-main)' }}>
          {lesson.title}
        </h1>

        {/* Embedded YouTube Player */}
        {embedVideoUrl && (
          <div
            style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              borderRadius: 'var(--border-radius-lg)',
              marginBottom: '20px',
              backgroundColor: '#0F1411',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--color-divider)',
            }}
          >
            <iframe
              src={embedVideoUrl}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              allowFullScreen
            />
          </div>
        )}

        {/* Text Content */}
        {lesson.textContent && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              padding: '22px',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--color-divider)',
              fontSize: '15px',
              lineHeight: 1.7,
              color: 'var(--color-text-body)',
              marginBottom: '22px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {lesson.textContent}
          </div>
        )}

        {/* Attachments */}
        {lesson.attachments && lesson.attachments.length > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 780, marginBottom: '10px', color: 'var(--color-text-main)' }}>
              Lampiran Panduan / Lembar Kerja
            </h3>
            {lesson.attachments.map(att => (
              <a
                key={att.id}
                href={att.url}
                download
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13.5px',
                  color: 'inherit',
                  textDecoration: 'none',
                  marginBottom: '8px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{att.name}</span>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }} className="tabular-nums">
                  {att.sizeFormatted || 'Download'}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Mandatory Reflection Box */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            padding: '22px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1.5px solid var(--color-primary-border)',
            marginBottom: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '4px' }}>
              Refleksi Wajib
            </span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 650, color: 'var(--color-text-main)', marginBottom: '12px', lineHeight: 1.5 }}>
            {lesson.reflectionPrompt || 'Tuliskan poin penting dan pengamatan Anda dari materi ini:'}
          </p>

          <textarea
            rows={4}
            value={reflectionAnswer}
            onChange={e => setReflectionAnswer(e.target.value)}
            placeholder="Tuliskan jawaban atau refleksi Anda di sini..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--color-divider)',
              fontSize: '14px',
              lineHeight: 1.5,
              outline: 'none',
              backgroundColor: 'var(--color-surface)',
            }}
          />
          {isButtonDisabled && (
            <div style={{ fontSize: '12px', color: 'var(--color-status-warning)', marginTop: '6px', fontWeight: 600 }}>
              * Mohon isi refleksi di atas untuk menyelesaikan materi ini.
            </div>
          )}
        </div>

        {/* Call to Action Button with Explicit Event Tracking */}
        {(lesson.hasCta || lesson.ctaLabel) && (lesson.ctaUrl || (lesson.ctaConfig as any)?.url || lesson.ctaLabel) && (
          <div style={{ marginBottom: '22px' }}>
            <a
              href={lesson.ctaUrl || (lesson.ctaConfig as any)?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                handleCtaClick(lesson.ctaUrl || (lesson.ctaConfig as any)?.url || '#');
              }}
              className="touch-target-primary"
              style={{
                width: '100%',
                backgroundColor: '#25D366',
                color: '#FFF',
                fontWeight: 780,
                fontSize: '14px',
                borderRadius: 'var(--border-radius-md)',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.056-1.528-.276-1.157-.428-2.023-1.428-2.614-2.228-.06-.081-.462-.614-.462-1.17 0-.555.289-.828.391-.938.102-.11.222-.138.297-.138.074 0 .148.002.212.006.069.004.16.027.247.234.089.213.308.751.336.806.028.055.046.12.009.193-.036.073-.056.12-.11.184-.056.064-.117.142-.167.193-.056.055-.114.116-.049.227.065.111.288.475.617.768.424.377.781.493.892.548.111.055.176.046.241-.028.065-.074.278-.324.352-.435.074-.111.148-.093.247-.056.1.037.63.297.738.351.108.055.18.083.207.129.028.046.028.67-.116 1.075z" />
              </svg>
              {lesson.ctaLabel || 'Konsultasi via WhatsApp'}
            </a>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              color: 'var(--color-status-danger)',
              backgroundColor: 'var(--color-status-danger-bg)',
              border: '1px solid var(--color-status-danger-border)',
              padding: '10px 14px',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Completion Button */}
        <button
          onClick={handleComplete}
          disabled={isButtonDisabled || isSubmitting}
          className="touch-target-primary"
          style={{
            width: '100%',
            backgroundColor: isButtonDisabled ? 'var(--color-divider)' : 'var(--color-primary)',
            color: isButtonDisabled ? 'var(--color-text-subtle)' : '#FFFFFF',
            fontWeight: 780,
            fontSize: '14.5px',
            borderRadius: 'var(--border-radius-md)',
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
            boxShadow: isButtonDisabled ? 'none' : 'var(--shadow-sm)',
          }}
        >
          {isSubmitting ? 'Menyimpan progres...' : 'Tandai Selesai & Lanjut →'}
        </button>
      </div>
    </LearnerShell>
  );
}
