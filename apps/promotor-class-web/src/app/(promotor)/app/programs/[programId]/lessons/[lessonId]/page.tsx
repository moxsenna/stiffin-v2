'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { programRepository } from '@/adapters/mock/program-repository';
import { Program, Lesson } from '@promotor/contracts';

export default function LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const lessonId = params.lessonId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [title, setTitle] = useState('');
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [hasReflection, setHasReflection] = useState(true);
  const [reflectionPrompt, setReflectionPrompt] = useState('');
  const [hasCta, setHasCta] = useState(false);
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [moduleId, setModuleId] = useState('');

  useEffect(() => {
    programRepository.getProgramById(programId).then((prog: Program | undefined) => {
      if (!prog) return;
      setProgram(prog);
      for (const mod of prog.modules) {
        for (const les of mod.lessons) {
          if (les.id === lessonId) {
            setModuleId(mod.id);
            setTitle(les.title);
            setVideoYoutubeUrl(les.videoYoutubeUrl || '');
            setTextContent(les.textContent || '');
            setHasReflection(les.hasReflection);
            setReflectionPrompt(les.reflectionPrompt || '');
            setHasCta(les.hasCta);
            setCtaLabel(les.ctaLabel || '');
            setCtaUrl(les.ctaUrl || '');
          }
        }
      }
    });
  }, [programId, lessonId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !moduleId) return;

    const updatedLesson: Lesson = {
      id: lessonId,
      moduleId,
      title: title.trim(),
      order: 1,
      videoYoutubeUrl: videoYoutubeUrl.trim() || undefined,
      textContent: textContent.trim() || undefined,
      hasReflection,
      reflectionPrompt: reflectionPrompt.trim() || undefined,
      hasCta,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
    };

    await programRepository.saveLesson(programId, moduleId, updatedLesson);
    router.push(`/app/programs/${programId}`);
  };

  return (
    <PromotorShell>
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          <Link href={`/app/programs/${programId}`}>← Kembali ke Kurikulum</Link>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
          Editor Pelajaran
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Editor Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--color-surface)', padding: '20px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--color-divider)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Judul Pelajaran
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-divider)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Video Tautan YouTube (Unlisted / Publik)
              </label>
              <input
                type="url"
                value={videoYoutubeUrl}
                onChange={e => setVideoYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-divider)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Materi Teks / Panduan
              </label>
              <textarea
                rows={6}
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                placeholder="Tuliskan materi pelajaran..."
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-divider)', fontSize: '14px' }}
              />
            </div>

            {/* Reflection Setup */}
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={hasReflection}
                  onChange={e => setHasReflection(e.target.checked)}
                />
                Wajibkan Pertanyaan Refleksi (Pengunci Pelajaran)
              </label>

              {hasReflection && (
                <input
                  type="text"
                  value={reflectionPrompt}
                  onChange={e => setReflectionPrompt(e.target.value)}
                  placeholder="Contoh: Tuliskan 1 hal yang paling menonjol..."
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-divider)', fontSize: '13px', marginTop: '8px' }}
                />
              )}
            </div>

            {/* CTA Setup */}
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={hasCta}
                  onChange={e => setHasCta(e.target.checked)}
                />
                Tambahkan Tombol Aksi / Call-to-Action (CTA)
              </label>

              {hasCta && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={e => setCtaLabel(e.target.value)}
                    placeholder="Label Tombol (e.g. Konsultasi via WhatsApp)"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-divider)', fontSize: '13px' }}
                  />
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={e => setCtaUrl(e.target.value)}
                    placeholder="URL Tujuan (e.g. https://wa.me/...)"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-divider)', fontSize: '13px' }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="touch-target-primary"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                fontWeight: 700,
                borderRadius: 'var(--border-radius-md)',
                marginTop: '10px',
              }}
            >
              Simpan Pelajaran
            </button>
          </form>
        </div>
      </div>
    </PromotorShell>
  );
}
