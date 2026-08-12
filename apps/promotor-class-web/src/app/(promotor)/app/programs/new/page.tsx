'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { createProgramCommand } from '@/modules/programs/commands';
import { getTemplateByIdQuery } from '@/modules/templates/queries';

function NewProgramForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<'free' | 'paid'>('free');

  useEffect(() => {
    if (templateId) {
      getTemplateByIdQuery(templateId).then(tpl => {
        if (tpl) {
          setTitle(tpl.title);
          setSubtitle(tpl.subtitle);
          setDescription(tpl.description);
          setPriceType(tpl.priceType);
        }
      });
    }
  }, [templateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newProg = await createProgramCommand(
      title.trim(),
      subtitle.trim(),
      description.trim() || subtitle.trim() || 'Program edukasi untuk peserta STIFIn',
      priceType
    );

    router.push(`/app/programs/${newProg.id}`);
  };

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Buat Program Baru</h1>
      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
        {templateId ? 'Formulir telah diisi otomatis berdasarkan template terpilih.' : 'Satu halaman sederhana tanpa wizard.'}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Judul Program *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Contoh: 7 Hari Mengenal Cara Belajar Anak"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--color-divider)',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Subjudul / Ringkasan
          </label>
          <input
            type="text"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            placeholder="Contoh: Panduan Praktis Orang Tua Mengidentifikasi Mesin Kecerdasan"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--color-divider)',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Deskripsi Lengkap
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Jelaskan manfaat dan tujuan program untuk calon peserta..."
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--color-divider)',
              fontSize: '14px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Tipe Akses & Harga
          </label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input
                type="radio"
                name="priceType"
                checked={priceType === 'free'}
                onChange={() => setPriceType('free')}
              />
              Gratis (Lead Magnet)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <input
                type="radio"
                name="priceType"
                checked={priceType === 'paid'}
                onChange={() => setPriceType('paid')}
              />
              Berbayar (One-time)
            </label>
          </div>
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
          Simpan & Mulai Susun Kurikulum
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
