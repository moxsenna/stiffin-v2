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
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-status-danger)', marginBottom: '8px' }}>
            Akses Ditolak
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Anda tidak memiliki hak akses ke pelajaran ini.
          </p>
          <Link href="/learn" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
            ← Kembali ke Program Saya
          </Link>
        </div>
      </LearnerShell>
    );
  }

  if (!enrollment || !program || !lesson) {
    return (
      <LearnerShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>Memuat pelajaran...</div>
      </LearnerShell>
    );
  }

  const isReflectionRequired = !!lesson.hasReflection;
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

      const targetUrl = (res?.learningStatus === 'COMPLETED' || res?.progressPercent === 100)
        ? `/learn/programs/${enrollmentId}/completed`
        : `/learn/programs/${enrollmentId}`;

      router.push(targetUrl);
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
    <LearnerShell title={lesson.title}>
      <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          <Link href={`/learn/programs/${enrollmentId}`}>← Kembali ke Kurikulum</Link>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>{lesson.title}</h1>

        {/* Embedded YouTube Player */}
        {embedVideoUrl && (
          <div
            style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              borderRadius: 'var(--border-radius-md)',
              marginBottom: '16px',
              backgroundColor: '#000',
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
              padding: '16px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: '20px',
            }}
          >
            {lesson.textContent}
          </div>
        )}

        {/* Attachments */}
        {lesson.attachments && lesson.attachments.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Lampiran Berkas / Panduan</h3>
            {lesson.attachments.map(att => (
              <a
                key={att.id}
                href={att.url}
                download
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: 'inherit',
                  textDecoration: 'none',
                  marginBottom: '6px',
                }}
              >
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{att.name}</span>
                <span style={{ color: 'var(--color-text-subtle)' }} className="tabular-nums">
                  {att.sizeFormatted || 'Download'}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Mandatory Reflection Box */}
        {(lesson.hasReflection || lesson.reflectionPrompt || lesson.reflectionType) && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              padding: '16px',
              borderRadius: 'var(--border-radius-md)',
              border: '2px solid var(--color-primary-border)',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px' }}>
              Refleksi Wajib *
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-main)', marginBottom: '10px' }}>
              {lesson.reflectionPrompt || 'Tuliskan pemikiran dan hasil pengamatan Anda:'}
            </p>

            <textarea
              rows={4}
              value={reflectionAnswer}
              onChange={e => setReflectionAnswer(e.target.value)}
              placeholder="Tuliskan refleksi Anda di sini..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                fontSize: '13px',
              }}
            />
            {isButtonDisabled && (
              <div style={{ fontSize: '11px', color: 'var(--color-status-warning)', marginTop: '4px' }}>
                * Anda wajib mengisi refleksi di atas untuk membuka tombol Selesai.
              </div>
            )}
          </div>
        )}

        {/* Call to Action Button with Explicit Event Tracking */}
        {(lesson.hasCta || lesson.ctaLabel) && (lesson.ctaUrl || (lesson.ctaConfig as any)?.url || lesson.ctaLabel) && (
          <div style={{ marginBottom: '20px' }}>
            <a
              href={lesson.ctaUrl || (lesson.ctaConfig as any)?.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleCtaClick(lesson.ctaUrl || (lesson.ctaConfig as any)?.url || '#')}
              className="touch-target-primary"
              style={{
                width: '100%',
                backgroundColor: '#25D366',
                color: '#FFF',
                fontWeight: 700,
                borderRadius: 'var(--border-radius-md)',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              {lesson.ctaLabel || 'Konsultasi via WhatsApp'}
            </a>
          </div>
        )}

        {errorMsg && (
          <div style={{ color: 'var(--color-status-danger)', fontSize: '13px', marginBottom: '10px' }}>
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
            color: isButtonDisabled ? 'var(--color-text-subtle)' : '#FFF',
            fontWeight: 700,
            borderRadius: 'var(--border-radius-md)',
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Menyimpan...' : 'Tandai Selesai & Lanjut'}
        </button>
      </div>
    </LearnerShell>
  );
}
