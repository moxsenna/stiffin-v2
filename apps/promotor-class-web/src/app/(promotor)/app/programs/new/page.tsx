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

  useEffect(() =>{
    if (templateId) {
      getTemplateByIdQuery(templateId).then((tpl) =>{
        if (tpl) {
          setTitle(tpl.title);
          setSubtitle(tpl.subtitle);
          setDescription(tpl.description);
          setProgramType(tpl.priceType === 'free' ? 'lead_magnet' : 'paid');
        }
      });
    }
  }, [templateId]);

  // Update default eyebrow when programType changes
  const handleProgramTypeChange = (type: 'lead_magnet' | 'aftersales' | 'paid') =>{
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

  const handleAddOutcome = () =>{
    setOutcomes([...outcomes, { title: '', description: '' }]);
  };

  const handleRemoveOutcome = (idx: number) =>{
    setOutcomes(outcomes.filter((_, i) =>i !== idx));
  };

  const handleOutcomeChange = (idx: number, field: 'title' | 'description', value: string) =>{
    const updated = [...outcomes];
    updated[idx][field] = value;
    setOutcomes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) =>{
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
        outcomes: outcomes.filter((o) =>o.title.trim()),
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
    <div style={{ padding: '20px 16px', maxWidth: '720px', margin: '0 auto' }}>
     <div style={{ marginBottom: '20px' }}>
       <Link
          href="/app/programs"
          style={{ fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 600 }}
        >
         ← Kembali ke Daftar Program
        </Link>
       <h1 style={{ fontSize: '22px', fontWeight: 750, marginTop: '8px', marginBottom: '4px' }}>
         Buat Program & Kelas Baru
        </h1>
       <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
         Isi informasi program yang akan ditampilkan pada katalog dan storefront publik.
        </div>
     </div>

     {/* Error Alert Banner */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: '0px',
            padding: '14px 16px',
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
         <div style={{ fontWeight: 750, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
           <span>⚠</span>
           <span>Gagal Menyimpan Program</span>
         </div>
         <div>{errorMessage}</div>
       </div>
     )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
       {/* Section 1: Informasi Dasar */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0px',
            border: '1px solid var(--color-divider)',
            padding: '20px',
          }}
        >
         <h2 style={{ fontSize: '16px', fontWeight: 750, marginBottom: '14px' }}>1. Informasi Utama Program</h2>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div>
             <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
               Judul Program *
              </label>
             <input
                type="text"
                required
                value={title}
                onChange={(e) =>{
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError(false);
                }}
                placeholder="Contoh: 7 Hari Mengenal Cara Belajar Anak"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '0px',
                  border: titleError ? '2px solid #EF4444' : '1px solid var(--color-divider)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
             {titleError && (
                <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', fontWeight: 600 }}>
                 Judul program tidak boleh kosong.
                </div>
             )}
            </div>

           <div>
             <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
               Subjudul / Tagline Singkat
              </label>
             <input
                type="text"
                value={subtitle}
                onChange={(e) =>setSubtitle(e.target.value)}
                placeholder="Contoh: E-course 7 hari khusus untuk orang tua yang ingin memahami gaya belajar anak"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '0px',
                  border: '1px solid var(--color-divider)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
           </div>

           <div>
             <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
               Deskripsi Lengkap Program
              </label>
             <textarea
                rows={3}
                value={description}
                onChange={(e) =>setDescription(e.target.value)}
                placeholder="Jelaskan gambaran umum, manfaat, dan siapa yang cocok mengikuti program ini..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '0px',
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
            borderRadius: '0px',
            border: '1px solid var(--color-divider)',
            padding: '20px',
          }}
        >
         <h2 style={{ fontSize: '16px', fontWeight: 750, marginBottom: '14px' }}>2. Tipe Akses & Kategori Program</h2>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
             {/* Option 1: Lead Magnet */}
              <div
                onClick={() =>handleProgramTypeChange('lead_magnet')}
                style={{
                  padding: '14px',
                  borderRadius: '0px',
                  border:
                    programType === 'lead_magnet'
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--color-divider)',
                  backgroundColor:
                    programType === 'lead_magnet' ? '#ffe0d9' : 'var(--color-canvas)',
                  cursor: 'pointer',
                }}
              >
               <div style={{ fontWeight: 750, fontSize: '14px', color: 'var(--accent-dark)', marginBottom: '4px' }}>
                 Gratis (Lead Magnet)
                </div>
               <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                 Terbuka untuk umum & calon peserta. Langsung dapat mendaftar gratis.
                </div>
             </div>

             {/* Option 2: Aftersales */}
              <div
                onClick={() =>handleProgramTypeChange('aftersales')}
                style={{
                  padding: '14px',
                  borderRadius: '0px',
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
                    fontWeight: 750,
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
                onClick={() =>handleProgramTypeChange('paid')}
                style={{
                  padding: '14px',
                  borderRadius: '0px',
                  border: programType === 'paid' ? '2px solid #4F46E5' : '1px solid var(--color-divider)',
                  backgroundColor: programType === 'paid' ? '#EEF2FF' : 'var(--color-canvas)',
                  cursor: 'pointer',
                }}
              >
               <div style={{ fontWeight: 750, fontSize: '14px', color: '#4F46E5', marginBottom: '4px' }}>
                 Program Berbayar
                </div>
               <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                 Workshop / e-course spesialisasi dengan harga investasi.
                </div>
             </div>
           </div>

           {programType === 'paid' && (
              <div>
               <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                 Harga Investasi Program (Rp) *
                </label>
               <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={priceAmount}
                  onChange={(e) =>setPriceAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
             </div>
           )}
          </div>
       </div>

       {/* Section 3: Visual Cover & Presets (Non-blocking) */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0px',
            border: '1px solid var(--color-divider)',
            padding: '20px',
          }}
        >
         <h2 style={{ fontSize: '16px', fontWeight: 750, marginBottom: '14px' }}>3. Visual Cover & Label Storefront</h2>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
             <div>
               <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                 Label Publik (Eyebrow Tag)
                </label>
               <input
                  type="text"
                  value={heroEyebrow}
                  onChange={(e) =>setHeroEyebrow(e.target.value)}
                  placeholder="Contoh: Program Gratis / Khusus Peserta Tes"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
             </div>

             <div>
               <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                 Durasi Program Label
                </label>
               <input
                  type="text"
                  value={durationLabel}
                  onChange={(e) =>setDurationLabel(e.target.value)}
                  placeholder="Contoh: 7 hari / 30 hari / 8 minggu"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
             </div>
           </div>

           {/* Cover Preset Selector */}
            <div>
             <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '8px' }}>
               Pilihan Cover Standar (Preset V0.1)
              </label>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
               <div
                  onClick={() =>setCoverVariant('cover-a')}
                  style={{
                    padding: '12px',
                    borderRadius: '0px',
                    border: coverVariant === 'cover-a' ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                    backgroundColor: coverVariant === 'cover-a' ? '#ffe0d9' : 'var(--color-canvas)',
                    cursor: 'pointer',
                  }}
                >
                 <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-dark)', marginBottom: '2px' }}>
                    Preset A (Gaya Belajar)
                  </div>
                 <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                   Nuansa Hijau STIFIn (Rekomendasi Lead Magnet)
                  </div>
               </div>

               <div
                  onClick={() =>setCoverVariant('cover-b')}
                  style={{
                    padding: '12px',
                    borderRadius: '0px',
                    border: coverVariant === 'cover-b' ? '2px solid var(--color-status-warning)' : '1px solid var(--color-divider)',
                    backgroundColor: coverVariant === 'cover-b' ? 'var(--color-status-warning-bg)' : 'var(--color-canvas)',
                    cursor: 'pointer',
                  }}
                >
                 <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-status-warning)', marginBottom: '2px' }}>
                    Preset B (Pendampingan)
                  </div>
                 <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                   Nuansa Hangat (Rekomendasi Aftersales)
                  </div>
               </div>

               <div
                  onClick={() =>setCoverVariant('cover-c')}
                  style={{
                    padding: '12px',
                    borderRadius: '0px',
                    border: coverVariant === 'cover-c' ? '2px solid #4F46E5' : '1px solid var(--color-divider)',
                    backgroundColor: coverVariant === 'cover-c' ? '#EEF2FF' : 'var(--color-canvas)',
                    cursor: 'pointer',
                  }}
                >
                 <div style={{ fontWeight: 700, fontSize: '13px', color: '#4F46E5', marginBottom: '2px' }}>
                    Preset C (Parenting & Spesialisasi)
                  </div>
                 <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                   Nuansa Modern (Rekomendasi Berbayar)
                  </div>
               </div>
             </div>

             {/* Optional Custom Image URL */}
              <div style={{ marginTop: '10px' }}>
               <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                 URL Gambar Kustom (Opsional)
                </label>
               <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) =>setCoverImageUrl(e.target.value)}
                  placeholder="https://example.com/cover-image.webp (Kosongkan untuk menggunakan Preset)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
             </div>

             {/* Live Preview */}
              <div style={{ marginTop: '16px' }}>
               <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-subtle)', marginBottom: '8px' }}>
                 Pratinjau Visual Cover Storefront:
                </div>
               <ProgramCover
                  title={title || 'Judul Program'}
                  publicLabel={heroEyebrow}
                  variant={coverVariant}
                  imageUrl={coverImageUrl || undefined}
                />
             </div>
           </div>
         </div>
       </div>

       {/* Section 4: Hasil yang Diharapkan (Learning Outcomes) */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0px',
            border: '1px solid var(--color-divider)',
            padding: '20px',
          }}
        >
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
           <div>
             <h2 style={{ fontSize: '16px', fontWeight: 750, marginBottom: '2px' }}>4. Hasil yang Diharapkan (Outcomes)</h2>
             <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
               Poin manfaat yang akan dilihat peserta di landing page deskripsi program.
              </div>
           </div>

           <button
              type="button"
              onClick={handleAddOutcome}
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--accent-dark)',
                backgroundColor: '#ffe0d9',
                padding: '6px 12px',
                borderRadius: '0px',
                border: 0,
                cursor: 'pointer',
              }}
            >
             + Tambah Poin
            </button>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
           {outcomes.map((out, idx) =>(
              <div
                key={idx}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-canvas)',
                  borderRadius: '0px',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-text-subtle)' }}>
                   Poin #{idx + 1}
                  </div>
                 {outcomes.length >1 && (
                    <button
                      type="button"
                      onClick={() =>handleRemoveOutcome(idx)}
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-status-danger)',
                        fontWeight: 600,
                        border: 0,
                        background: 'none',
                        cursor: 'pointer',
                      }}
                    >
                     Hapus
                    </button>
                 )}
                </div>

               <input
                  type="text"
                  placeholder="Judul Hasil (Contoh: Mengenali Pola Belajar)"
                  value={out.title}
                  onChange={(e) =>handleOutcomeChange(idx, 'title', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />

               <input
                  type="text"
                  placeholder="Deskripsi singkat (Contoh: Memahami sinyal ketika anak menolak belajar)"
                  value={out.description}
                  onChange={(e) =>handleOutcomeChange(idx, 'description', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '0px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
             </div>
           ))}
          </div>
       </div>

       {/* Submit Action */}
        <button
          type="submit"
          disabled={loading}
          className="touch-target-primary"
          style={{
            backgroundColor: 'var(--accent-dark)',
            color: '#FFF',
            fontWeight: 780,
            fontSize: '15px',
            borderRadius: '0px',
            border: 0,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
         {loading ? (
            <>
             <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
             <span>Menyimpan & Menyiapkan Kurikulum...</span>
           </>
         ) : (
            <span>Simpan & Mulai Susun Kurikulum →</span>
         )}
        </button>
     </form>
   </div>
 );
}

export default function NewProgramPage() {
  return (
    <PromotorShell>
     <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Memuat formulir...</div>}>
       <NewProgramForm />
     </Suspense>
   </PromotorShell>
 );
}
