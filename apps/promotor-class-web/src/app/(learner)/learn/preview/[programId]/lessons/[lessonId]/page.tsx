'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LearnerShell } from '@/components/layout/LearnerShell';
import { LoadingRows } from '@/components/ui';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { getYoutubeEmbedUrl } from '@/lib/video/parse-youtube-url';
import { Lesson } from '@promotor/contracts';

export default function PreviewLessonPage() {
  const params = useParams();
  const programId = params.programId as string;
  const lessonId = params.lessonId as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [status, setStatus] = useState<'LOADING' | 'NOT_FOUND'>('LOADING');

  useEffect(() => {
    getProgramByIdQuery(programId)
      .then((program) => {
        const found = (program?.modules ?? []).flatMap((m) => m.lessons ?? []).find((l) => l.id === lessonId);
        if (found) setLesson(found); else setStatus('NOT_FOUND');
      })
      .catch(() => setStatus('NOT_FOUND'));
  }, [programId, lessonId]);

  const embedUrl = lesson?.videoYoutubeUrl ? getYoutubeEmbedUrl(lesson.videoYoutubeUrl) : null;

  return (
    <LearnerShell title="Pratinjau Materi">
      <div style={{ margin: 12, padding: 12, background: '#fef9c3', border: '1px solid #ca8a04', font: '600 13px/1.4 var(--font-sans)' }}>
        Mode Pratinjau — inilah yang dilihat peserta.
      </div>
      {status === 'LOADING' && !lesson && <LoadingRows rows={3} />}
      {status === 'NOT_FOUND' && !lesson && <p style={{ padding: 16 }}>Materi tidak ditemukan.</p>}
      {lesson && (
        <article style={{ padding: 16 }}>
          <h1 style={{ font: '700 20px/1.3 var(--font-sans)' }}>{lesson.title}</h1>
          {embedUrl && (
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', marginTop: 12, background: '#000' }}>
              <iframe src={embedUrl} title={`Preview video: ${lesson.title}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen />
            </div>
          )}
          {lesson.textContent && (
            <div style={{ marginTop: 16, font: '400 15px/1.65 var(--font-sans)', whiteSpace: 'pre-wrap' }}>{lesson.textContent}</div>
          )}
          {(lesson.attachments ?? []).length > 0 && (
            <section style={{ marginTop: 16 }}>
              <div className="kicker">Materi Pendukung</div>
              {(lesson.attachments ?? []).map((att) => (
                <a key={att.id ?? att.url} href={att.url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', padding: 10, border: '1px solid var(--border)', marginTop: 8 }}>
                  📎 {att.name}
                </a>
              ))}
            </section>
          )}
          {lesson.reflectionPrompt && (
            <section style={{ marginTop: 16, padding: 12, border: '1px dashed var(--border)' }}>
              <div className="kicker kicker-muted">Refleksi (peserta akan melihat ini)</div>
              <p style={{ font: '400 14px/1.5 var(--font-sans)' }}>{lesson.reflectionPrompt}</p>
            </section>
          )}
        </article>
      )}
    </LearnerShell>
  );
}
