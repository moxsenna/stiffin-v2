'use client';

import React, { useState } from 'react';
import { Contact } from '@promotor/contracts';

interface WhatsAppDraftSheetProps {
  contact: Contact | null;
  initialMessage?: string;
  onClose: () => void;
}

export function WhatsAppDraftSheet({
  contact,
  initialMessage = '',
  onClose,
}: WhatsAppDraftSheetProps) {
  const [message, setMessage] = useState(
    initialMessage || (contact ? `Halo ${contact.name}, salam dari Promotor STIFIn.` : '')
  );

  if (!contact) return null;

  const cleanPhone = contact.phoneE164.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <>
      <div className="sheet-overlay active" onClick={onClose} />
      <div className="bottom-sheet active">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
            Draf Pesan WhatsApp
          </h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
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
        </div>

        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          Penerima: <strong style={{ color: 'var(--color-text-main)' }}>{contact.name}</strong> ({contact.phoneE164})
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--color-divider)',
            fontSize: '13.5px',
            lineHeight: 1.5,
            resize: 'vertical',
            marginBottom: '18px',
            outline: 'none',
            backgroundColor: 'var(--color-surface)',
          }}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            className="touch-target-primary"
            style={{
              flex: 1,
              border: '1px solid var(--color-divider)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 700,
              fontSize: '13.5px',
              color: 'var(--color-text-body)',
            }}
          >
            Batal
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-target-primary"
            style={{
              flex: 2,
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 780,
              fontSize: '14px',
              textAlign: 'center',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.056-1.528-.276-1.157-.428-2.023-1.428-2.614-2.228-.06-.081-.462-.614-.462-1.17 0-.555.289-.828.391-.938.102-.11.222-.138.297-.138.074 0 .148.002.212.006.069.004.16.027.247.234.089.213.308.751.336.806.028.055.046.12.009.193-.036.073-.056.12-.11.184-.056.064-.117.142-.167.193-.056.055-.114.116-.049.227.065.111.288.475.617.768.424.377.781.493.892.548.111.055.176.046.241-.028.065-.074.278-.324.352-.435.074-.111.148-.093.247-.056.1.037.63.297.738.351.108.055.18.083.207.129.028.046.028.67-.116 1.075z" />
            </svg>
            Buka di WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
