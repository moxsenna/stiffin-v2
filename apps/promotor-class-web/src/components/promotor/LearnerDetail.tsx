'use client';

import React from 'react';
import { Contact, Enrollment, Program, LearningSignal } from '@promotor/contracts';
import { formatPhoneDisplay } from '@promotor/platform-core';

interface LearnerDetailProps {
  contact: Contact;
  enrollment?: Enrollment;
  program?: Program;
  signal?: LearningSignal;
  onOpenWhatsAppDraft: (contact: Contact, message: string) => void;
  onClose?: () => void;
}

export function LearnerDetail({
  contact,
  enrollment,
  program,
  signal,
  onOpenWhatsAppDraft,
  onClose,
}: LearnerDetailProps) {
  const signalLevel = signal?.signalLevel || 'Minat sedang';
  const primaryReason = signal?.primaryReason || 'Memulai pembelajaran';
  const rawQuote = signal?.rawReflectionQuote;

  const isHigh = signalLevel === 'Minat tinggi';
  const isMedium = signalLevel === 'Minat sedang';

  const programTitle = program?.title || 'Program Belajar';
  const defaultDraftMessage = `Halo ${contact.name}, salam dari Promotor STIFIn untuk materi "${programTitle}". Saya memperhatikan Anda telah ${primaryReason.toLowerCase()}. Bagaimana perkembangan belajar Anda saat ini?`;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 850, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
            {contact.name}
          </h2>
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {formatPhoneDisplay(contact.phoneE164)}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Tutup panel"
            className="touch-target"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-divider)',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Status & Reason Card */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--border-radius-md)',
          backgroundColor: isHigh ? 'var(--color-status-success-bg)' : isMedium ? 'var(--color-status-warning-bg)' : 'var(--color-canvas)',
          border: isHigh ? '1px solid var(--color-status-success-border)' : isMedium ? '1px solid var(--color-status-warning-border)' : '1px solid var(--color-divider)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 780,
              color: isHigh ? 'var(--color-status-success)' : isMedium ? 'var(--color-status-warning)' : 'var(--color-text-muted)',
              padding: '2px 8px',
              borderRadius: 'var(--border-radius-xs)',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-divider)',
            }}
          >
            {signalLevel}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {primaryReason}
          </span>
        </div>
        {signal?.intentScore !== undefined && (
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px' }} className="tabular-nums">
            Skor Intent: {signal.intentScore}/100
          </div>
        )}
      </div>

      {/* Raw Quote Snippet if available */}
      {rawQuote && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--border-radius-sm)',
            backgroundColor: 'var(--color-canvas)',
            border: '1px solid var(--color-divider)',
            fontSize: '13px',
            fontStyle: 'italic',
            color: 'var(--color-text-body)',
            lineHeight: 1.55,
          }}
        >
          &ldquo;{rawQuote}&rdquo;
        </div>
      )}

      {/* Enrollment Progress */}
      {enrollment && (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--border-radius-md)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>Progres Pembelajaran</span>
            <span className="tabular-nums" style={{ color: 'var(--color-primary)', fontWeight: 800 }}>
              {enrollment.progressPercent}%
            </span>
          </div>

          <div
            style={{
              height: '7px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-canvas)',
              border: '1px solid var(--color-divider)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${enrollment.progressPercent}%`,
                backgroundColor: 'var(--color-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Program: <strong>{program?.title || 'Program Belajar'}</strong>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => onOpenWhatsAppDraft(contact, defaultDraftMessage)}
        className="touch-target-primary"
        style={{
          width: '100%',
          backgroundColor: 'var(--color-primary)',
          color: '#FFFFFF',
          fontWeight: 780,
          fontSize: '14px',
          borderRadius: 'var(--border-radius-md)',
          marginTop: 'auto',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        Buat Draf Pesan WhatsApp
      </button>
    </div>
  );
}
