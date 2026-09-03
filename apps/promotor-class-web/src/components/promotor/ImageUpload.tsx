'use client';

import React, { useState, useRef } from 'react';
import {
  presignCoverUploadCommand,
  confirmCoverUploadCommand,
  directUploadToR2,
  deleteCoverImageCommand,
} from '@/modules/programs/commands';
import { presignWorkspaceAssetCommand } from '@/modules/public-storefront/queries';
import { compressAndConvertToWebP, formatBytes } from '@/lib/image-compression';

export interface ImageUploadProps {
  programId?: string;
  kind?: 'cover' | 'avatar' | 'logo';
  aspectRatio?: '16/9' | '1/1' | 'auto';
  maxWidth?: number;
  maxHeight?: number;
  currentImageUrl?: string;
  onUploaded: (info: { publicUrl: string; key: string }) => void;
  onRemoved?: () => void;
  disabled?: boolean;
  label?: string;
  helpText?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export function ImageUpload({
  programId,
  kind = 'cover',
  aspectRatio,
  maxWidth,
  maxHeight,
  currentImageUrl,
  onUploaded,
  onRemoved,
  disabled = false,
  label,
  helpText,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState<string>('Mengunggah...');
  const [compressionInfo, setCompressionInfo] = useState<{ originalSize: number; compressedSize: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Synchronize previewUrl if parent updates currentImageUrl
  React.useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const effectiveAspectRatio = aspectRatio || (kind === 'avatar' ? '1/1' : kind === 'logo' ? 'auto' : '16/9');
  const targetMaxWidth = maxWidth || (kind === 'cover' ? 1600 : 800);
  const targetMaxHeight = maxHeight || (kind === 'cover' ? 900 : 800);

  const defaultLabel =
    label ||
    (kind === 'avatar'
      ? 'Klik atau seret foto profil ke sini'
      : kind === 'logo'
      ? 'Klik atau seret logo brand ke sini'
      : 'Klik atau seret gambar cover ke sini');

  const defaultActiveText =
    helpText ||
    (kind === 'avatar'
      ? 'Foto profil aktif · R2 Cloud Storage'
      : kind === 'logo'
      ? 'Logo brand aktif · R2 Cloud Storage'
      : 'Cover aktif · R2 Cloud Storage');

  const handleFile = async (rawFile: File) => {
    setErrorMsg(null);
    setCompressionInfo(null);

    if (!ALLOWED_TYPES.includes(rawFile.type.toLowerCase()) && !rawFile.name.match(/\.(jpe?g|png|webp|avif)$/i)) {
      setErrorMsg('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.');
      return;
    }

    setUploading(true);
    setStatusText('Mengompresi & mengubah ke WebP...');
    setProgress(15);

    try {
      // 0. Kompresi otomatis ke WebP di sisi browser
      const compressionResult = await compressAndConvertToWebP(rawFile, {
        maxWidth: targetMaxWidth,
        maxHeight: targetMaxHeight,
        quality: 0.85,
      });

      const file = compressionResult.file;
      setCompressionInfo({
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
      });

      // Local instant preview
      const localBlobUrl = URL.createObjectURL(file);
      setPreviewUrl(localBlobUrl);
      setProgress(35);
      setStatusText('Menyiapkan upload R2...');

      // 1. Dapatkan presigned PUT URL dari API sesuai jenis aset
      let presign: { key: string; uploadUrl: string; publicUrl: string };
      if (kind === 'avatar' || kind === 'logo') {
        presign = await presignWorkspaceAssetCommand(kind, {
          fileName: file.name,
          contentType: file.type.toLowerCase(),
          contentLength: file.size,
        });
      } else {
        presign = await presignCoverUploadCommand({
          programId,
          fileName: file.name,
          contentType: file.type.toLowerCase(),
          contentLength: file.size,
        });
      }

      setProgress(60);
      setStatusText('Mengunggah langsung ke Cloudflare R2...');

      // 2. Direct upload PUT ke Cloudflare R2
      await directUploadToR2(presign.uploadUrl, file, file.type.toLowerCase());
      setProgress(85);
      setStatusText('Memfinalisasi aset...');

      // 3. Jika sudah ada programId yang tersimpan (khusus program cover), confirm ke backend
      let finalPublicUrl = presign.publicUrl;
      let finalKey = presign.key;

      if (kind === 'cover' && programId) {
        const confirmed = await confirmCoverUploadCommand({
          programId,
          key: presign.key,
          contentType: file.type.toLowerCase(),
          contentLength: file.size,
        });
        finalPublicUrl = confirmed.publicUrl;
        finalKey = confirmed.key;
      }

      setProgress(100);
      setPreviewUrl(finalPublicUrl);
      onUploaded({ publicUrl: finalPublicUrl, key: finalKey });
    } catch (err: any) {
      console.error('[ImageUpload] Failed:', err);
      setErrorMsg(err.message || 'Gagal mengunggah gambar ke R2. Coba lagi.');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !uploading) setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = async () => {
    if (disabled || uploading) return;
    setErrorMsg(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (kind === 'cover' && programId) {
      try {
        await deleteCoverImageCommand(programId);
      } catch (err: any) {
        console.warn('[ImageUpload] Delete error:', err);
      }
    }

    if (onRemoved) onRemoved();
  };

  const isSquare = effectiveAspectRatio === '1/1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
        disabled={disabled || uploading}
      />

      {previewUrl ? (
        <div
          style={{
            border: '2px solid var(--ink)',
            backgroundColor: 'var(--surface-muted)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: isSquare ? '140px' : '100%',
              maxWidth: isSquare ? '140px' : '100%',
              aspectRatio: isSquare ? '1/1' : effectiveAspectRatio === 'auto' ? 'auto' : '16/9',
              minHeight: isSquare ? '140px' : effectiveAspectRatio === 'auto' ? '80px' : 'auto',
              maxHeight: isSquare ? '140px' : effectiveAspectRatio === 'auto' ? '140px' : 'auto',
              backgroundColor: '#0F172A',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isSquare ? '4px' : '0px',
              margin: isSquare ? '0 auto' : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Asset preview"
              style={{
                width: isSquare ? '100%' : effectiveAspectRatio === 'auto' ? 'auto' : '100%',
                height: isSquare ? '100%' : effectiveAspectRatio === 'auto' ? '100%' : '100%',
                maxHeight: '140px',
                objectFit: isSquare ? 'cover' : effectiveAspectRatio === 'auto' ? 'contain' : 'cover',
              }}
            />
            {uploading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  gap: '8px',
                  padding: '8px',
                  backdropFilter: 'blur(2px)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center' }}>{statusText}</div>
                <div style={{ width: '80%', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 150ms ease' }} />
                </div>
                {compressionInfo && (
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, textAlign: 'center' }}>
                    {formatBytes(compressionInfo.compressedSize)} (WebP)
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted-strong)', fontWeight: 600 }}>
                {defaultActiveText}
              </span>
              {compressionInfo && (
                <span className="tag tag-accent" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  WebP ({formatBytes(compressionInfo.compressedSize)})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="btn btn-secondary btn-sm"
              >
                Ganti Gambar
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || uploading}
                className="btn btn-danger btn-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => {
            if (!disabled && !uploading) fileInputRef.current?.click();
          }}
          style={{
            border: isDragging ? '2px solid var(--accent)' : '2px dashed var(--line)',
            backgroundColor: isDragging ? 'var(--accent-soft)' : 'var(--surface-muted)',
            padding: '24px 16px',
            textAlign: 'center',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'border 120ms ease, background-color 120ms ease',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
            <rect x="3" y="3" width="18" height="18" rx="0" ry="0" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>

          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>
              {defaultLabel}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              Otomatis dikonversi ke WebP &amp; dikompresi agar loading super cepat
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '6px' }}
            disabled={disabled || uploading}
          >
            Pilih File dari Perangkat
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="field-error" style={{ fontSize: '12px', marginTop: '2px' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
        ⚡ <strong>Optimasi Otomatis:</strong> Gambar apa pun (JPG, PNG, WebP) akan otomatis diubah ke format modern <strong>WebP</strong> dan di-<em>resize</em> secara instan di browser sebelum diunggah ke Cloudflare R2.
      </div>
    </div>
  );
}
