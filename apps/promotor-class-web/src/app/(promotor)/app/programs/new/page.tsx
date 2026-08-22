'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { createProgramDetailedCommand } from '@/modules/programs/commands';
import { getTemplateByIdQuery } from '@/modules/templates/queries';
import { ProgramCover } from '@/components/public/ProgramCover';

function NewProgramForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [programType, setProgramType] = useState<'lead_magnet' | 'aftersales' | 'paid'>('lead_magnet');
  const [heroEyebrow, setHeroEyebrow] = useState('Program Gratis');
  const [durationLabel, setDurationLabel] = useState('7 hari');
  const [coverVariant, setCoverVariant] = useState<'cover-a' | 'cover-b' | 'cover-c'>('cover-a');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [priceAmount, setPriceAmount] = useState(150000);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);

  // Dynamic Learning Outcomes
  const [outcomes, setOutcomes] = useState<Array<{ title: string; description: string }>>([
    { title: 'Mengenali Pola Utama', description: 'Memahami sinyal sederhana dalam pembelajaran harian.' },
    { title: 'Aplikasi Praktis di Rumah', description: 'Mencoba penyesuaian kecil tanpa merusak rutinitas.' },
  ]);

  useEffect(() => {
    if (templateId) {
      getTemplateByIdQuery(templateId).then((tpl) => {
        if (tpl) {
          setTitle(tpl.title);
          setSubtitle(tpl.subtitle);
          setDescription(tpl.description);
          setProgramType(tpl.priceType === 'free' ? 'lead_magnet' : 'paid');
        }
      });
    }
  }, [templateId]);

  const handleProgramTypeChange = (type: 'lead_magnet' | 'aftersales' | 'paid') => {
    setProgramType(type);
    if (type === 'lead_magnet') {
      setHeroEyebrow('Program Gratis');
      setCoverVariant('cover-a');
    } else if (type === 'aftersales') {
      setHeroEyebrow('Khusus Peserta Tes');
      setCoverVariant('cover-b');
    } else {
      setHeroEyebrow('Program Berbayar');
      setCoverVariant('cover-c');
    }
  };

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, { title: '', description: '' }]);
  };

  const handleRemoveOutcome = (idx: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== idx));
  };

  const handleOutcomeChange = (idx: number, field: 'title' | 'description', value: string) => {
    const updated = [...outcomes];
    updated[idx][field] = value;
    setOutcomes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setTitleError(true);
      setErrorMessage('Judul Program wajib diisi untuk membuat program baru.');
      return;
    }
    setTitleError(false);

    if (programType === 'paid' && (!priceAmount || priceAmount <= 0)) {
      setErrorMessage('Harga investasi program berbayar harus lebih besar dari Rp 0.');
      return;
    }

    setLoading(true);

    try {
      const newProg = await createProgramDetailedCommand({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || subtitle.trim() || 'Program edukasi untuk peserta STIFIn',
        programType,
        heroEyebrow: heroEyebrow.trim() || undefined,
        durationLabel: durationLabel.trim() || undefined,
        coverVariant,
        imageUrl: coverImageUrl.trim() || undefined,
        priceAmount: programType === 'paid' ? priceAmount : 0,
        outcomes: outcomes.filter((o) => o.title.trim()),
      });

      if (newProg && newProg.id) {
        router.push(`/app/programs/${newProg.id}`);
      } else {
        throw new Error('Respons server tidak menyertakan identitas program yang valid.');
      }
    } catch (err: any) {
      console.error('Failed to create program:', err);
      const msg =
        err?.message ||
        'Gagal membuat program. Pastikan Anda terhubung ke server atau periksa kembali isian formulir.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/app/programs"
          style={{ fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 650 }}
        >
          ← Kembali ke Daftar Program
        </Link>
        <h1 style={{ fontSize: '22px', fontWeight: 850, letterSpacing: '-0.025em', marginTop: '8px', marginBottom: '4px', color: 'var(--color-text-main)' }}>
          Buat Program & Kelas Baru
        </h1>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
          Isi informasi program yang akan ditampilkan pada katalog dan storefront publik.
        </div>
      </div>

      {/* Error Alert Banner */}
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
          <div style={{ fontWeight: 780, marginBottom: '2px' }}>
            Gagal Menyimpan Program
          </div>
          <div>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Section 1: Informasi Dasar */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: 'var(--color-text-main)' }}>1. Informasi Utama Program</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                Judul Program *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError(false);
                }}
                placeholder="Contoh: 7 Hari Mengenal Cara Belajar Anak"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: titleError ? '2px solid var(--color-status-danger)' : '1px solid var(--color-divider)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              {titleError && (
                <div style={{ fontSize: '12px', color: 'var(--color-status-danger)', marginTop: '4px', fontWeight: 600 }}>
                  Judul program tidak boleh kosong.
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                Subjudul / Tagline Singkat
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Contoh: E-course 7 hari khusus untuk orang tua yang ingin memahami gaya belajar anak"
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

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                Deskripsi Lengkap Program
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan gambaran umum, manfaat, dan siapa yang cocok mengikuti program ini..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  fontSize: '14px',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tipe Program & Akses */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: 'var(--color-text-main)' }}>2. Tipe Akses & Kategori Program</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Option 1: Lead Magnet */}
              <div
                onClick={() => handleProgramTypeChange('lead_magnet')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border:
                    programType === 'lead_magnet'
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--color-divider)',
                  backgroundColor:
                    programType === 'lead_magnet' ? 'var(--color-primary-light)' : 'var(--color-canvas)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 780, fontSize: '14px', color: 'var(--color-primary)', marginBottom: '4px' }}>
                  Gratis (Lead Magnet)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Terbuka untuk umum & calon peserta. Langsung dapat mendaftar gratis.
                </div>
              </div>

              {/* Option 2: Aftersales */}
              <div
                onClick={() => handleProgramTypeChange('aftersales')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border:
                    programType === 'aftersales'
                      ? '2px solid var(--color-status-warning)'
                      : '1px solid var(--color-divider)',
                  backgroundColor:
                    programType === 'aftersales' ? 'var(--color-status-warning-bg)' : 'var(--color-canvas)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontWeight: 780,
                    fontSize: '14px',
                    color: 'var(--color-status-warning)',
                    marginBottom: '4px',
                  }}
                >
                  Khusus Peserta Tes
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Pendampingan lanjutan pasca-tes STIFIn. Pendaftaran untuk peserta terdaftar.
                </div>
              </div>

              {/* Option 3: Paid */}
              <div
                onClick={() => handleProgramTypeChange('paid')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: programType === 'paid' ? '2px solid #4F46E5' : '1px solid var(--color-divider)',
                  backgroundColor: programType === 'paid' ? '#EEF2FF' : 'var(--color-canvas)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 780, fontSize: '14px', color: '#4F46E5', marginBottom: '4px' }}>
                  Program Berbayar
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Workshop / e-course spesialisasi dengan harga investasi.
                </div>
              </div>
            </div>

            {programType === 'paid' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                  Harga Investasi Program (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(Number(e.target.value))}
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
            )}
          </div>
        </div>

        {/* Section 3: Visual Cover & Presets */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: 'var(--color-text-main)' }}>3. Visual Cover & Durasi</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                  Label Durasi Belajar
                </label>
                <input
                  type="text"
                  value={durationLabel}
                  onChange={(e) => setDurationLabel(e.target.value)}
                  placeholder="Contoh: 7 hari / 30 hari / 8 minggu"
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
            </div>

            {/* Cover Preset Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '8px', color: 'var(--color-text-main)' }}>
                Pilihan Cover Standar
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                <div
                  onClick={() => setCoverVariant('cover-a')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: coverVariant === 'cover-a' ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                    backgroundColor: coverVariant === 'cover-a' ? 'var(--color-primary-light)' : 'var(--color-canvas)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 750, fontSize: '13px', color: 'var(--color-primary)', marginBottom: '2px' }}>
                    Preset A (Gaya Belajar)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    Nuansa Hijau STIFIn
                  </div>
                </div>

                <div
                  onClick={() => setCoverVariant('cover-b')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: coverVariant === 'cover-b' ? '2px solid var(--color-status-warning)' : '1px solid var(--color-divider)',
                    backgroundColor: coverVariant === 'cover-b' ? 'var(--color-status-warning-bg)' : 'var(--color-canvas)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 750, fontSize: '13px', color: 'var(--color-status-warning)', marginBottom: '2px' }}>
                    Preset B (Komunikasi)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    Nuansa Hangat Keemasan
                  </div>
                </div>

                <div
                  onClick={() => setCoverVariant('cover-c')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: coverVariant === 'cover-c' ? '2px solid #4F46E5' : '1px solid var(--color-divider)',
                    backgroundColor: coverVariant === 'cover-c' ? '#EEF2FF' : 'var(--color-canvas)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 750, fontSize: '13px', color: '#4F46E5', marginBottom: '2px' }}>
                    Preset C (Parenting)
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    Nuansa Biru Tenang
                  </div>
                </div>
              </div>

              {/* Cover Realtime Preview */}
              <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '6px', textAlign: 'center' }}>
                  Pratinjau Cover
                </div>
                <ProgramCover
                  title={title || 'Judul Program Anda'}
                  variant={coverVariant}
                  imageUrl={coverImageUrl || undefined}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Learning Outcomes (Apa yang Dipelajari) */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)' }}>4. Poin Pembelajaran (Outcomes)</h2>
            <button
              type="button"
              onClick={handleAddOutcome}
              style={{
                fontSize: '12.5px',
                fontWeight: 750,
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary-border)',
                padding: '6px 12px',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
              }}
            >
              + Tambah Poin
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {outcomes.map((outcome, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 750, color: 'var(--color-text-main)' }}>Poin {idx + 1}</span>
                  {outcomes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(idx)}
                      style={{ fontSize: '12px', color: 'var(--color-status-danger)', background: 'none', border: 0, cursor: 'pointer' }}
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Judul poin (misal: Mengenali Tanda Stres Anak)"
                  value={outcome.title}
                  onChange={(e) => handleOutcomeChange(idx, 'title', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--border-radius-xs)',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    marginBottom: '8px',
                  }}
                />
                <input
                  type="text"
                  placeholder="Penjelasan singkat manfaat materi..."
                  value={outcome.description}
                  onChange={(e) => handleOutcomeChange(idx, 'description', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--border-radius-xs)',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <Link
            href="/app/programs"
            className="touch-target-primary"
            style={{
              flex: 1,
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-main)',
              fontWeight: 750,
              fontSize: '14px',
              borderRadius: 'var(--border-radius-md)',
              textAlign: 'center',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="touch-target-primary"
            style={{
              flex: 2,
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              fontWeight: 780,
              fontSize: '14.5px',
              borderRadius: 'var(--border-radius-md)',
              border: 0,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {loading ? 'Menyimpan Program...' : 'Simpan & Lanjutkan ke Kurikulum →'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewProgramPage() {
  return (
    <PromotorShell>
      <Suspense fallback={<div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Memuat form...</div>}>
        <NewProgramForm />
      </Suspense>
    </PromotorShell>
  );
}
