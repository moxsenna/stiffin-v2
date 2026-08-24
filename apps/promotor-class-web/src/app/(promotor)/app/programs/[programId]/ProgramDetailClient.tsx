'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getProgramByIdQuery } from '@/modules/programs/queries';
import {
  toggleProgramStatusCommand,
  reorderModulesCommand,
  addModuleCommand,
  deleteModuleCommand,
  addLessonCommand,
  deleteLessonCommand,
} from '@/modules/programs/commands';
import { Program, Module, Lesson } from '@promotor/contracts';

export function ProgramDetailClient() {
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<Program | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Modals & Drawers state
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    materialType: 'video' as 'video' | 'text',
    videoYoutubeUrl: '',
    textContent: '',
    hasReflection: true,
    reflectionPrompt: 'Tuliskan catatan refleksi & hal menarik yang Anda temukan dari materi ini:',
    hasCta: false,
    ctaLabel: 'Konsultasi via WhatsApp',
    ctaUrl: '',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadProgramData = useCallback(async () =>{
    try {
      const data = await getProgramByIdQuery(programId);
      if (data) {
        setProgram(data);
        setLoadError(null);
      } else {
        setLoadError('Program tidak ditemukan atau Anda tidak memiliki akses ke program ini.');
      }
    } catch (err: any) {
      console.error('Failed to load program:', err);
      setLoadError(err?.message || 'Gagal memuat detail program.');
    } finally {
      setInitialLoading(false);
    }
  }, [programId]);

  useEffect(() =>{
    loadProgramData();
  }, [loadProgramData]);

  const showToast = (msg: string) =>{
    setToastMessage(msg);
    setTimeout(() =>setToastMessage(null), 3000);
  };

  if (initialLoading) {
    return (
      <PromotorShell>
       <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
         <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
         <div style={{ fontWeight: 600 }}>Memuat detail kurikulum program...</div>
       </div>
     </PromotorShell>
   );
  }

  if (loadError || !program) {
    return (
      <PromotorShell>
       <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
         <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '0px', border: '1px solid var(--color-divider)', padding: '32px 24px' }}>
           <div style={{ fontSize: '32px', marginBottom: '12px' }}></div>
           <h1 style={{ fontSize: '18px', fontWeight: 750, marginBottom: '8px' }}>Program Tidak Ditemukan</h1>
           <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
             {loadError || 'Program dengan identitas tersebut tidak ditemukan atau belum dibuat.'}
            </p>
           <Link
              href="/app/programs"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: 'var(--accent-dark)',
                color: '#FFF',
                borderRadius: '0px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
             ← Kembali ke Daftar Program
            </Link>
         </div>
       </div>
     </PromotorShell>
   );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${program.workspaceSlug}/${program.programSlug}`;
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`Halo! Silakan daftar program "${program.title}" di sini: ${publicUrl}`)}`;

  // Status toggle handler
  const handleToggleStatus = async () =>{
    try {
      const updated = await toggleProgramStatusCommand(program.id);
      setProgram(updated);
      showToast(`Status program diubah menjadi: ${updated.status === 'published' ? 'Terbit di Storefront' : 'Draf'}`);
    } catch (err: any) {
      showToast(`Gagal mengubah status: ${err?.message || 'Terjadi kesalahan'}`);
    }
  };

  // Move module handler
  const handleMoveModule = async (index: number, direction: 'up' | 'down') =>{
    if (!program) return;
    const newModules = [...program.modules];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newModules.length) return;

    const temp = newModules[index];
    newModules[index] = newModules[targetIdx];
    newModules[targetIdx] = temp;

    try {
      const updated = await reorderModulesCommand(program.id, newModules.map(m =>m.id));
      setProgram(updated);
      showToast('Urutan modul berhasil diperbarui!');
    } catch (err: any) {
      showToast(`Gagal mengubah urutan: ${err?.message || 'Terjadi kesalahan'}`);
    }
  };

  // Add Module handler
  const handleCreateModule = async (e: React.FormEvent) =>{
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    try {
      const updated = await addModuleCommand(program.id, newModuleTitle.trim());
      setProgram(updated);
      setNewModuleTitle('');
      setShowAddModuleModal(false);
      showToast(`Bab "${newModuleTitle.trim()}" berhasil ditambahkan!`);
    } catch (err: any) {
      showToast(`Gagal menambahkan modul: ${err?.message || 'Terjadi kesalahan'}`);
    }
  };

  // Delete Module handler
  const handleDeleteModule = async (moduleId: string, modTitle: string) =>{
    if (confirm(`Apakah Anda yakin ingin menghapus "${modTitle}" beserta seluruh pelajarannya?`)) {
      try {
        const updated = await deleteModuleCommand(program.id, moduleId);
        setProgram(updated);
        showToast(`Modul "${modTitle}" telah dihapus.`);
      } catch (err: any) {
        showToast(`Gagal menghapus modul: ${err?.message || 'Terjadi kesalahan'}`);
      }
    }
  };

  // Add Lesson handler
  const handleCreateLesson = async (e: React.FormEvent) =>{
    e.preventDefault();
    if (!activeModuleIdForLesson || !lessonForm.title.trim()) return;

    try {
      const updated = await addLessonCommand(
        program.id,
        activeModuleIdForLesson,
        lessonForm.title.trim(),
        lessonForm.materialType === 'video' ? lessonForm.videoYoutubeUrl : undefined
      );

      setProgram(updated);
      setActiveModuleIdForLesson(null);
      setLessonForm({
        title: '',
        materialType: 'video',
        videoYoutubeUrl: '',
        textContent: '',
        hasReflection: true,
        reflectionPrompt: 'Tuliskan catatan refleksi & hal menarik yang Anda temukan dari materi ini:',
        hasCta: false,
        ctaLabel: 'Konsultasi via WhatsApp',
        ctaUrl: '',
      });
      showToast(`Pelajaran "${lessonForm.title.trim()}" berhasil ditambahkan!`);
    } catch (err: any) {
      showToast(`Gagal menambahkan pelajaran: ${err?.message || 'Terjadi kesalahan'}`);
    }
  };

  // Delete Lesson handler
  const handleDeleteLesson = async (moduleId: string, lessonId: string, lessonTitle: string) =>{
    if (confirm(`Apakah Anda yakin ingin menghapus pelajaran "${lessonTitle}"?`)) {
      try {
        const updated = await deleteLessonCommand(program.id, moduleId, lessonId);
        setProgram(updated);
        showToast(`Pelajaran "${lessonTitle}" telah dihapus.`);
      } catch (err: any) {
        showToast(`Gagal menghapus pelajaran: ${err?.message || 'Terjadi kesalahan'}`);
      }
    }
  };

  const totalLessons = program.modules.reduce((acc, m) =>acc + m.lessons.length, 0);

  return (
    <PromotorShell>
     <div style={{ padding: '20px 16px', maxWidth: '840px', margin: '0 auto' }}>
       {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 2000,
              backgroundColor: 'var(--accent-dark)',
              color: '#FFF',
              padding: '12px 20px',
              borderRadius: '0px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: 'var(--shadow-md)',
            }}
          >
           ✓ {toastMessage}
          </div>
       )}

        {/* Top Navigation */}
        <div style={{ marginBottom: '16px' }}>
         <Link
            href="/app/programs"
            style={{ fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 600 }}
          >
           ← Kembali ke Daftar Program
          </Link>
       </div>

       {/* Program Header Card */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '0px',
            border: '1px solid var(--color-divider)',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
           <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
               <h1 style={{ fontSize: '22px', fontWeight: 750 }}>{program.title}</h1>
               <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '0px',
                    backgroundColor: program.status === 'published' ? 'var(--color-status-success-bg)' : '#F0F0ED',
                    color: program.status === 'published' ? 'var(--color-status-success)' : 'var(--color-text-muted)',
                    fontWeight: 750,
                  }}
                >
                 {program.status === 'published' ? 'Terbit di Storefront' : 'Draf (Tersembunyi)'}
                </span>
               <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '0px',
                    backgroundColor: program.programType === 'lead_magnet' ? '#ffe0d9' : '#FFF8EB',
                    color: program.programType === 'lead_magnet' ? 'var(--ink)' : '#C07000',
                    fontWeight: 750,
                  }}
                >
                 {program.programType === 'lead_magnet' ? 'Gratis (Lead Magnet)' : program.programType === 'aftersales' ? 'Khusus Peserta Tes' : 'Berbayar'}
                </span>
             </div>
             <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
               {program.subtitle || program.description}
              </p>
           </div>

           {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
             <button
                onClick={handleToggleStatus}
                style={{
                  padding: '8px 14px',
                  borderRadius: '0px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-surface)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--color-text-main)',
                  cursor: 'pointer',
                }}
              >
               {program.status === 'published' ? 'Ubah ke Draf' : 'Terbitkan'}
              </button>

             <button
                onClick={() =>setShowShareModal(true)}
                className="touch-target-primary"
                style={{
                  padding: '0 16px',
                  backgroundColor: 'var(--accent-dark)',
                  color: '#FFF',
                  borderRadius: '0px',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
               Bagikan Tautan 
              </button>
           </div>
         </div>

         <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid var(--color-divider)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
           <div>
             <strong>{program.modules.length}</strong>Bab / Modul
            </div>
           <div>·</div>
           <div>
             <strong>{totalLessons}</strong>Materi Pelajaran
            </div>
           <div>·</div>
           <Link href={`/p/${program.workspaceSlug}/${program.programSlug}`} target="_blank" style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>
             Preview Halaman Landing ↗
            </Link>
         </div>
       </div>

       {/* Curriculum Header & Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
         <div>
           <h2 style={{ fontSize: '18px', fontWeight: 750 }}>Struktur Kurikulum & Materi</h2>
           <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
             Susun bab (modul) dan sesi pelajaran yang akan diakses oleh peserta.
            </div>
         </div>

         <div style={{ display: 'flex', gap: '8px' }}>
           <button
              onClick={() =>setIsReorderMode(!isReorderMode)}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--color-divider)',
                borderRadius: '0px',
                backgroundColor: isReorderMode ? '#ffe0d9' : 'var(--color-surface)',
                color: isReorderMode ? 'var(--accent-dark)' : 'var(--color-text-main)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
             {isReorderMode ? 'Selesai Urutkan' : 'Atur Urutan Bab'}
            </button>

           <button
              onClick={() =>setShowAddModuleModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--accent-dark)',
                color: '#FFF',
                borderRadius: '0px',
                fontWeight: 750,
                fontSize: '13px',
                border: 0,
                cursor: 'pointer',
              }}
            >
             + Tambah Bab Baru
            </button>
         </div>
       </div>

       {/* Modules & Lessons List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
         {program.modules.map((mod, modIdx) =>(
            <div
              key={mod.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '0px',
                border: '1px solid var(--color-divider)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
             {/* Module Title Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '0px',
                      backgroundColor: '#ffe0d9',
                      color: 'var(--accent-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 800,
                    }}
                  >
                   {modIdx + 1}
                  </div>
                 <h3 style={{ fontSize: '16px', fontWeight: 750 }}>{mod.title}</h3>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 {isReorderMode ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                     <button
                        onClick={() =>handleMoveModule(modIdx, 'up')}
                        disabled={modIdx === 0}
                        style={{ padding: '4px 8px', border: '1px solid var(--color-divider)', borderRadius: '0px', cursor: 'pointer' }}
                      >
                       ▲
                      </button>
                     <button
                        onClick={() =>handleMoveModule(modIdx, 'down')}
                        disabled={modIdx === program.modules.length - 1}
                        style={{ padding: '4px 8px', border: '1px solid var(--color-divider)', borderRadius: '0px', cursor: 'pointer' }}
                      >
                       ▼
                      </button>
                   </div>
                 ) : (
                    <>
                     <button
                        onClick={() =>setActiveModuleIdForLesson(mod.id)}
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: 'var(--accent-dark)',
                          backgroundColor: '#ffe0d9',
                          padding: '6px 12px',
                          borderRadius: '0px',
                          border: 0,
                          cursor: 'pointer',
                        }}
                      >
                       + Tambah Pelajaran
                      </button>
                     <button
                        onClick={() =>handleDeleteModule(mod.id, mod.title)}
                        style={{ fontSize: '12px', color: 'var(--color-text-subtle)', padding: '4px' }}
                      >
                       
                      </button>
                   </>
                 )}
                </div>
             </div>

             {/* Lessons List Inside Module */}
              {mod.lessons.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-canvas)',
                    borderRadius: '0px',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                 Belum ada pelajaran di bab ini. Klik <strong>+ Tambah Pelajaran</strong>di atas.
                </div>
             ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {mod.lessons.map((les, lesIdx) =>(
                    <div
                      key={les.id}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-canvas)',
                        borderRadius: '0px',
                        border: '1px solid var(--color-divider)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontWeight: 700 }} className="tabular-nums">
                         {modIdx + 1}.{lesIdx + 1}
                        </div>
                       <div>
                         <div style={{ fontWeight: 750, fontSize: '14px', marginBottom: '2px' }}>{les.title}</div>
                         <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', gap: '8px' }}>
                           <span className="tag tag-outline">{les.videoYoutubeUrl ? 'Video YouTube' : 'Teks Materi'}</span>
                           {les.hasReflection && <span className="tag tag-outline">Refleksi</span>}
                            {les.hasCta && <span className="tag tag-outline">Tombol CTA</span>}
                          </div>
                       </div>
                     </div>

                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <Link
                          href={`/app/programs/${program.id}/lessons/${les.id}`}
                          style={{ fontSize: '13px', fontWeight: 750, color: 'var(--accent-dark)', textDecoration: 'none' }}
                        >
                         Edit Content →
                        </Link>
                       <button
                          onClick={() =>handleDeleteLesson(mod.id, les.id, les.title)}
                          style={{ fontSize: '12px', color: 'var(--color-text-subtle)', cursor: 'pointer' }}
                        >
                         
                        </button>
                     </div>
                   </div>
                 ))}
                </div>
             )}
            </div>
         ))}
        </div>

       {/* MODAL 1: Tambah Bab / Modul Baru */}
        {showAddModuleModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 3000,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
           <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0px',
                padding: '24px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: 'var(--shadow-sheet)',
              }}
            >
             <h3 style={{ fontSize: '18px', fontWeight: 750, marginBottom: '6px' }}>Tambah Bab / Modul Baru</h3>
             <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
               Masukkan judul bab untuk mengelompokkan topik-topik pelajaran.
              </p>

             <form onSubmit={handleCreateModule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                   Judul Bab / Modul *
                  </label>
                 <input
                    type="text"
                    required
                    value={newModuleTitle}
                    onChange={e =>setNewModuleTitle(e.target.value)}
                    placeholder="Contoh: Modul 2: Penerapan Pola Komunikasi di Rumah"
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

               <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                 <button
                    type="button"
                    onClick={() =>setShowAddModuleModal(false)}
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                   Batal
                  </button>
                 <button
                    type="submit"
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      borderRadius: '0px',
                      backgroundColor: 'var(--accent-dark)',
                      color: '#FFF',
                      fontWeight: 750,
                      fontSize: '14px',
                      border: 0,
                    }}
                  >
                   Simpan Bab
                  </button>
               </div>
             </form>
           </div>
         </div>
       )}

        {/* MODAL 2: Tambah Pelajaran Baru */}
        {activeModuleIdForLesson && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 3000,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
           <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0px',
                padding: '24px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-sheet)',
              }}
            >
             <h3 style={{ fontSize: '18px', fontWeight: 750, marginBottom: '6px' }}>Tambah Sesi Pelajaran Baru</h3>
             <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
               Isi materi pembelajaran, video, dan pertanyaan refleksi peserta.
              </p>

             <form onSubmit={handleCreateLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                   Judul Pelajaran *
                  </label>
                 <input
                    type="text"
                    required
                    value={lessonForm.title}
                    onChange={e =>setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="Contoh: Sesi 1: Memahami Sinyal Kebutuhan Anak"
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
                   Tipe Format Materi
                  </label>
                 <div style={{ display: 'flex', gap: '12px' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                     <input
                        type="radio"
                        name="matType"
                        checked={lessonForm.materialType === 'video'}
                        onChange={() =>setLessonForm({ ...lessonForm, materialType: 'video' })}
                      />
                      Video YouTube + Teks
                    </label>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                     <input
                        type="radio"
                        name="matType"
                        checked={lessonForm.materialType === 'text'}
                        onChange={() =>setLessonForm({ ...lessonForm, materialType: 'text' })}
                      />
                      Teks & Gambar Saja
                    </label>
                 </div>
               </div>

               {lessonForm.materialType === 'video' && (
                  <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                     Link / URL Video YouTube
                    </label>
                   <input
                      type="url"
                      value={lessonForm.videoYoutubeUrl}
                      onChange={e =>setLessonForm({ ...lessonForm, videoYoutubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
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

                <div>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                   Teks Ringkasan / Instruksi Materi
                  </label>
                 <textarea
                    rows={3}
                    value={lessonForm.textContent}
                    onChange={e =>setLessonForm({ ...lessonForm, textContent: e.target.value })}
                    placeholder="Tuliskan poin utama materi yang perlu dipahami oleh peserta..."
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

               {/* Reflection Toggle */}
                <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '12px' }}>
                 <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                   <input
                      type="checkbox"
                      checked={lessonForm.hasReflection}
                      onChange={e =>setLessonForm({ ...lessonForm, hasReflection: e.target.checked })}
                    />
                   Aktifkan Lembar Refleksi Peserta
                  </label>

                 {lessonForm.hasReflection && (
                    <div style={{ marginTop: '8px' }}>
                     <input
                        type="text"
                        value={lessonForm.reflectionPrompt}
                        onChange={e =>setLessonForm({ ...lessonForm, reflectionPrompt: e.target.value })}
                        placeholder="Pertanyaan refleksi untuk peserta..."
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
                 )}
                </div>

               <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                 <button
                    type="button"
                    onClick={() =>setActiveModuleIdForLesson(null)}
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                   Batal
                  </button>
                 <button
                    type="submit"
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      borderRadius: '0px',
                      backgroundColor: 'var(--accent-dark)',
                      color: '#FFF',
                      fontWeight: 750,
                      fontSize: '14px',
                      border: 0,
                    }}
                  >
                   Simpan Pelajaran
                  </button>
               </div>
             </form>
           </div>
         </div>
       )}

        {/* Share Modal */}
        {showShareModal && (
          <>
           <div className="sheet-overlay active" onClick={() =>setShowShareModal(false)} />
           <div className="bottom-sheet active">
             <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Bagikan Program</h3>
             <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
               Tautan publik pendaftaran program untuk calon peserta:
              </div>

             <input
                type="text"
                readOnly
                value={publicUrl}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--color-divider)',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              />

             <div style={{ display: 'flex', gap: '10px' }}>
               <button
                  onClick={() =>{
                    navigator.clipboard.writeText(publicUrl);
                    showToast('Tautan berhasil disalin!');
                    setShowShareModal(false);
                  }}
                  className="touch-target-primary"
                  style={{
                    flex: 1,
                    border: '1px solid var(--color-divider)',
                    borderRadius: 'var(--border-radius-md)',
                    fontWeight: 600,
                  }}
                >
                 Salin Tautan
                </button>

               <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target-primary"
                  style={{
                    flex: 1,
                    backgroundColor: '#25D366',
                    color: '#FFF',
                    borderRadius: 'var(--border-radius-md)',
                    fontWeight: 700,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                 Bagikan ke WhatsApp
                </a>
             </div>
           </div>
         </>
       )}
      </div>
   </PromotorShell>
 );
}
