'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import {
  PublicStorefrontTheme,
  StorefrontStylePreset,
  StorefrontFontPreset,
  StorefrontRadiusPreset,
  StorefrontButtonPreset,
  StorefrontLayoutPreset,
  HeroAlignment,
  STYLE_PRESET_TOKENS,
  TALIRA_DEFAULT_STOREFRONT_THEME,
  validateThemeContrast,
  getReadableTextColor,
  HexColorSchema,
} from '@promotor/contracts';
import {
  getStorefrontThemeQuery,
  updateStorefrontThemeMutation,
  resetStorefrontThemeMutation,
} from '@/modules/public-storefront/queries';
import { StorefrontThemeProvider } from '@/components/theme/StorefrontThemeProvider';
import { ImageUpload } from '@/components/promotor/ImageUpload';

interface StorefrontBrandEditorProps {
  workspaceSlug: string;
  onSaved?: () => void;
}

export function StorefrontBrandEditor({ workspaceSlug, onSaved }: StorefrontBrandEditorProps) {
  const [theme, setTheme] = useState<PublicStorefrontTheme>(TALIRA_DEFAULT_STOREFRONT_THEME);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    getStorefrontThemeQuery()
      .then((t) => {
        if (t) {
          setTheme({
            brandName: t.brandName || 'Talira Class',
            tagline: t.tagline ?? null,
            logoUrl: t.logoUrl ?? null,
            primaryColor: t.primaryColor || TALIRA_DEFAULT_STOREFRONT_THEME.primaryColor,
            accentColor: t.accentColor || TALIRA_DEFAULT_STOREFRONT_THEME.accentColor,
            backgroundColor: t.backgroundColor || TALIRA_DEFAULT_STOREFRONT_THEME.backgroundColor,
            surfaceColor: t.surfaceColor || TALIRA_DEFAULT_STOREFRONT_THEME.surfaceColor,
            textColor: t.textColor || TALIRA_DEFAULT_STOREFRONT_THEME.textColor,
            mutedTextColor: t.mutedTextColor || TALIRA_DEFAULT_STOREFRONT_THEME.mutedTextColor,
            stylePreset: t.stylePreset || 'MODERNIST',
            fontPreset: t.fontPreset || 'ARCHIVO',
            radiusPreset: t.radiusPreset || 'SHARP',
            buttonPreset: t.buttonPreset || 'SOLID',
            layoutPreset: t.layoutPreset || 'LIST',
            heroAlignment: t.heroAlignment || 'LEFT',
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load storefront theme:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const contrastReport = useMemo(() => {
    return validateThemeContrast(theme);
  }, [theme]);

  const handleApplyPreset = (presetKey: StorefrontStylePreset) => {
    const tokens = STYLE_PRESET_TOKENS[presetKey];
    if (tokens) {
      setTheme((prev) => ({
        ...prev,
        ...tokens,
      }));
    }
  };

  const handleColorChange = (field: keyof PublicStorefrontTheme, value: string) => {
    let clean = value.trim();
    if (!clean.startsWith('#') && /^[0-9a-fA-F]{1,6}$/.test(clean)) {
      clean = `#${clean}`;
    }
    setTheme((prev) => ({
      ...prev,
      [field]: clean,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveMessage(null);

    // Validate Hex Colors
    try {
      HexColorSchema.parse(theme.primaryColor);
      HexColorSchema.parse(theme.accentColor);
      HexColorSchema.parse(theme.backgroundColor);
      HexColorSchema.parse(theme.surfaceColor);
      HexColorSchema.parse(theme.textColor);
      HexColorSchema.parse(theme.mutedTextColor);
    } catch (err: any) {
      setErrorMessage(`Format warna tidak valid: Pastikan menggunakan kode Hex 6 karakter (#RRGGBB).`);
      return;
    }

    if (!theme.brandName.trim()) {
      setErrorMessage('Nama Brand tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateStorefrontThemeMutation(theme);
      setTheme(updated);
      setSaveMessage('Tema visual storefront berhasil disimpan!');
      if (onSaved) onSaved();
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan tema storefront');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      const resetTheme = await resetStorefrontThemeMutation();
      setTheme(resetTheme);
      setShowResetConfirm(false);
      setSaveMessage('Tampilan storefront telah dikembalikan ke standar Talira.');
      if (onSaved) onSaved();
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mereset tema');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Memuat preferensi brand storefront...
      </div>
    );
  }

  const primaryBtnFg = getReadableTextColor(theme.primaryColor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Messages */}
      {saveMessage && (
        <div
          style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{saveMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Main Grid: Editor Controls (Left) + Live Preview (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '28px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Controls Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Brand Presets (1-Click) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-divider)',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 750, margin: '0 0 4px 0' }}>
                Preset Gaya Brand
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Pilih kombinasi warna dan tipografi terkurasi yang selaras dengan persona edukasi Anda.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {[
                {
                  id: 'MODERNIST' as const,
                  name: 'Modernist',
                  desc: 'Tegas, kontras tinggi & presisi',
                  primary: '#201e1d',
                  accent: '#ec3013',
                  bg: '#f3f2f2',
                },
                {
                  id: 'SOFT' as const,
                  name: 'Soft & Warm',
                  desc: 'Teduh, ramah keluarga & rounded',
                  primary: '#2d3a34',
                  accent: '#437a65',
                  bg: '#f7f6f2',
                },
                {
                  id: 'MINIMAL' as const,
                  name: 'Minimal Clean',
                  desc: 'Fokus konten tanpa distraksi',
                  primary: '#111827',
                  accent: '#4b5563',
                  bg: '#fafafa',
                },
                {
                  id: 'EDITORIAL' as const,
                  name: 'Editorial',
                  desc: 'Serif elegan, hangat & akademis',
                  primary: '#1c1917',
                  accent: '#c2410c',
                  bg: '#f5f2eb',
                },
              ].map((p) => {
                const isSelected = theme.stylePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    style={{
                      border: isSelected ? '2px solid var(--accent-dark)' : '1px solid var(--color-divider)',
                      borderRadius: '6px',
                      padding: '12px',
                      backgroundColor: isSelected ? '#f8fafc' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          backgroundColor: p.primary,
                        }}
                      />
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          backgroundColor: p.accent,
                        }}
                      />
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          backgroundColor: p.bg,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {p.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Brand Identity */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-divider)',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 750, margin: '0 0 16px 0' }}>
              Identitas Brand
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, marginBottom: '6px' }}>
                  Nama Brand / Studio *
                </label>
                <input
                  type="text"
                  value={theme.brandName}
                  onChange={(e) => setTheme({ ...theme, brandName: e.target.value })}
                  placeholder="Contoh: Rina Learning Studio"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, marginBottom: '6px' }}>
                  Tagline Brand
                </label>
                <input
                  type="text"
                  value={theme.tagline || ''}
                  onChange={(e) => setTheme({ ...theme, tagline: e.target.value })}
                  placeholder="Contoh: Pendampingan Karakter & Potensi Genetik STIFIn"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, marginBottom: '6px' }}>
                  Logo Brand (Opsional)
                </label>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 8px 0' }}>
                  Unggah logo resmi studio Anda. Otomatis dikonversi dan dioptimalkan ke WebP.
                </p>
                <ImageUpload
                  kind="logo"
                  aspectRatio="auto"
                  maxWidth={800}
                  maxHeight={800}
                  currentImageUrl={theme.logoUrl || undefined}
                  onUploaded={({ publicUrl }: { publicUrl: string }) => setTheme({ ...theme, logoUrl: publicUrl })}
                  onRemoved={() => setTheme({ ...theme, logoUrl: null })}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Palet Warna & Aksesibilitas */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-divider)',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 750, margin: '0 0 2px 0' }}>
                  Palet Warna
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Kode Hex 6 digit (#RRGGBB)
                </span>
              </div>

              {/* Accessibility Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 650,
                  backgroundColor: contrastReport.isAccessible ? '#dcfce7' : '#fef3c7',
                  color: contrastReport.isAccessible ? '#15803d' : '#b45309',
                }}
              >
                <span>{contrastReport.isAccessible ? '✓' : '⚠️'}</span>
                <span>{contrastReport.isAccessible ? 'Kontras Terbaca (WCAG AA)' : 'Perlu Penyesuaian'}</span>
              </div>
            </div>

            {contrastReport.issues.length > 0 && (
              <div
                style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#92400e',
                  marginBottom: '16px',
                  lineHeight: 1.4,
                }}
              >
                <strong>Catatan Kontras:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {contrastReport.issues.map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '14px',
              }}
            >
              {[
                { label: 'Warna Primer', key: 'primaryColor' as const, desc: 'Tombol & badge utama' },
                { label: 'Warna Aksen', key: 'accentColor' as const, desc: 'Sorotan & eyebrow' },
                { label: 'Latar Belakang', key: 'backgroundColor' as const, desc: 'Warna dasar halaman' },
                { label: 'Warna Kartu/Surface', key: 'surfaceColor' as const, desc: 'Header & kartu' },
                { label: 'Warna Teks Utama', key: 'textColor' as const, desc: 'Judul & paragraf' },
                { label: 'Warna Teks Sekunder', key: 'mutedTextColor' as const, desc: 'Keterangan waktu' },
              ].map((c) => (
                <div key={c.key}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 650, marginBottom: '4px' }}>
                    {c.label}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={theme[c.key] || '#000000'}
                      onChange={(e) => handleColorChange(c.key, e.target.value)}
                      style={{
                        width: '36px',
                        height: '36px',
                        padding: 0,
                        border: '1px solid var(--color-divider)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    />
                    <input
                      type="text"
                      value={theme[c.key]}
                      onChange={(e) => handleColorChange(c.key, e.target.value)}
                      maxLength={7}
                      style={{
                        width: '85px',
                        padding: '8px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-divider)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Tipografi & Bentuk (Typography & Geometry) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-divider)',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 750, margin: '0 0 16px 0' }}>
              Tipografi & Bentuk
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {/* Font Preset */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, marginBottom: '6px' }}>
                  Font Tipografi
                </label>
                <select
                  value={theme.fontPreset}
                  onChange={(e) => setTheme({ ...theme, fontPreset: e.target.value as StorefrontFontPreset })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="ARCHIVO">Archivo (Modern & Tegas)</option>
                  <option value="INTER">Inter (Netral & Presisi)</option>
                  <option value="MANROPE">Manrope (Hangat & Ramah)</option>
                  <option value="LORA">Lora (Serif Akademis)</option>
                </select>
              </div>

              {/* Radius Preset */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, marginBottom: '6px' }}>
                  Kelengkungan Sudut
                </label>
                <select
                  value={theme.radiusPreset}
                  onChange={(e) => setTheme({ ...theme, radiusPreset: e.target.value as StorefrontRadiusPreset })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="SHARP">Sharp (0px - Tegas)</option>
                  <option value="SOFT">Soft (6px - Lembut)</option>
                  <option value="ROUNDED">Rounded (14px - Membulat)</option>
                </select>
              </div>

              {/* Button Preset */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, marginBottom: '6px' }}>
                  Gaya Tombol
                </label>
                <select
                  value={theme.buttonPreset}
                  onChange={(e) => setTheme({ ...theme, buttonPreset: e.target.value as StorefrontButtonPreset })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="SOLID">Solid (Warna Penuh)</option>
                  <option value="OUTLINE">Outline (Garis Tepi)</option>
                  <option value="SOFT">Soft (Transparan Halus)</option>
                </select>
              </div>

              {/* Hero Alignment */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 650, marginBottom: '6px' }}>
                  Perataan Hero
                </label>
                <select
                  value={theme.heroAlignment}
                  onChange={(e) => setTheme({ ...theme, heroAlignment: e.target.value as HeroAlignment })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-divider)',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="LEFT">Rata Kiri (Standar)</option>
                  <option value="CENTER">Rata Tengah (Center)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #ef4444',
                color: '#dc2626',
                padding: '10px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              Reset ke Tampilan Talira
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={`/p/${workspaceSlug}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 18px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: '#FFFFFF',
                  color: '#1e293b',
                  fontSize: '13px',
                  fontWeight: 650,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Lihat Storefront Asli ↗
              </a>

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  backgroundColor: 'var(--accent-dark)',
                  color: '#FFFFFF',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  border: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </form>

        {/* RIGHT COLUMN: Live Interactive Preview */}
        <div
          style={{
            position: 'sticky',
            top: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 4px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              LIVE PREVIEW STOREFRONT
            </span>

            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                style={{
                  border: 0,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: previewMode === 'desktop' ? '#FFFFFF' : 'transparent',
                  color: previewMode === 'desktop' ? '#0f172a' : '#64748b',
                  boxShadow: previewMode === 'desktop' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                🖥️ Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                style={{
                  border: 0,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: previewMode === 'mobile' ? '#FFFFFF' : 'transparent',
                  color: previewMode === 'mobile' ? '#0f172a' : '#64748b',
                  boxShadow: previewMode === 'mobile' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                📱 Mobile (375px)
              </button>
            </div>
          </div>

          {/* Preview Viewport Frame */}
          <div
            style={{
              border: '1px solid var(--color-divider)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              justifyContent: 'center',
              padding: previewMode === 'mobile' ? '20px 0' : '0',
            }}
          >
            <div
              style={{
                width: previewMode === 'mobile' ? '375px' : '100%',
                maxHeight: '620px',
                overflowY: 'auto',
                boxShadow: previewMode === 'mobile' ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                borderRadius: previewMode === 'mobile' ? '24px' : '0',
                border: previewMode === 'mobile' ? '8px solid #1e293b' : 'none',
              }}
            >
              <StorefrontThemeProvider theme={theme}>
                <div style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                  {/* Mini Header */}
                  <header
                    style={{
                      height: '54px',
                      padding: '0 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--brand-surface)',
                      borderBottom: '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {theme.logoUrl ? (
                        <img
                          src={theme.logoUrl}
                          alt="Logo"
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--brand-radius-sm)',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--brand-radius-sm)',
                            backgroundColor: 'var(--brand-primary)',
                            color: primaryBtnFg,
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 800,
                            fontSize: '12px',
                          }}
                        >
                          {theme.brandName.charAt(0)}
                        </div>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 750, color: 'var(--brand-text)' }}>
                        {theme.brandName}
                      </span>
                    </div>

                    <button
                      type="button"
                      style={{
                        border: 0,
                        backgroundColor: 'var(--brand-primary)',
                        color: primaryBtnFg,
                        fontWeight: 700,
                        fontSize: '11px',
                        padding: '6px 12px',
                        borderRadius: 'var(--brand-radius-sm)',
                      }}
                    >
                      Mulai
                    </button>
                  </header>

                  {/* Mini Hero */}
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: theme.heroAlignment === 'CENTER' ? 'center' : 'left',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--brand-accent)',
                        marginBottom: '8px',
                      }}
                    >
                      ● Ruang Belajar Online
                    </span>
                    <h2
                      style={{
                        fontSize: '20px',
                        lineHeight: 1.15,
                        fontWeight: 800,
                        color: 'var(--brand-text)',
                        margin: '0 0 8px 0',
                      }}
                    >
                      {theme.tagline || 'Pahami Potensi Genetik & Karakter Anda'}
                    </h2>
                    <p
                      style={{
                        fontSize: '12px',
                        lineHeight: 1.5,
                        color: 'var(--brand-muted)',
                        margin: '0 0 14px 0',
                      }}
                    >
                      Materi terstruktur dan pendampingan aplikatif untuk hasil belajar optimal.
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: theme.heroAlignment === 'CENTER' ? 'center' : 'flex-start',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          border: 0,
                          backgroundColor: 'var(--brand-primary)',
                          color: primaryBtnFg,
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '8px 14px',
                          borderRadius: 'var(--brand-radius)',
                        }}
                      >
                        Lihat Program
                      </button>
                    </div>
                  </div>

                  {/* Mini Program Card */}
                  <div style={{ padding: '0 16px 20px 16px' }}>
                    <div
                      style={{
                        backgroundColor: 'var(--brand-surface)',
                        borderRadius: 'var(--brand-radius)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        padding: '12px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      <img
                        src="/images/program_cover_remaja.webp"
                        alt="Sample"
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: 'var(--brand-radius-sm)',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '9px',
                            fontWeight: 800,
                            color: 'var(--brand-accent)',
                            textTransform: 'uppercase',
                          }}
                        >
                          Program Unggulan
                        </span>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 750,
                            color: 'var(--brand-text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Memahami Potensi Remaja
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--brand-muted)' }}>
                          Gratis · 12 Materi
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Footer */}
                  <footer
                    style={{
                      marginTop: 'auto',
                      padding: '14px 16px',
                      borderTop: '1px solid rgba(0,0,0,0.08)',
                      fontSize: '10px',
                      color: 'var(--brand-muted)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--brand-surface)',
                    }}
                  >
                    <span>© 2026 {theme.brandName}</span>
                    <span>Didukung oleh Talira Class</span>
                  </footer>
                </div>
              </StorefrontThemeProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 3000,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 750, margin: '0 0 8px 0', color: '#1e293b' }}>
              Reset ke Tampilan Talira?
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Seluruh kustomisasi warna, font, dan gaya visual storefront akan dikembalikan ke standar tema bawaan Talira Class.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 0,
                  backgroundColor: '#dc2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isResetting ? 'not-allowed' : 'pointer',
                }}
              >
                {isResetting ? 'Mereset...' : 'Ya, Reset Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
