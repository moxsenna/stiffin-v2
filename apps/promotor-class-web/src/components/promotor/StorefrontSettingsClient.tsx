'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPublicStorefrontRepository } from '@/adapters';
import { getProgramsQuery } from '@/modules/programs/queries';
import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';
import { Program } from '@promotor/contracts';
import { StorefrontBrandEditor } from './StorefrontBrandEditor';
import { ImageUpload } from './ImageUpload';

interface StorefrontSettingsClientProps {
  programs?: Program[];
}

const PRESET_AVATARS = [
  { label: 'Foto Profil Bawaan (Default)', url: '/images/promoter_profile_rina.webp' },
  { label: 'Logo Minimalis Hijau', url: '/images/og-card.png' },
];

export function StorefrontSettingsClient({ programs: initialPrograms = [] }: StorefrontSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'brand' | 'profile'>('brand');
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [profile, setProfile] = useState<PublicWorkspaceProfile | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    Promise.all([
      getProgramsQuery(),
      getPublicStorefrontRepository().getStorefrontProfile(),
    ])
      .then(([progData, profData]) => {
        if (progData) setPrograms(progData);
        if (profData) {
          setProfile(profData);
          if (profData.avatarUrl && !PRESET_AVATARS.some(p => p.url === profData.avatarUrl)) {
            setCustomAvatarUrl(profData.avatarUrl);
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSaveStorefront = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    try {
      const activeAvatar = customAvatarUrl.trim() || profile.avatarUrl || PRESET_AVATARS[0].url;
      const updated = await getPublicStorefrontRepository().updateStorefrontProfile({
        ...profile,
        avatarUrl: activeAvatar,
        stats: {
          programCount: `${programs.length} Program Aktif`,
          location: profile.city || 'Indonesia',
        },
      });

      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Memuat data storefront...
      </div>
    );
  }

  const waCleanPhone = profile.whatsappPhoneE164 ? profile.whatsappPhoneE164.replace(/[^0-9]/g, '') : '';
  const waTestUrl = waCleanPhone
    ? `https://wa.me/${waCleanPhone}?text=${encodeURIComponent(`Halo ${profile.displayName}, saya tes tautan WhatsApp storefront Anda.`)}`
    : null;

  const publicStorefrontUrl = `${origin}/p/${profile.workspaceSlug}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Save Success Banner */}
      {saveSuccess && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 2500,
            backgroundColor: 'var(--accent-dark)',
            color: '#FFF',
            padding: '14px 22px',
            borderRadius: '0px',
            fontSize: '14px',
            fontWeight: 750,
          }}
        >
          ✓ Pengaturan Storefront berhasil disimpan!
        </div>
      )}

      {/* Header Banner & Live Status */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '0px',
          border: '1px solid var(--color-divider)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '0px',
                  backgroundColor: '#10B981',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-status-success)', textTransform: 'uppercase' }}>
                Storefront Publik Aktif
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
              Kustomisasi & Branding Storefront
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Alamat publik: <code style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>{publicStorefrontUrl}</code>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(publicStorefrontUrl);
                alert('Tautan storefront berhasil disalin ke clipboard!');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '0px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Salin Link
            </button>

            <Link
              href={`/p/${profile.workspaceSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                borderRadius: '0px',
                backgroundColor: '#ffe0d9',
                color: 'var(--accent-dark)',
                fontSize: '13px',
                fontWeight: 750,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Buka Storefront Publik ↗
            </Link>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '20px',
            borderTop: '1px solid var(--color-divider)',
            paddingTop: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('brand')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 0,
              backgroundColor: activeTab === 'brand' ? 'var(--accent-dark)' : '#f1f5f9',
              color: activeTab === 'brand' ? '#FFFFFF' : '#475569',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🎨</span>
            <span>Brand & Tema Visual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 0,
              backgroundColor: activeTab === 'profile' ? 'var(--accent-dark)' : '#f1f5f9',
              color: activeTab === 'profile' ? '#FFFFFF' : '#475569',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>👤</span>
            <span>Profil & Narasi Publik</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Brand & Style Customizer */}
      {activeTab === 'brand' && (
        <StorefrontBrandEditor
          workspaceSlug={profile.workspaceSlug}
          onSaved={() => {
            getPublicStorefrontRepository().getStorefrontProfile().then((p) => {
              if (p) setProfile(p);
            });
          }}
        />
      )}

      {/* Tab 2: Profile & Content */}
      {activeTab === 'profile' && (
        <>
          {/* Realtime Live Preview Card */}
          <div
            style={{
              backgroundColor: 'var(--ink)',
              borderRadius: '0px',
              padding: '24px',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B8D4C5', marginBottom: '12px' }}>
              ✨ LIVE PREVIEW HEADER STOREFRONT PUBLIK
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <img
                src={customAvatarUrl || profile.avatarUrl || PRESET_AVATARS[0].url}
                alt={profile.displayName}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '0px',
                  objectFit: 'cover',
                  border: '3px solid #FFF',
                }}
              />

              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '20px', fontWeight: 850, letterSpacing: '-0.02em', marginBottom: '2px' }}>
                  {profile.displayName || 'Nama Promotor'}
                </div>
                <div style={{ fontSize: '13px', color: '#E2ECE5', marginBottom: '6px' }}>
                  {profile.roleLabel || 'Promotor STIFIn'} · {profile.city || 'Indonesia'}
                </div>
                <div style={{ fontSize: '14px', fontStyle: 'italic', color: '#FFF', opacity: 0.9 }}>
                  &ldquo;{profile.tagline || 'Tagline ruang belajar...'}&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* Form Pengaturan Storefront */}
          <form onSubmit={handleSaveStorefront} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KARTU 1: Foto Profil / Avatar */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '0px',
                border: '1px solid var(--color-divider)',
                padding: '22px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '4px' }}>1. Foto Profil Promotor</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Unggah foto profil asli Anda sendiri (disimpan langsung di Cloudflare R2 &amp; otomatis dioptimalkan ke WebP) atau pilih gambar bawaan.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
                {/* Upload Foto Kustom ke R2 */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '8px' }}>
                    Unggah Foto Profil (Cloudflare R2):
                  </label>
                  <ImageUpload
                    kind="avatar"
                    aspectRatio="1/1"
                    maxWidth={800}
                    maxHeight={800}
                    currentImageUrl={customAvatarUrl || (profile.avatarUrl && !PRESET_AVATARS.some(p => p.url === profile.avatarUrl) ? profile.avatarUrl : undefined)}
                    onUploaded={({ publicUrl }) => {
                      setCustomAvatarUrl(publicUrl);
                      setProfile({ ...profile, avatarUrl: publicUrl });
                    }}
                    onRemoved={() => {
                      setCustomAvatarUrl('');
                      setProfile({ ...profile, avatarUrl: PRESET_AVATARS[0].url });
                    }}
                  />
                </div>

                {/* Alternatif: Preset atau URL Eksternal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '8px' }}>
                      Atau Pilih Gambar Bawaan:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {PRESET_AVATARS.map(preset => {
                        const isSelected = (profile.avatarUrl === preset.url && !customAvatarUrl);
                        return (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => {
                              setCustomAvatarUrl('');
                              setProfile({ ...profile, avatarUrl: preset.url });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '8px 12px',
                              borderRadius: '0px',
                              border: isSelected ? '2px solid var(--accent-dark)' : '1px solid var(--color-divider)',
                              backgroundColor: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              style={{ width: '36px', height: '36px', borderRadius: '0px', objectFit: 'cover' }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: isSelected ? 750 : 500 }}>
                              {preset.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '8px' }}>
                      Atau Masukkan URL Foto Kustom:
                    </label>
                    <input
                      type="url"
                      value={customAvatarUrl}
                      onChange={e => {
                        setCustomAvatarUrl(e.target.value);
                        if (e.target.value.trim()) {
                          setProfile({ ...profile, avatarUrl: e.target.value.trim() });
                        }
                      }}
                      placeholder="https://domain.com/foto-anda.webp"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '0px',
                        border: '1px solid var(--color-divider)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Format WebP rasio 1:1 sangat disarankan untuk performa loading maksimal.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KARTU 2: Copywriting Landing Page */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '0px',
                border: '1px solid var(--color-divider)',
                padding: '22px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '14px' }}>2. Copywriting Landing Page & Narasi Bio</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
                    Headline Utama Hero (Big Title)
                  </label>
                  <input
                    type="text"
                    value={profile.headline || ''}
                    onChange={e => setProfile({ ...profile, headline: e.target.value })}
                    placeholder="Contoh: Belajar memahami potensi diri dan keluarga secara manusiawi."
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
                    Narasi Profil Pendampingan (Bio)
                  </label>
                  <textarea
                    rows={4}
                    value={profile.bio || ''}
                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tuliskan latar belakang dan metode pendekatan Anda dalam mendampingi peserta..."
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

            {/* KARTU 3: WhatsApp & Wilayah */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '0px',
                border: '1px solid var(--color-divider)',
                padding: '22px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '14px' }}>3. Kontak & Wilayah Layanan</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
                    Nomor WhatsApp Promotor (Format E.164)
                  </label>
                  <input
                    type="tel"
                    value={profile.whatsappPhoneE164 || ''}
                    onChange={e => setProfile({ ...profile, whatsappPhoneE164: e.target.value })}
                    placeholder="+62812345678"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  {waTestUrl && (
                    <div style={{ marginTop: '6px' }}>
                      <a
                        href={waTestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: '#10B981', fontWeight: 750, textDecoration: 'none' }}
                      >
                        Uji Coba Tautan WhatsApp ↗
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
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
                      borderRadius: '0px',
                      border: '1px solid var(--color-divider)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="touch-target-primary"
                style={{
                  padding: '0 28px',
                  backgroundColor: isSaving ? 'var(--color-divider)' : 'var(--accent-dark)',
                  color: '#FFF',
                  fontWeight: 780,
                  borderRadius: '0px',
                  border: 0,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  height: '46px',
                }}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Storefront'}
              </button>

              <Link
                href={`/p/${profile.workspaceSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target-primary"
                style={{
                  padding: '0 22px',
                  backgroundColor: 'var(--color-surface-hover)',
                  color: 'var(--color-text-main)',
                  fontWeight: 750,
                  borderRadius: '0px',
                  border: '1px solid var(--color-divider)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  height: '46px',
                }}
              >
                Lihat Tampilan di Storefront Publik ↗
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
