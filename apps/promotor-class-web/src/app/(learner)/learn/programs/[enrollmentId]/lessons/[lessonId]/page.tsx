'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { learnerRepository } from '@/adapters/mock/learner-repository';
import { Enrollment, Program, Lesson } from '@promotor/contracts';

export default function LessonReaderPage() {
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

  useEffect(() => {
    const state = MockStateStore.getState();
    const enr = state.enrollments.find(e => e.id === enrollmentId);
    if (!enr) return;
    setEnrollment(enr);

    const prog = state.programs.find(p => p.id === enr.programId);
    if (!prog) return;
    setProgram(prog);

    for (const mod of prog.modules) {
      for (const les of mod.lessons) {
        if (les.id === lessonId) {
          setLesson(les);
          // Pre-fill previous reflection if already completed
          const prevProgress = enr.lessonProgress[lessonId];
          if (prevProgress?.reflectionAnswer) {
            setReflectionAnswer(prevProgress.reflectionAnswer);
          }
        }
      }
    }
  }, [enrollmentId, lessonId]);

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
      const updatedEnr = await learnerRepository.completeLesson(enrollmentId, lessonId, reflectionAnswer);
      if (updatedEnr.status === 'selesai') {
        router.push(`/learn/programs/${enrollmentId}/completed`);
      } else {
        router.push(`/learn/programs/${enrollmentId}`);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Gagal menyelesaikan pelajaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert YouTube URL to embed format if available
  let embedVideoUrl = '';
  if (lesson.videoYoutubeUrl) {
    const match = lesson.videoYoutubeUrl.match(/(?:v=|\/embed\/|\/watch\?v=|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      embedVideoUrl = `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return (
    <LearnerShell>
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

        {/* PDF Attachments */}
        {lesson.attachments && lesson.attachments.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Lampiran File PDF / Dokumen</h3>
            {lesson.attachments.map(att => (
              <div
                key={att.id}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}
              >
                <span>📄 {att.name}</span>
                <span style={{ color: 'var(--color-text-subtle)' }} className="tabular-nums">
                  {att.sizeFormatted || '1.2 MB'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mandatory Reflection Box */}
        {lesson.hasReflection && (
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

        {/* Optional Call to Action Button */}
        {lesson.hasCta && lesson.ctaUrl && (
          <div style={{ marginBottom: '20px' }}>
            <a
              href={lesson.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
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

        {/* Completion Button (Locked when reflection empty!) */}
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
