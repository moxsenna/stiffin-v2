'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPublicStorefrontRepository } from '@/adapters';
import { getProgramsQuery } from '@/modules/programs/queries';
import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';
import { Program } from '@promotor/contracts';

interface StorefrontSettingsClientProps {
  programs?: Program[];
}

const PRESET_AVATARS = [
  { label: 'Foto Profil Bawaan', url: '/images/promoter_profile_rina.webp' },
  { label: 'Logo Minimalis Hijau', url: '/images/og-card.png' },
];

export function StorefrontSettingsClient({ programs: initialPrograms = [] }: StorefrontSettingsClientProps) {
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
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
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
            backgroundColor: 'var(--color-primary)',
            color: '#FFF',
            padding: '14px 22px',
            borderRadius: 'var(--border-radius-md)',
            fontSize: '14px',
            fontWeight: 780,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          ✓ Pengaturan Storefront berhasil disimpan!
        </div>
      )}

      {/* Header Banner & Live Status */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--color-divider)',
          padding: '22px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-status-success)',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '11.5px', fontWeight: 780, color: 'var(--color-status-success)' }}>
                Storefront Publik Aktif
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 850, margin: 0, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
              Pengaturan & Branding Storefront
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Alamat publik: <code style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{publicStorefrontUrl}</code>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(publicStorefrontUrl);
                alert('Tautan storefront berhasil disalin ke clipboard!');
              }}
              className="touch-target"
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13px',
                fontWeight: 750,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              Salin Tautan
            </button>

            <Link
              href={`/p/${profile.workspaceSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--border-radius-sm)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontSize: '13px',
                fontWeight: 750,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid var(--color-primary-border)',
              }}
            >
              Buka Storefront Publik ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Realtime Live Preview Card */}
      <div
        style={{
          backgroundColor: 'var(--color-primary)',
          borderRadius: 'var(--border-radius-lg)',
          padding: '24px',
          color: '#FFFFFF',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-light)', marginBottom: '14px' }}>
          Pratinjau Header Storefront Publik
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <img
            src={customAvatarUrl || profile.avatarUrl || PRESET_AVATARS[0].url}
            alt={profile.displayName}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '20px', fontWeight: 850, letterSpacing: '-0.02em', marginBottom: '2px' }}>
              {profile.displayName || 'Nama Promotor'}
            </div>
            <div style={{ fontSize: '13px', color: '#E2F0E6', fontWeight: 600, marginBottom: '6px' }}>
              {profile.tagline || 'Tagline Storefront'} · {profile.roleLabel || 'Promotor STIFIn'}
            </div>
            <div style={{ fontSize: '13.5px', color: '#FFF', fontWeight: 700, lineHeight: 1.3 }}>
              &ldquo;{profile.headline || 'Headline Utama Landing Page'}&rdquo;
            </div>
            <div style={{ fontSize: '12px', color: '#B8D4C5', marginTop: '6px' }}>
              {programs.length} program aktif · Wilayah: {profile.city || 'Indonesia'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveStorefront} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* KARTU 1: Foto Profil & Identitas Promotor */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: 'var(--color-text-main)' }}>
            1. Foto Profil & Identitas Promotor
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '8px', color: 'var(--color-text-main)' }}>
                Foto Profil / Avatar
              </label>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                <img
                  src={customAvatarUrl || profile.avatarUrl || PRESET_AVATARS[0].url}
                  alt={profile.displayName}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--color-primary-border)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {PRESET_AVATARS.map(p => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => {
                          setCustomAvatarUrl('');
                          setProfile({ ...profile, avatarUrl: p.url });
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--border-radius-sm)',
                          border: profile.avatarUrl === p.url && !customAvatarUrl ? '2px solid var(--color-primary)' : '1px solid var(--color-divider)',
                          backgroundColor: profile.avatarUrl === p.url && !customAvatarUrl ? 'var(--color-primary-light)' : 'var(--color-surface)',
                          color: 'var(--color-text-main)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <input
                      type="url"
                      value={customAvatarUrl}
                      onChange={e => setCustomAvatarUrl(e.target.value)}
                      placeholder="Atau masukkan URL gambar foto/logo eksternal (https://...)"
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
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                  Nama Tampilan Promotor *
                </label>
                <input
                  type="text"
                  required
                  value={profile.displayName}
                  onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                  placeholder="Nama Promotor / Nama Brand"
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
                  Peran / Gelar (Role Label)
                </label>
                <input
                  type="text"
                  value={profile.roleLabel || ''}
                  onChange={e => setProfile({ ...profile, roleLabel: e.target.value })}
                  placeholder="Contoh: Promotor STIFIn & Parenting Coach"
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

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                Tagline / Subtitle Utama *
              </label>
              <input
                type="text"
                required
                value={profile.tagline || ''}
                onChange={e => setProfile({ ...profile, tagline: e.target.value })}
                placeholder="Contoh: Ruang belajar untuk orang tua pendamping anak"
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
        </div>

        {/* KARTU 2: Headline & Bio Pendampingan */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'var(--color-text-main)' }}>
            2. Copywriting Landing Page & Narasi Bio
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                Headline Utama Hero
              </label>
              <input
                type="text"
                value={profile.headline || ''}
                onChange={e => setProfile({ ...profile, headline: e.target.value })}
                placeholder="Contoh: Belajar memahami potensi diri dan keluarga secara manusiawi."
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

        {/* KARTU 3: WhatsApp & Wilayah */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius-lg)',
            border: '1px solid var(--color-divider)',
            padding: '22px',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'var(--color-text-main)' }}>
            3. Kontak & Wilayah Layanan
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
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
                  borderRadius: 'var(--border-radius-sm)',
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
                    style={{ fontSize: '12px', color: 'var(--color-status-success)', fontWeight: 750, textDecoration: 'none' }}
                  >
                    Uji Coba Tautan WhatsApp ↗
                  </a>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px', color: 'var(--color-text-main)' }}>
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
                  borderRadius: 'var(--border-radius-sm)',
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
              backgroundColor: isSaving ? 'var(--color-divider)' : 'var(--color-primary)',
              color: '#FFF',
              fontWeight: 780,
              borderRadius: 'var(--border-radius-md)',
              border: 0,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '14.5px',
              boxShadow: 'var(--shadow-sm)',
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
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-main)',
              fontWeight: 750,
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-divider)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            Lihat di Storefront Publik ↗
          </Link>
        </div>
      </form>
    </div>
  );
}
