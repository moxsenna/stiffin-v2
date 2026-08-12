'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { programRepository } from '@/adapters/mock/program-repository';
import { Program } from '@promotor/contracts';

export function ProgramDetailClient() {
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<Program | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    programRepository.getProgramById(programId).then(data => {
      if (data) setProgram(data);
    });
  }, [programId]);

  if (!program) {
    return (
      <PromotorShell>
        <div style={{ padding: '40px', textAlign: 'center' }}>Memuat program...</div>
      </PromotorShell>
    );
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${program.workspaceSlug}/${program.programSlug}`;
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`Halo! Silakan daftar program "${program.title}" di sini: ${publicUrl}`)}`;

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if (!program) return;
    const newModules = [...program.modules];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newModules.length) return;

    const temp = newModules[index];
    newModules[index] = newModules[targetIdx];
    newModules[targetIdx] = temp;

    const updated = await programRepository.reorderModules(program.id, newModules.map(m => m.id));
    setProgram(updated);
  };

  return (
    <PromotorShell>
      <div style={{ padding: '16px' }}>
        {/* Top Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              <Link href="/app/programs">← Kembali ke Daftar Program</Link>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>{program.title}</h1>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {program.subtitle}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsReorderMode(!isReorderMode)}
              className="touch-target"
              style={{
                padding: '0 12px',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--border-radius-sm)',
                backgroundColor: isReorderMode ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: isReorderMode ? 'var(--color-primary)' : 'var(--color-text-main)',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              {isReorderMode ? 'Selesai Ubah Urutan' : 'Ubah Urutan'}
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="touch-target-primary"
              style={{
                padding: '0 14px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFF',
                borderRadius: 'var(--border-radius-md)',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Bagikan Tautan
            </button>
          </div>
        </div>

        {/* Modules & Lessons Curriculum */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {program.modules.map((mod, modIdx) => (
            <div
              key={mod.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-divider)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                  {mod.title}
                </h3>
                {isReorderMode && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleMoveModule(modIdx, 'up')}
                      disabled={modIdx === 0}
                      style={{ padding: '4px 8px', border: '1px solid var(--color-divider)', borderRadius: '4px' }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveModule(modIdx, 'down')}
                      disabled={modIdx === program.modules.length - 1}
                      style={{ padding: '4px 8px', border: '1px solid var(--color-divider)', borderRadius: '4px' }}
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>

              {/* Lessons List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mod.lessons.map(les => (
                  <div
                    key={les.id}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-canvas)',
                      borderRadius: 'var(--border-radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{les.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {les.videoYoutubeUrl ? '🎥 Video' : '📄 Teks'} {les.hasReflection ? '· 📝 Refleksi' : ''} {les.hasCta ? '· 🔗 CTA' : ''}
                      </div>
                    </div>

                    <Link
                      href={`/app/programs/${program.id}/lessons/${les.id}`}
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}
                    >
                      Edit →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Share Modal (4d) */}
        {showShareModal && (
          <>
            <div className="sheet-overlay active" onClick={() => setShowShareModal(false)} />
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
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    alert('Tautan berhasil disalin!');
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
