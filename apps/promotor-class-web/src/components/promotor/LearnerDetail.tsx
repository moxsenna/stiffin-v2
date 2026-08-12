'use client';

import React, { useState } from 'react';
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
  const minatStatus = signal?.minatStatus || 'Minat sedang';
  const primaryReason = signal?.primaryReason || 'Memulai pembelajaran';
  const rawQuote = signal?.rawQuoteSnippet;

  const getMinatStyle = (status: string) => {
    switch (status) {
      case 'Minat tinggi':
        return { bg: 'var(--color-status-success-bg)', text: 'var(--color-status-success)' };
      case 'Minat sedang':
        return { bg: 'var(--color-status-warning-bg)', text: 'var(--color-status-warning)' };
      default:
        return { bg: '#F0F0ED', text: 'var(--color-text-muted)' };
    }
  };

  const minatStyle = getMinatStyle(minatStatus);

  const defaultDraftMessage = `Halo ${contact.name}, saya Rina dari STIFIn Parenting. Saya memperhatikan Anda telah ${primaryReason.toLowerCase()} di program "${program?.title || 'Parenting'}". Bagaimana perkembangan pendampingan anak di rumah saat ini?`;

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {contact.name}
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {formatPhoneDisplay(contact.phone)} {contact.email ? `· ${contact.email}` : ''}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="touch-target"
            style={{ padding: '4px 8px', fontSize: '14px', color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Status & Reason Card */}
      <div
        style={{
          padding: '14px',
          borderRadius: 'var(--border-radius-md)',
          backgroundColor: minatStyle.bg,
          border: '1px solid var(--color-divider)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: minatStyle.text,
              padding: '2px 8px',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: '#FFF',
            }}
          >
            {minatStatus}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)' }}>
            Alasan: {primaryReason}
          </span>
        </div>
        {signal?.intentScoreNumeric && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }} className="tabular-nums">
            Score indikator lanjutan: {signal.intentScoreNumeric}/100
          </div>
        )}
      </div>

      {/* Raw Quote Snippet if available */}
      {rawQuote && (
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--border-radius-sm)',
            backgroundColor: 'var(--color-canvas)',
            borderLeft: '3px solid var(--color-primary)',
            fontSize: '13px',
            fontStyle: 'italic',
            color: 'var(--color-text-main)',
          }}
        >
          &ldquo;{rawQuote}&rdquo;
        </div>
      )}

      {/* Enrollment Progress */}
      {enrollment && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ fontWeight: 600 }}>Progres Pembelajaran</span>
            <span className="tabular-nums" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              {enrollment.progressPercent}%
            </span>
          </div>

          <div
            style={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-divider)',
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
            Program: {program?.title || 'Program Belajar'}
          </div>
        </div>
      )}

      {/* Notes / Context */}
      {contact.notes && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <strong>Catatan Promotor:</strong> {contact.notes}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => onOpenWhatsAppDraft(contact, defaultDraftMessage)}
        className="touch-target-primary"
        style={{
          width: '100%',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-text-inverse)',
          fontWeight: 600,
          borderRadius: 'var(--border-radius-md)',
          marginTop: '10px',
        }}
      >
        Buat Draf WhatsApp
      </button>
    </div>
  );
}
