'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getPublicWorkspaceProfileQuery } from '@/modules/public-storefront/queries';
import { updateWorkspaceProfileCommand } from '@/modules/public-storefront/commands';
import { getProgramsQuery } from '@/modules/programs/queries';
import { PublicWorkspaceProfile } from '@/modules/public-storefront/types';
import { Program } from '@promotor/contracts';

interface StorefrontSettingsClientProps {
  programs?: Program[];
}

const DEFAULT_PROFILE: PublicWorkspaceProfile = {
  workspaceSlug: 'rina',
  displayName: 'Rina Prameswari',
  tagline: 'Ruang belajar untuk orang tua',
  headline: 'Belajar memahami anak, tanpa membuat rumah jadi ruang kelas.',
  bio: 'Saya membantu orang tua menerjemahkan hasil tes menjadi kebiasaan yang lebih manusiawi di rumah.',
  city: 'Surabaya',
  roleLabel: 'Promotor STIFIn',
  heroProgramId: 'prog_7_hari_belajar',
  stats: {
    programCount: '3 Program Aktif',
    location: 'Surabaya',
  },
};

export function StorefrontSettingsClient({ programs: initialPrograms = [] }: StorefrontSettingsClientProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [programs, setPrograms] = useState<Program[]>(initialPrograms);
  const [profile, setProfile] = useState<PublicWorkspaceProfile>(DEFAULT_PROFILE);

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    getProgramsQuery().then(setPrograms);
    getPublicWorkspaceProfileQuery('rina').then(res => {
      if (res) setProfile(res);
    });
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      if (event.target?.result) {
        setProfile(prev => ({ ...prev, avatarUrl: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStorefront = async (e: React.FormEvent) => {
    e.preventDefault();

    const updated = await updateWorkspaceProfileCommand('rina', {
      ...profile,
      stats: {
        programCount: `${programs.length} Program Aktif`,
        location: profile.city || 'Surabaya',
      },
    });

    setProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const waCleanPhone = profile.whatsappPhoneE164 ? profile.whatsappPhoneE164.replace(/[^0-9]/g, '') : '';
  const waTestUrl = waCleanPhone
    ? `https://wa.me/${waCleanPhone}?text=${encodeURIComponent(`Halo ${profile.displayName}, saya tes tautan WhatsApp storefront Anda.`)}`
    : null;

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
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: 750,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          ✓ Pengaturan & Foto Profil Storefront berhasil disimpan!
        </div>
      )}

      {/* Header Banner & Live Status */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '18px',
          border: '1px solid var(--color-divider)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
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
                  backgroundColor: '#10B981',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-status-success)', textTransform: 'uppercase' }}>
                Storefront Publik Aktif
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
              Pengaturan & Branding Storefront
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Alamat publik: <code style={{ color: 'var(--color-primary)', fontWeight: 700 }}>localhost:3000/p/{profile.workspaceSlug}</code>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/p/${profile.workspaceSlug}`);
                alert('Tautan storefront berhasil disalin ke clipboard!');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Salin Link 🔗
            </button>

            <Link
              href={`/p/${profile.workspaceSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
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
      </div>

      {/* Realtime Live Preview Card (Card Header) */}
      <div
        style={{
          backgroundColor: '#286344',
          borderRadius: '18px',
          padding: '24px',
          color: '#FFFFFF',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B8D4C5', marginBottom: '12px' }}>
          ✨ LIVE PREVIEW HEADER STOREFRONT PUBLIK
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <img
            src={profile.avatarUrl || '/images/promoter_profile_rina.webp'}
            alt={profile.displayName}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #FFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '20px', fontWeight: 850, letterSpacing: '-0.02em', marginBottom: '2px' }}>
              {profile.displayName || 'Nama Promotor'}
            </div>
            <div style={{ fontSize: '13px', color: '#E2F0E6', fontWeight: 600, marginBottom: '6px' }}>
              {profile.tagline || 'Tagline Storefront'} · {profile.roleLabel}
            </div>
            <div style={{ fontSize: '13.5px', color: '#FFF', fontWeight: 700, lineHeight: 1.3 }}>
              &quot;{profile.headline || 'Headline Utama Landing Page'}&quot;
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
            borderRadius: '18px',
            border: '1px solid var(--color-divider)',
            padding: '22px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 780, marginBottom: '16px' }}>1. Foto Profil / Logo & Identitas Promotor</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Foto Profil / Logo Picker */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '8px' }}>
                Foto Profil / Logo Promotor *
              </label>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <img
                  src={profile.avatarUrl || '/images/promoter_profile_rina.webp'}
                  alt={profile.displayName}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--color-primary-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFF',
                      borderRadius: '10px',
                      fontWeight: 750,
                      fontSize: '13px',
                      border: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    📸 Upload Foto Profil Baru
                  </button>

                  {profile.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, avatarUrl: undefined })}
                      style={{ fontSize: '12px', color: 'var(--color-status-danger)', fontWeight: 600, border: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      Hapus & Gunakan Foto Bawaan
                    </button>
                  )}

                  <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                    Format PNG, JPG, WEBP (Max 5MB). Foto ini langsung tampil di profil & header storefront.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
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
                    borderRadius: '10px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 750, marginBottom: '6px' }}>
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
                  borderRadius: '10px',
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
            borderRadius: '18px',
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
                  borderRadius: '10px',
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
            borderRadius: '18px',
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
                  borderRadius: '10px',
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
                    Uji Coba Tautan WhatsApp 💬 ↗
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
                  borderRadius: '10px',
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
            className="touch-target-primary"
            style={{
              padding: '0 28px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFF',
              fontWeight: 780,
              borderRadius: '14px',
              border: 0,
              cursor: 'pointer',
              fontSize: '15px',
              boxShadow: 'var(--shadow-md)',
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
              padding: '0 22px',
              backgroundColor: 'var(--color-surface-hover)',
              color: 'var(--color-text-main)',
              fontWeight: 750,
              borderRadius: '14px',
              border: '1px solid var(--color-divider)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            Lihat Tampilan di Storefront Publik ↗
          </Link>
        </div>
      </form>
    </div>
  );
}
