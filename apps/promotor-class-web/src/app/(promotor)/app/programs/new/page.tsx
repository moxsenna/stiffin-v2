'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { programRepository } from '@/adapters/mock/program-repository';
import { MockStateStore } from '@/adapters/mock/mock-state-store';

export default function NewProgramPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('Parenting & Education');
  const [priceType, setPriceType] = useState<'free' | 'paid'>('free');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const org = MockStateStore.getState().organization;
    const programSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newProg = await programRepository.createProgram({
      organizationId: org.id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      isPublished: true,
      priceType,
      workspaceSlug: org.slug,
      programSlug: programSlug || 'program-baru',
      modules: [
        {
          id: `mod_${Date.now()}`,
          programId: '',
          title: 'Modul 1: Pendahuluan',
          order: 1,
          lessons: [],
        },
      ],
    });

    router.push(`/app/programs/${newProg.id}`);
  };

  return (
    <PromotorShell>
      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Buat Program Baru</h1>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
          Satu halaman sederhana tanpa wizard.
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
              Subjudul / Deskripsi Singkat
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
              Kategori
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                fontSize: '14px',
              }}
            >
              <option value="Parenting & Education">Parenting & Education</option>
              <option value="STIFIn Assessment">STIFIn Assessment</option>
              <option value="Personal Coaching">Personal Coaching</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Akses
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input
                  type="radio"
                  name="priceType"
                  checked={priceType === 'free'}
                  onChange={() => setPriceType('free')}
                />
                Gratis / Lead Magnet
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input
                  type="radio"
                  name="priceType"
                  checked={priceType === 'paid'}
                  onChange={() => setPriceType('paid')}
                />
                Berbayar
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
            Simpan & Mula Susun Kurikulum
          </button>
        </form>
      </div>
    </PromotorShell>
  );
}
