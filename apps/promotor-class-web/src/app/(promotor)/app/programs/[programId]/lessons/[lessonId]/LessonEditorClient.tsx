'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import { saveLessonCommand } from '@/modules/programs/commands';
import { Program, Lesson } from '@promotor/contracts';

export function LessonEditorClient() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const lessonId = params.lessonId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [title, setTitle] = useState('');
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [hasReflection, setHasReflection] = useState(true);
  const [reflectionPrompt, setReflectionPrompt] = useState('Tuliskan catatan refleksi & hal menarik yang Anda temukan dari materi ini:');
  const [hasCta, setHasCta] = useState(false);
  const [ctaLabel, setCtaLabel] = useState('Konsultasi via WhatsApp');
  const [ctaUrl, setCtaUrl] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [lessonOrder, setLessonOrder] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getProgramByIdQuery(programId)
      .then((prog: Program | undefined) => {
        if (!prog) {
          setErrorMessage('Program tidak ditemukan.');
          return;
        }
        setProgram(prog);
        let found = false;
        for (const mod of prog.modules) {
          for (const les of mod.lessons) {
            if (les.id === lessonId) {
              found = true;
              setModuleId(mod.id);
              setLessonOrder(les.order || 1);
              setTitle(les.title);
              setVideoYoutubeUrl(les.videoYoutubeUrl || '');
              setTextContent(les.textContent || '');
              setHasReflection(!!les.hasReflection || !!les.reflectionPrompt);
              setReflectionPrompt(
                les.reflectionPrompt || 'Tuliskan catatan refleksi & hal menarik yang Anda temukan dari materi ini:'
              );
              setHasCta(!!les.hasCta || !!les.ctaLabel);
              setCtaLabel(les.ctaLabel || 'Konsultasi via WhatsApp');
              setCtaUrl((les.ctaConfig as any)?.url || les.ctaUrl || '');
            }
          }
        }
        if (!found) {
          setErrorMessage('Pelajaran tidak ditemukan dalam program ini.');
        }
      })
      .catch((err) => {
        console.error('Error loading lesson:', err);
        setErrorMessage('Gagal memuat data pelajaran.');
      })
      .finally(() => {
        setInitialLoading(false);
      });
  }, [programId, lessonId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Judul Pelajaran wajib diisi.');
      return;
    }

    if (!program || !moduleId) {
      setErrorMessage('Konteks program atau modul tidak valid.');
      return;
    }

    const trimmedText = textContent.trim();
    const trimmedVideo = videoYoutubeUrl.trim();
    const hasAnyContent = Boolean(trimmedText || trimmedVideo || hasReflection || hasCta);

    if (!hasAnyContent) {
      setErrorMessage('Pelajaran harus memiliki setidaknya materi teks, video YouTube, refleksi, atau tombol aksi (CTA).');
      return;
    }

    setLoading(true);

    try {
      const updatedLesson: Lesson = {
        id: lessonId,
        moduleId,
        title: title.trim(),
        order: lessonOrder,
        videoYoutubeUrl: trimmedVideo || undefined,
        videoProvider: trimmedVideo ? 'youtube' : undefined,
        textContent: trimmedText || undefined,
        hasReflection,
        reflectionType: hasReflection ? 'long_text' : undefined,
        reflectionPrompt: hasReflection ? reflectionPrompt.trim() || 'Tuliskan catatan refleksi Anda:' : undefined,
        hasCta,
        ctaType: hasCta ? 'EXTERNAL' : undefined,
        ctaLabel: hasCta ? ctaLabel.trim() || 'Konsultasi via WhatsApp' : undefined,
        ctaUrl: hasCta ? ctaUrl.trim() || 'https://wa.me/' : undefined,
        ctaConfig: hasCta ? { url: ctaUrl.trim() || 'https://wa.me/' } : undefined,
      };

      await saveLessonCommand(programId, moduleId, updatedLesson);
      router.push(`/app/programs/${programId}`);
    } catch (err: any) {
      console.error('Failed to save lesson:', err);
      setErrorMessage(err?.message || 'Gagal menyimpan perubahan pelajaran. Periksa kembali isian form.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <PromotorShell>
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
          Memuat editor pelajaran...
        </div>
      </PromotorShell>
    );
  }

  return (
    <PromotorShell>
      <div style={{ padding: '24px 20px', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          <Link href={`/app/programs/${programId}`} style={{ textDecoration: 'none', color: 'var(--color-text-muted)', fontWeight: 650 }}>
            ← Kembali ke Kurikulum Program
          </Link>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.025em', marginBottom: '6px', color: 'var(--color-text-main)' }}>
          Editor Materi Pelajaran
        </h1>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginBottom: '22px' }}>
          Atur konten materi, video, lembar refleksi pengunci, dan arahan aksi untuk peserta.
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--color-status-danger-bg)',
              border: '1px solid var(--color-status-danger-border)',
              borderRadius: 'var(--border-radius-md)',
              padding: '14px 16px',
              marginBottom: '20px',
              color: 'var(--color-status-danger)',
              fontSize: '13.5px',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 780, marginBottom: '2px' }}>Gagal Menyimpan</div>
            <div>{errorMessage}</div>
          </div>
        )}

        <form
          onSubmit={handleSave}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            backgroundColor: 'var(--color-surface)',
            padding: '24px',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {/* Judul Pelajaran */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Judul Pelajaran *
            </label>
            <input
              type="text"
              required
              data-testid="lesson-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Mengenali Cara Kerja Otak Kanan"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Video URL */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Tautan Video YouTube (Unlisted / Publik)
            </label>
            <input
              type="url"
              value={videoYoutubeUrl}
              onChange={(e) => setVideoYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Dukungan native untuk YouTube unlisted / publik. Kosongkan jika materi berbasis teks murni.
            </div>
          </div>

          {/* Materi Teks */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Materi Teks / Panduan Belajar
            </label>
            <textarea
              rows={7}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Tuliskan uraian materi, rangkuman, atau poin-poin pembelajaran untuk peserta..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                fontSize: '14px',
                lineHeight: 1.6,
                outline: 'none',
              }}
            />
          </div>

          {/* Reflection Setup */}
          <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 750, cursor: 'pointer', color: 'var(--color-text-main)' }}>
              <input
                type="checkbox"
                checked={hasReflection}
                onChange={(e) => setHasReflection(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Wajibkan Lembar Refleksi (Pengunci Pelajaran)</span>
            </label>

            {hasReflection && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  Pertanyaan Panduan Refleksi
                </label>
                <input
                  type="text"
                  value={reflectionPrompt}
                  onChange={(e) => setReflectionPrompt(e.target.value)}
                  placeholder="Contoh: Tuliskan 1 hal yang paling membuka wawasan Anda..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>

          {/* CTA Setup */}
          <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 750, cursor: 'pointer', color: 'var(--color-text-main)' }}>
              <input
                type="checkbox"
                checked={hasCta}
                onChange={(e) => setHasCta(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Tambahkan Tombol Aksi / Call-to-Action (CTA) di Akhir Materi</span>
            </label>

            {hasCta && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    Label Tombol CTA
                  </label>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Contoh: Konsultasi via WhatsApp"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--color-divider)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    URL Tujuan (e.g. WhatsApp Link / External Page)
                  </label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://wa.me/6281234567890"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--color-divider)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="touch-target-primary"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              fontWeight: 780,
              fontSize: '14.5px',
              borderRadius: 'var(--border-radius-md)',
              marginTop: '10px',
              border: 0,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {loading ? 'Menyimpan Perubahan Pelajaran...' : 'Simpan Pelajaran & Perbarui Kurikulum'}
          </button>
        </form>
      </div>
    </PromotorShell>
  );
}
