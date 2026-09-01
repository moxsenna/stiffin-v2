'use client';

import React, { useState, useRef } from 'react';
import {
  presignCoverUploadCommand,
  confirmCoverUploadCommand,
  directUploadToR2,
  deleteCoverImageCommand,
} from '@/modules/programs/commands';

export interface ImageUploadProps {
  programId?: string;
  currentImageUrl?: string;
  onUploaded: (info: { publicUrl: string; key: string }) => void;
  onRemoved?: () => void;
  disabled?: boolean;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB strict
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageUpload({
  programId,
  currentImageUrl,
  onUploaded,
  onRemoved,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    setErrorMsg(null);

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setErrorMsg('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.');
      return;
    }

    if (file.size > MAX_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(`Ukuran file (${sizeMb} MB) melebihi batas maksimal 2 MB.`);
      return;
    }

    // Local instant preview
    const localBlobUrl = URL.createObjectURL(file);
    setPreviewUrl(localBlobUrl);
    setUploading(true);
    setProgress(15);

    try {
      // 1. Dapatkan presigned PUT URL dari API
      const presign = await presignCoverUploadCommand({
        programId,
        fileName: file.name,
        contentType: file.type.toLowerCase(),
        contentLength: file.size,
      });

      setProgress(40);

      // 2. Direct upload PUT ke Cloudflare R2
      await directUploadToR2(presign.uploadUrl, file, file.type.toLowerCase());
      setProgress(85);

      // 3. Jika sudah ada programId yang tersimpan, confirm ke backend
      let finalPublicUrl = presign.publicUrl;
      let finalKey = presign.key;

      if (programId) {
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

    if (programId) {
      try {
        await deleteCoverImageCommand(programId);
      } catch (err: any) {
        console.warn('[ImageUpload] Delete error:', err);
      }
    }

    if (onRemoved) onRemoved();
  };

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
              width: '100%',
              aspectRatio: '16/9',
              backgroundColor: '#0F172A',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Cover program preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {uploading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  gap: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700 }}>Mengunggah langsung ke R2... ({progress}%)</div>
                <div style={{ width: '80%', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent)' }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
              Cover aktif · Public R2 Storage
            </span>
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
              Klik atau seret gambar ke sini untuk upload cover
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              Maksimal 2 MB · Format JPG, PNG, atau WebP
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
        Keterangan: Maksimal ukuran upload <strong>2 MB</strong>. Gambar akan disimpan secara publik di Cloudflare R2 untuk ditampilkan di Storefront & Katalog Program.
      </div>
    </div>
  );
}
