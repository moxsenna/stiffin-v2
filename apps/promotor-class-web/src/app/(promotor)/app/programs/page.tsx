'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PromotorShell } from '@/components/layout/PromotorShell';
import { getProgramsQuery } from '@/modules/programs/queries';
import { MockStateStore } from '@/adapters/mock/mock-state-store';
import { Program } from '@promotor/contracts';
import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';

export default function ProgramsPage() {
  const [activeTab, setActiveTab] = useState<'storefront' | 'programs'>('programs');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Storefront Form State
  const [profile, setProfile] = useState<PublicWorkspaceProfile>({
    workspaceSlug: 'rina',
    displayName: 'Rina Prameswari',
    tagline: 'Ruang belajar untuk orang tua',
    headline: 'Belajar memahami anak, tanpa membuat rumah jadi ruang kelas.',
    bio: 'Saya membantu orang tua menerjemahkan hasil tes menjadi kebiasaan yang lebih manusiawi di rumah.',
    city: 'Surabaya',
    roleLabel: 'Promotor STIFIn',
    whatsappPhoneE164: '+6281234567890',
    heroProgramId: 'prog_7_hari_belajar',
    stats: {
      programCount: '3 Program Aktif',
      location: 'Surabaya',
    },
  });

  useEffect(() => {
    getProgramsQuery().then(setPrograms);

    const storeProfiles = MockStateStore.getState().workspaceProfiles;
    if (storeProfiles && storeProfiles.rina) {
      setProfile(storeProfiles.rina);
    }
  }, []);

  const handleSaveStorefront = (e: React.FormEvent) => {
    e.preventDefault();
    MockStateStore.updateState(curr => ({
      ...curr,
      workspaceProfiles: {
        ...curr.workspaceProfiles,
        rina: {
          ...profile,
          stats: {
            programCount: `${programs.length} Program Aktif`,
            location: profile.city || 'Surabaya',
          },
        },
      },
    }));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <PromotorShell>
      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 750, letterSpacing: '-0.02em' }}>Kelola Storefront & Program</h1>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Atur tampilan publik ruang belajar dan susun materi e-course Anda
            </div>
          </div>

          <Link
            href="/p/rina"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--color-primary-light)',
              padding: '6px 12px',
              borderRadius: '20px',
            }}
          >
            Preview Storefront ↗
          </Link>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--color-divider)',
            marginBottom: '20px',
            paddingBottom: '2px',
          }}
        >
          <button
            onClick={() => setActiveTab('programs')}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: activeTab === 'programs' ? 750 : 500,
              color: activeTab === 'programs' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'programs' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
            }}
          >
            Daftar Program & Materi ({programs.length})
          </button>

          <button
            onClick={() => setActiveTab('storefront')}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: activeTab === 'storefront' ? 750 : 500,
              color: activeTab === 'storefront' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === 'storefront' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
            }}
          >
            Pengaturan Storefront Publik
          </button>
        </div>

        {/* TAB 1: DAFTAR PROGRAM & MATERI */}
        {activeTab === 'programs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Daftar program gratis (lead magnet), khusus peserta tes, dan berbayar.
              </div>

              <Link
                href="/app/programs/new"
                className="touch-target-primary"
                style={{
                  padding: '0 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFF',
                  borderRadius: 'var(--border-radius-md)',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                + Buat Program Baru
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {programs.map(prog => (
                <div
                  key={prog.id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-divider)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: 750 }}>{prog.title}</span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: prog.status === 'published' ? 'var(--color-status-success-bg)' : '#F0F0ED',
                            color: prog.status === 'published' ? 'var(--color-status-success)' : 'var(--color-text-muted)',
                            fontWeight: 700,
                          }}
                        >
                          {prog.status === 'published' ? 'Terbit di Storefront' : 'Draf'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: prog.programType === 'lead_magnet' ? '#eef5f1' : prog.programType === 'aftersales' ? '#FFF8EB' : '#eef2ff',
                            color: prog.programType === 'lead_magnet' ? '#286344' : prog.programType === 'aftersales' ? '#C07000' : '#3730a3',
                            fontWeight: 700,
                          }}
                        >
                          {prog.programType === 'lead_magnet' ? 'Gratis (Umum)' : prog.programType === 'aftersales' ? 'Khusus Peserta Tes' : 'Berbayar'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                        {prog.subtitle || prog.description}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--color-divider)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                      {prog.modules.length} Modul · {prog.modules.reduce((acc, m) => acc + m.lessons.length, 0)} Sesi Pelajaran
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Link
                        href={`/p/rina/${prog.programSlug}`}
                        target="_blank"
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-text-muted)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Lihat Halaman Landing ↗
                      </Link>
                      <Link
                        href={`/app/programs/${prog.id}`}
                        style={{
                          fontSize: '13px',
                          fontWeight: 750,
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                        }}
                      >
                        Kelola Kurikulum & Materi →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: KUSTOMISASI STOREFRONT PUBLIK */}
        {activeTab === 'storefront' && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              padding: '24px',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 750, marginBottom: '4px' }}>Pengaturan Tampilan Storefront</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Kelola informasi profil, deskripsi pendampingan, dan kontak WhatsApp yang akan muncul pada landing page publik Anda (`/p/${profile.workspaceSlug}`).
              </p>
            </div>

            {saveSuccess && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-status-success-bg)',
                  color: 'var(--color-status-success)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  marginBottom: '20px',
                  border: '1px solid #b8d4c5',
                }}
              >
                ✓ Pengaturan Storefront berhasil disimpan! Perubahan dapat langsung dilihat di halaman publik.
              </div>
            )}

            <form onSubmit={handleSaveStorefront} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Nama Tampilan Promotor *
                </label>
                <input
                  type="text"
                  required
                  value={profile.displayName}
                  onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                  placeholder="Contoh: Rina Prameswari"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Tagline / Subtitle Utama *
                </label>
                <input
                  type="text"
                  required
                  value={profile.tagline}
                  onChange={e => setProfile({ ...profile, tagline: e.target.value })}
                  placeholder="Contoh: Ruang belajar untuk orang tua pendamping anak"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Headline Utama Landing Page
                </label>
                <input
                  type="text"
                  value={profile.headline || ''}
                  onChange={e => setProfile({ ...profile, headline: e.target.value })}
                  placeholder="Contoh: Belajar memahami anak, tanpa membuat rumah jadi ruang kelas."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Narasi & Profil Pendampingan (Bio)
                </label>
                <textarea
                  rows={4}
                  value={profile.bio || ''}
                  onChange={e => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tuliskan latar belakang dan metode pendekatan Anda dalam mendampingi peserta..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Nomor WhatsApp Promotor (Format E.164) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={profile.whatsappPhoneE164 || ''}
                    onChange={e => setProfile({ ...profile, whatsappPhoneE164: e.target.value })}
                    placeholder="+6281234567890"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                    Nomor ini digunakan untuk tombol "Hubungi Promotor via WhatsApp".
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                    Wilayah Layanan / Kota
                  </label>
                  <input
                    type="text"
                    value={profile.city || ''}
                    onChange={e => setProfile({ ...profile, city: e.target.value })}
                    placeholder="Contoh: Surabaya"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  className="touch-target-primary"
                  style={{
                    padding: '0 24px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFF',
                    fontWeight: 750,
                    borderRadius: '12px',
                    border: 0,
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Simpan Pengaturan Storefront
                </button>

                <Link
                  href={`/p/${profile.workspaceSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target-primary"
                  style={{
                    padding: '0 20px',
                    backgroundColor: 'var(--color-surface-hover)',
                    color: 'var(--color-text-main)',
                    fontWeight: 700,
                    borderRadius: '12px',
                    border: '1px solid var(--color-divider)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  Lihat Hasil di Storefront Publik ↗
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </PromotorShell>
  );
}
